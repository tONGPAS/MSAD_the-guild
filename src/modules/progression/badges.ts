import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import type { DB } from "@/db";
import { quests, reviews, userBadges, users } from "@/db/schema";
import { HELPFUL_BADGE_COUNT, STREAK_BADGE_WEEKS } from "@/lib/rules";
import { notify } from "@/modules/notifications/service";

//BRL-06: the five badges
export const BADGES = {
  FIRST_QUEST: { label: "First Quest", how: "Submit your first quest" },
  FIRST_REVIEW: { label: "First Review", how: "Finish your first review" },
  STREAK_3: { label: "Three-Week Streak", how: `Reach a ${STREAK_BADGE_WEEKS}-week review streak` },
  HELPFUL_10: { label: "Ten Helpful Reviews", how: `Get ${HELPFUL_BADGE_COUNT} reviews rated helpful` },
  RANK_MASTER: { label: "Rank Master", how: "Reach the Master rank" },
} as const;
export type BadgeCode = keyof typeof BADGES;
export const BADGE_ORDER = Object.keys(BADGES) as BadgeCode[];

//FR-30: checks every badge for one Student and awards the ones newly earned.
//Safe to run any number of times: the (user, badge) key makes each award happen once.
export async function checkBadges(tx: DB, userId: string) {
  const [u] = await tx.select({ role: users.role, streak: users.streak, rank: users.rank }).from(users).where(eq(users.id, userId));
  if (!u || u.role !== "STUDENT") return;

  const [[q], [r], [h]] = await Promise.all([
    tx.select({ n: count() }).from(quests).where(eq(quests.submitterId, userId)),
    tx.select({ n: count() }).from(reviews).where(and(eq(reviews.reviewerId, userId), eq(reviews.isMentor, false))),
    tx.select({ n: count() }).from(reviews).where(and(eq(reviews.reviewerId, userId), eq(reviews.helpful, true))),
  ]);

  const earned: BadgeCode[] = [];
  if (q.n >= 1) earned.push("FIRST_QUEST");
  if (r.n >= 1) earned.push("FIRST_REVIEW");
  if (u.streak >= STREAK_BADGE_WEEKS) earned.push("STREAK_3");
  if (h.n >= HELPFUL_BADGE_COUNT) earned.push("HELPFUL_10");
  if (u.rank === "MASTER") earned.push("RANK_MASTER");
  if (earned.length === 0) return;

  const added = await tx
    .insert(userBadges)
    .values(earned.map((badgeCode) => ({ userId, badgeCode })))
    .onConflictDoNothing()
    .returning({ code: userBadges.badgeCode });
  for (const a of added) {
    await notify(tx, userId, `Badge earned: ${BADGES[a.code as BadgeCode].label}`);
  }
}

//Badges earned by the action that just happened, for its reward card. The window is short
//so a badge from an earlier action never shows up again on the next one.
export async function justEarnedBadges(tx: DB, userId: string) {
  const rows = await tx
    .select({ code: userBadges.badgeCode })
    .from(userBadges)
    .where(and(eq(userBadges.userId, userId), gte(userBadges.awardedAt, new Date(Date.now() - 20_000))));
  return rows.map((r) => BADGES[r.code as BadgeCode]?.label).filter(Boolean) as string[];
}
