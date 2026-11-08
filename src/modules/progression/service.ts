import "server-only";
import { and, count, eq, gte, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { users, xpEvents } from "@/db/schema";
import { manilaDayStart, rankFor, XP, type XpAction } from "@/lib/rules";
import { checkBadges } from "./badges";
import { checkChallenges } from "@/modules/challenges/service";

//FR-27, FR-28: one XP event per (user, action, thing) so retries never double-pay
export async function awardXp(tx: DB, userId: string, action: XpAction, refId: string, amount?: number) {
  const points = amount ?? (action === "CHALLENGE" ? 0 : XP[action]);
  if (points <= 0) return;
  const inserted = await tx
    .insert(xpEvents)
    .values({ userId, action, points, refId })
    .onConflictDoNothing()
    .returning({ id: xpEvents.id });
  if (inserted.length === 0) return;

  const [u] = await tx
    .update(users)
    .set({ xpTotal: sql`${users.xpTotal} + ${points}` })
    .where(eq(users.id, userId))
    .returning({ xp: users.xpTotal, rank: users.rank });
  const newRank = rankFor(u.xp);
  if (newRank !== u.rank) await tx.update(users).set({ rank: newRank }).where(eq(users.id, userId));
  //Every XP-paying event (quest, review, helpful rating, rank-up) can also complete a badge
  await checkBadges(tx, userId);
  //A challenge reward never triggers another challenge check, so payouts cannot chain
  if (action !== "CHALLENGE") await checkChallenges(tx, userId);
}

//How many of today's (Manila time) quest submissions already paid XP
export async function submissionsPaidToday(tx: DB, userId: string) {
  const [r] = await tx
    .select({ n: count() })
    .from(xpEvents)
    .where(and(eq(xpEvents.userId, userId), eq(xpEvents.action, "SUBMIT_QUEST"), gte(xpEvents.createdAt, manilaDayStart())));
  return r?.n ?? 0;
}
