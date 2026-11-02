import "server-only";
import { and, count, eq, gte, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { reassignments, reviews, users } from "@/db/schema";
import { manilaDateKey, manilaWeekStart } from "@/lib/rules";
import { checkBadges } from "./badges";

//FR-29, BRL-06: runs inside the daily job but acts once per Manila week (Monday).
//For last week: a missed review (one taken away, FR-15 or FR-34) resets the streak to 0;
//otherwise at least one finished review adds 1; a week with nothing assigned leaves it as is.
export async function evaluateStreaks(now = Date.now()) {
  const thisWeek = manilaWeekStart(now);
  const lastWeek = new Date(thisWeek.getTime() - 7 * 86_400_000);
  const weekKey = manilaDateKey(thisWeek);

  const due = await db
    .select({ id: users.id, streak: users.streak })
    .from(users)
    .where(
      and(
        eq(users.role, "STUDENT"),
        eq(users.status, "ACTIVE"),
        isNotNull(users.consentAt),
        or(isNull(users.streakWeek), lt(users.streakWeek, weekKey)),
      ),
    );

  for (const u of due) {
    await db.transaction(async (tx) => {
      const [[done], [missed]] = await Promise.all([
        tx
          .select({ n: count() })
          .from(reviews)
          .where(and(eq(reviews.reviewerId, u.id), eq(reviews.isMentor, false), gte(reviews.createdAt, lastWeek), lt(reviews.createdAt, thisWeek))),
        tx
          .select({ n: count() })
          .from(reassignments)
          .where(and(eq(reassignments.fromReviewer, u.id), gte(reassignments.createdAt, lastWeek), lt(reassignments.createdAt, thisWeek))),
      ]);
      const streak = missed.n > 0 ? 0 : done.n > 0 ? u.streak + 1 : u.streak;
      //Guarded on streak_week, so a second run in the same week changes nothing (NFR-09)
      await tx
        .update(users)
        .set({ streak, streakWeek: weekKey })
        .where(and(eq(users.id, u.id), or(isNull(users.streakWeek), lt(users.streakWeek, weekKey))));
      await checkBadges(tx, u.id);
    });
  }
  return due.length;
}
