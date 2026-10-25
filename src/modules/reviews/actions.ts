"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { comments, quests, reviews } from "@/db/schema";
import { FAST_RESOLVE_HOURS, formatRef, LIMITS } from "@/lib/rules";
import { requireUser } from "@/modules/auth/session";
import { notify } from "@/modules/notifications/service";
import { awardXp } from "@/modules/progression/service";
import { transition } from "@/modules/quests/service";

export type ReviewFormState = { missing?: string[]; error?: string };

const score = z.coerce.number().int().min(1).max(5);

//FR-18 to FR-21, BRL-07: lists every missing item instead of stopping at the first
function checkReview(raw: unknown) {
  const missing: string[] = [];
  const v = (raw ?? {}) as Record<string, unknown>;
  const scores = {} as Record<"readability" | "correctness" | "structure", number>;
  for (const k of ["readability", "correctness", "structure"] as const) {
    const r = score.safeParse(v[k]);
    if (r.success) scores[k] = r.data;
    else missing.push(`A ${k} score from 1 to 5`);
  }
  const list = Array.isArray(v.comments) ? v.comments : [];
  const cleaned = list
    .map((c) => ({ kind: String((c as { kind?: unknown }).kind), body: String((c as { body?: unknown }).body ?? "").trim() }))
    .filter((c) => (c.kind === "ISSUE" || c.kind === "PRAISE") && c.body.length > 0)
    .map((c) => ({ kind: c.kind as "ISSUE" | "PRAISE", body: c.body.slice(0, LIMITS.comment) }));
  if (cleaned.length === 0) missing.push("At least one Issue or Praise comment");
  return { missing, scores, comments: cleaned };
}

export async function submitReview(questId: string, _: ReviewFormState, form: FormData): Promise<ReviewFormState> {
  const user = await requireUser({ role: "STUDENT" });
  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    payload = {};
  }
  const { missing, scores, comments: list } = checkReview(payload);
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
  const now = new Date();
  await db.transaction(async (tx) => {
    const moved = await transition(tx, questId, "COMPLETED", "RESOLVED", user.id, { resolvedAt: now });
    if (!moved) return;
    const fast = q.completedAt && now.getTime() - q.completedAt.getTime() <= FAST_RESOLVE_HOURS * 3_600_000;
    if (fast) await awardXp(tx, user.id, "RESOLVE_FAST", questId);
    if (q.reviewerId) await notify(tx, q.reviewerId, `${formatRef(q.refNo)} was marked Resolved. Nice work.`, questId);
  });
  revalidatePath(`/quests/${q.refNo}`);
}
