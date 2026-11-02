"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { comments, quests, reviews } from "@/db/schema";
import { FAST_RESOLVE_HOURS, formatRef, LIMITS } from "@/lib/rules";
import { requireUser } from "@/modules/auth/session";
import { notify } from "@/modules/notifications/service";
import { awardXp } from "@/modules/progression/service";
import { hasOpenMentorRequest } from "@/modules/mentor/service";
import { transition } from "@/modules/quests/service";

import { checkReview, readPayload, type ReviewFormState } from "./rubric";

export async function submitReview(questId: string, _: ReviewFormState, form: FormData): Promise<ReviewFormState> {
  const user = await requireUser({ role: "STUDENT" });
  const { missing, scores, comments: list } = checkReview(readPayload(form));
  if (missing.length) return { missing };

  const result = await db.transaction(async (tx) => {
    const [q] = await tx.select().from(quests).where(eq(quests.id, questId)).for("update").limit(1);
    if (!q || q.reviewerId !== user.id) return { error: "This quest is not assigned to you anymore." };
    if (q.status !== "IN_REVIEW") return { error: "This quest is no longer waiting for a review." };

    const [rev] = await tx
      .insert(reviews)
      .values({ questId, reviewerId: user.id, ...scores })
      .returning({ id: reviews.id });
    await tx.insert(comments).values(list.map((c) => ({ reviewId: rev.id, authorId: user.id, ...c })));
    await transition(tx, questId, "IN_REVIEW", "COMPLETED", user.id, { completedAt: new Date() });
    await awardXp(tx, user.id, "COMPLETE_REVIEW", questId);
    await notify(tx, q.submitterId, `Your quest ${formatRef(q.refNo)} has been reviewed.`, questId);
    return { refNo: q.refNo };
  });

  if ("error" in result) return { error: result.error };
  revalidatePath("/", "layout");
  redirect(`/quests/${result.refNo}?reviewed=1`);
}

//Shared guard: only the submitter acts on their own reviewed quest
async function loadOwnQuest(questId: string, userId: string) {
  const [q] = await db.select().from(quests).where(eq(quests.id, questId)).limit(1);
  if (!q || q.submitterId !== userId) return null;
  return q;
}

//FR-23
export async function replyToIssue(questId: string, commentId: string, form: FormData) {
  const user = await requireUser({ role: "STUDENT" });
  const body = String(form.get("body") ?? "").trim().slice(0, LIMITS.comment);
  if (!body) return;
  const q = await loadOwnQuest(questId, user.id);
  if (!q || (q.status !== "COMPLETED" && q.status !== "RESOLVED")) return;

  const [parent] = await db
    .select({ id: comments.id, reviewId: comments.reviewId, kind: comments.kind, reviewerId: reviews.reviewerId })
    .from(comments)
    .innerJoin(reviews, eq(reviews.id, comments.reviewId))
    .where(and(eq(comments.id, commentId), eq(reviews.questId, questId)))
    .limit(1);
  if (!parent || parent.kind !== "ISSUE") return;

  await db.transaction(async (tx) => {
    await tx.insert(comments).values({ reviewId: parent.reviewId, authorId: user.id, kind: "REPLY", body, parentId: parent.id });
    await notify(tx, parent.reviewerId, `${user.name} replied to your feedback on ${formatRef(q.refNo)}.`, questId);
  });
  revalidatePath(`/quests/${q.refNo}`);
}

//FR-24: one rating per review, and a helpful rating pays the reviewer
export async function rateReview(questId: string, reviewId: string, helpful: boolean) {
  const user = await requireUser({ role: "STUDENT" });
  const q = await loadOwnQuest(questId, user.id);
  if (!q) return;
  await db.transaction(async (tx) => {
    const [rev] = await tx
      .update(reviews)
      .set({ helpful })
      .where(and(eq(reviews.id, reviewId), eq(reviews.questId, questId), isNull(reviews.helpful)))
      .returning({ reviewerId: reviews.reviewerId, isMentor: reviews.isMentor });
    if (rev && helpful && !rev.isMentor) await awardXp(tx, rev.reviewerId, "HELPFUL_RATING", reviewId);
  });
  revalidatePath(`/quests/${q.refNo}`);
}

//FR-25, BRL-04: only the submitter closes the quest
export async function resolveQuest(questId: string) {
  const user = await requireUser({ role: "STUDENT" });
  const q = await loadOwnQuest(questId, user.id);
  if (!q || q.status !== "COMPLETED") return;
  if (await hasOpenMentorRequest(q.id)) return;
  const now = new Date();
  const outcome = await db.transaction(async (tx) => {
    const moved = await transition(tx, questId, "COMPLETED", "RESOLVED", user.id, { resolvedAt: now });
    if (!moved) return null;
    const fast = !!q.completedAt && now.getTime() - q.completedAt.getTime() <= FAST_RESOLVE_HOURS * 3_600_000;
    if (fast) await awardXp(tx, user.id, "RESOLVE_FAST", questId);
    if (q.reviewerId) await notify(tx, q.reviewerId, `${formatRef(q.refNo)} was marked Resolved. Nice work.`, questId);
    return fast ? "fast" : "1";
  });
  if (!outcome) {
    revalidatePath(`/quests/${q.refNo}`);
    return;
  }
  revalidatePath("/", "layout");
  redirect(`/quests/${q.refNo}?resolved=${outcome}`);
}
