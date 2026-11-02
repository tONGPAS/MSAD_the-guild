"use server";

import { and, eq, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { comments, mentorRequests, quests, reviews, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { formatRef, LIMITS } from "@/lib/rules";
import { requireUser } from "@/modules/auth/session";
import { notify } from "@/modules/notifications/service";
import { transition } from "@/modules/quests/service";
import { checkReview, readPayload, type ReviewFormState } from "@/modules/reviews/rubric";

export type MentorFormState = { error?: string };

//FR-35, FR-36, BRL-03: only the submitter, only while the quest is In Review or Completed
export async function requestMentor(questId: string, _: MentorFormState, form: FormData): Promise<MentorFormState> {
  const user = await requireUser({ role: "STUDENT" });
  const reason = String(form.get("reason") ?? "").trim();
  if (!reason) return { error: "Say what you want a faculty member to look at." };
  if (reason.length > LIMITS.reason) return { error: "Keep the reason under 500 characters." };

  const result = await db.transaction(async (tx) => {
    const [q] = await tx.select().from(quests).where(eq(quests.id, questId)).for("update").limit(1);
    if (!q || q.submitterId !== user.id) return { error: "Only the student who submitted this quest can ask for a mentor." };
    if (q.status !== "IN_REVIEW" && q.status !== "COMPLETED") {
      return { error: "Mentor reviews are for quests that are In Review or Completed." };
    }
    const inserted = await tx
      .insert(mentorRequests)
      .values({ questId, reason })
      .onConflictDoNothing()
      .returning({ id: mentorRequests.id });
    if (inserted.length === 0) return { error: "This quest already has an open mentor request." };

    const faculty = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "FACULTY"), eq(users.status, "ACTIVE"), isNotNull(users.consentAt)));
    for (const f of faculty) {
      await notify(tx, f.id, `Mentor review requested for ${formatRef(q.refNo)} "${q.title}"`, q.id);
    }
    await audit(tx, user.id, "MENTOR_REQUEST", `quest:${q.id}`);
    return { refNo: q.refNo };
  });

  if ("error" in result) return { error: result.error };
  revalidatePath(`/quests/${result.refNo}`);
  return {};
}

//FR-38: the first Faculty member to pick it up gets it; everyone else sees it gone
export async function pickUpRequest(requestId: string) {
  const faculty = await requireUser({ role: "FACULTY" });
  const taken = await db
    .update(mentorRequests)
    .set({ status: "IN_PROGRESS", handledBy: faculty.id })
    .where(and(eq(mentorRequests.id, requestId), eq(mentorRequests.status, "PENDING")))
    .returning({ id: mentorRequests.id });
  if (taken.length === 0) {
    revalidatePath("/faculty/mentor");
    redirect("/faculty/mentor?taken=1");
  }
  await audit(db, faculty.id, "MENTOR_PICKUP", `mentor:${requestId}`);
  redirect(`/faculty/mentor/${requestId}`);
}

//FR-39, FR-40: same rubric as a peer review; saving it resolves the request and completes the quest
export async function submitMentorReview(requestId: string, _: ReviewFormState, form: FormData): Promise<ReviewFormState> {
  const faculty = await requireUser({ role: "FACULTY" });
  const { missing, scores, comments: list } = checkReview(readPayload(form));
  if (missing.length) return { missing };

  const result = await db.transaction(async (tx) => {
    const [mr] = await tx.select().from(mentorRequests).where(eq(mentorRequests.id, requestId)).for("update").limit(1);
    if (!mr || mr.handledBy !== faculty.id || mr.status !== "IN_PROGRESS") {
      return { error: "This mentor request is not open for you anymore." };
    }
    const [q] = await tx.select().from(quests).where(eq(quests.id, mr.questId)).for("update").limit(1);
    if (!q || (q.status !== "IN_REVIEW" && q.status !== "COMPLETED")) {
      return { error: "This quest can no longer take a mentor review." };
    }

    const [rev] = await tx
      .insert(reviews)
      .values({ questId: q.id, reviewerId: faculty.id, isMentor: true, ...scores })
      .returning({ id: reviews.id });
    await tx.insert(comments).values(list.map((c) => ({ reviewId: rev.id, authorId: faculty.id, ...c })));

    if (q.status === "IN_REVIEW") {
      await transition(tx, q.id, "IN_REVIEW", "COMPLETED", faculty.id, { completedAt: new Date() });
      //The peer reviewer's turn ends here; this does not count against their streak
      if (q.reviewerId) {
        await notify(tx, q.reviewerId, `A faculty mentor reviewed ${formatRef(q.refNo)}, so your review is no longer needed.`, q.id);
      }
    }
    await tx.update(mentorRequests).set({ status: "RESOLVED", resolvedAt: new Date() }).where(eq(mentorRequests.id, mr.id));
    await notify(tx, q.submitterId, `A faculty mentor reviewed your quest ${formatRef(q.refNo)}.`, q.id);
    await audit(tx, faculty.id, "MENTOR_REVIEW", `quest:${q.id}`);
    return { refNo: q.refNo };
  });

  if ("error" in result) return { error: result.error };
  redirect(`/quests/${result.refNo}?mentored=1`);
}
