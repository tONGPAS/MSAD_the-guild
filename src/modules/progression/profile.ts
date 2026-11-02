import "server-only";
import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { quests, reviews, userBadges, users, xpEvents } from "@/db/schema";

//The directory is sorted by name on purpose: leaderboards are out of scope (SRS 1.4)
export async function guildMembers() {
  const badgeCount = db
    .select({ userId: userBadges.userId, n: count().as("n") })
    .from(userBadges)
    .groupBy(userBadges.userId)
    .as("b");
  return db
    .select({
      id: users.id,
      name: users.name,
      xpTotal: users.xpTotal,
      rank: users.rank,
      streak: users.streak,
      badges: sql<number>`coalesce(${badgeCount.n}, 0)::int`,
    })
    .from(users)
    .leftJoin(badgeCount, eq(badgeCount.userId, users.id))
    .where(and(eq(users.role, "STUDENT"), eq(users.status, "ACTIVE"), isNotNull(users.consentAt)))
    .orderBy(asc(users.name));
}

//FR-31: rank, XP, streak, badges, review history, helpfulness. No code or review text (BRL-10).
export async function guildProfile(userId: string) {
  const [u] = await db
    .select({ id: users.id, name: users.name, role: users.role, status: users.status, xpTotal: users.xpTotal, rank: users.rank, streak: users.streak })
    .from(users)
    .where(eq(users.id, userId));
  if (!u || u.role !== "STUDENT") return null;

  const [badges, history, [submitted], [rated]] = await Promise.all([
    db.select({ code: userBadges.badgeCode, awardedAt: userBadges.awardedAt }).from(userBadges).where(eq(userBadges.userId, userId)),
    db
      .select({
        reviewId: reviews.id,
        createdAt: reviews.createdAt,
        helpful: reviews.helpful,
        refNo: quests.refNo,
        title: quests.title,
        difficulty: quests.difficulty,
        submitterId: quests.submitterId,
      })
      .from(reviews)
      .innerJoin(quests, eq(quests.id, reviews.questId))
      .where(and(eq(reviews.reviewerId, userId), eq(reviews.isMentor, false)))
      .orderBy(desc(reviews.createdAt))
      .limit(50),
    db.select({ n: count() }).from(quests).where(eq(quests.submitterId, userId)),
    db
      .select({ total: count(), rated: count(reviews.helpful), helpful: sql<number>`count(*) filter (where ${reviews.helpful})::int` })
      .from(reviews)
      .where(and(eq(reviews.reviewerId, userId), eq(reviews.isMentor, false))),
  ]);

  return { user: u, badges, history, questsSubmitted: submitted.n, reviewsDone: rated.total, rated: rated.rated, helpful: rated.helpful };
}

export async function recentXp(userId: string, limit = 20) {
  return db.select().from(xpEvents).where(eq(xpEvents.userId, userId)).orderBy(desc(xpEvents.createdAt)).limit(limit);
}

//Faculty, shown above the students in the Guild Hall
export async function guildMasters() {
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.role, "FACULTY"), eq(users.status, "ACTIVE"), isNotNull(users.consentAt)))
    .orderBy(asc(users.name));
}
