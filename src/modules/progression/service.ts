import "server-only";
import { eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { users, xpEvents } from "@/db/schema";
import { rankFor, XP, type XpAction } from "@/lib/rules";

//FR-27, FR-28: one XP event per (user, action, thing) so retries never double-pay
export async function awardXp(tx: DB, userId: string, action: XpAction, refId: string) {
  const inserted = await tx
    .insert(xpEvents)
    .values({ userId, action, points: XP[action], refId })
    .onConflictDoNothing()
    .returning({ id: xpEvents.id });
  if (inserted.length === 0) return;

  const [u] = await tx
    .update(users)
    .set({ xpTotal: sql`${users.xpTotal} + ${XP[action]}` })
    .where(eq(users.id, userId))
    .returning({ xp: users.xpTotal, rank: users.rank });
  const newRank = rankFor(u.xp);
  if (newRank !== u.rank) await tx.update(users).set({ rank: newRank }).where(eq(users.id, userId));
}
