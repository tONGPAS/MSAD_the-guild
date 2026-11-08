import "server-only";
import { and, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { db, type DB } from "@/db";
import { challengeEntries, challenges, quests } from "@/db/schema";
import { notify } from "@/modules/notifications/service";
import { awardXp } from "@/modules/progression/service";
import type { Metric } from "./templates";

export type Challenge = typeof challenges.$inferSelect;

//Word count the same way the review form counts it
const WORDS = sql.raw(`coalesce(array_length(regexp_split_to_array(btrim(c.body), '\\s+'), 1), 0)`);

//How far every student has got on one goal inside its window: userId -> count.
//Everything is counted from records the app already keeps, so a goal can never disagree with history.
export async function metricByUser(tx: DB, metric: Metric, from: Date, to: Date) {
  const f = from.toISOString();
  const t = to.toISOString();
  const xpAction = { REVIEWS: "COMPLETE_REVIEW", FAST_RESOLVES: "RESOLVE_FAST", HELPFUL: "HELPFUL_RATING", COINS: "COIN" } as const;
  let rows: { user_id: string; n: number }[];
  if (metric in xpAction) {
    rows = await tx.execute(sql`
      select user_id, count(*)::int as n from xp_events
      where action = ${xpAction[metric as keyof typeof xpAction]} and created_at >= ${f}::timestamptz and created_at < ${t}::timestamptz
      group by user_id`) as unknown as typeof rows;
  } else if (metric === "PRAISE") {
    rows = await tx.execute(sql`
      select c.author_id as user_id, count(*)::int as n from comments c join users u on u.id = c.author_id
      where c.kind = 'PRAISE' and u.role = 'STUDENT' and c.created_at >= ${f}::timestamptz and c.created_at < ${t}::timestamptz
      group by c.author_id`) as unknown as typeof rows;
  } else {
    rows = await tx.execute(sql`
      select r.reviewer_id as user_id, count(*)::int as n from reviews r
      where not r.is_mentor and r.created_at >= ${f}::timestamptz and r.created_at < ${t}::timestamptz
        and (select coalesce(sum(${WORDS}), 0) from comments c where c.review_id = r.id and c.kind <> 'REPLY') >= 50
      group by r.reviewer_id`) as unknown as typeof rows;
  }
  return new Map(rows.map((r) => [r.user_id, Number(r.n)]));
}

const activeGoals = (tx: DB, now: Date) =>
  tx.select().from(challenges).where(and(eq(challenges.kind, "GOAL"), lte(challenges.startsAt, now), gt(challenges.endsAt, now)));

//Marks a challenge done for one student and pays them once. Returns true if this call did it.
async function complete(tx: DB, ch: Challenge, userId: string) {
  const done = await tx
    .insert(challengeEntries)
    .values({ challengeId: ch.id, userId, completedAt: new Date() })
    .onConflictDoNothing()
    .returning({ id: challengeEntries.id });
  if (done.length === 0) return false;
  await awardXp(tx, userId, "CHALLENGE", ch.id, ch.xpReward);
  await notify(tx, userId, `Challenge complete: ${ch.title} (+${ch.xpReward} XP)`);
  return true;
}

//Runs after every XP-paying action. Personal goals pay the student who reached them;
//a guild goal pays every student who contributed, once, the moment the shared total is reached.
export async function checkChallenges(tx: DB, userId: string) {
  const now = new Date();
  for (const ch of await activeGoals(tx, now)) {
    if (!ch.metric || !ch.target) continue;
    const counts = await metricByUser(tx, ch.metric, ch.startsAt, ch.endsAt);
    if (ch.scope === "PERSONAL") {
      if ((counts.get(userId) ?? 0) >= ch.target) await complete(tx, ch, userId);
      continue;
    }
    if (ch.rewardedAt) continue;
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    if (total < ch.target) continue;
    const claimed = await tx
      .update(challenges)
      .set({ rewardedAt: now })
      .where(and(eq(challenges.id, ch.id), isNull(challenges.rewardedAt)))
      .returning({ id: challenges.id });
    if (claimed.length === 0) continue;
    for (const [uid, n] of counts) if (n > 0) await complete(tx, ch, uid);
  }
}

//Coding challenge: the answer counts once a classmate has reviewed it, so the reward
//still comes from person-to-person feedback, not from just uploading code
export async function completeCodingEntry(tx: DB, questId: string) {
  const [q] = await tx.select({ challengeId: quests.challengeId, submitterId: quests.submitterId }).from(quests).where(eq(quests.id, questId));
  if (!q?.challengeId) return;
  const [ch] = await tx.select().from(challenges).where(eq(challenges.id, q.challengeId));
  if (!ch) return;
  const done = await tx
    .update(challengeEntries)
    .set({ completedAt: new Date() })
    .where(and(eq(challengeEntries.challengeId, ch.id), eq(challengeEntries.userId, q.submitterId), isNull(challengeEntries.completedAt)))
    .returning({ id: challengeEntries.id });
  if (done.length === 0) return;
  await awardXp(tx, q.submitterId, "CHALLENGE", ch.id, ch.xpReward);
  await notify(tx, q.submitterId, `Challenge complete: ${ch.title} (+${ch.xpReward} XP)`, questId);
}

export type ChallengeView = Challenge & {
  state: "upcoming" | "active" | "ended";
  mine: number;
  guildTotal: number;
  entry: { completedAt: Date | null; questId: string | null } | null;
  entries: number;
  msLeft: number;
};

//Everything the challenge screens need for one viewer
export async function challengeViews(userId: string | null, opts: { includeEnded?: boolean } = {}) {
  const now = new Date();
  const list = await db.select().from(challenges).orderBy(challenges.endsAt);
  const mine = userId ? await db.select().from(challengeEntries).where(eq(challengeEntries.userId, userId)) : [];
  const counts = await db.execute(sql`select challenge_id, count(*)::int as n from challenge_entries group by challenge_id`) as unknown as { challenge_id: string; n: number }[];
  const entryCount = new Map(counts.map((c) => [c.challenge_id, Number(c.n)]));
  const out: ChallengeView[] = [];
  for (const ch of list) {
    const state = now < ch.startsAt ? "upcoming" : now >= ch.endsAt ? "ended" : "active";
    if (state === "ended" && !opts.includeEnded) continue;
    let m = 0;
    let g = 0;
    if (ch.kind === "GOAL" && ch.metric) {
      const by = await metricByUser(db, ch.metric, ch.startsAt, ch.endsAt);
      m = userId ? by.get(userId) ?? 0 : 0;
      g = [...by.values()].reduce((a, b) => a + b, 0);
    }
    const e = mine.find((x) => x.challengeId === ch.id);
    out.push({ ...ch, state, mine: m, guildTotal: g, entry: e ? { completedAt: e.completedAt, questId: e.questId } : null, entries: entryCount.get(ch.id) ?? 0, msLeft: ch.endsAt.getTime() - now.getTime() });
  }
  return out;
}

export async function getChallenge(id: string, tx: DB = db) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [ch] = await tx.select().from(challenges).where(eq(challenges.id, id));
  return ch ?? null;
}

export const isActive = (ch: Challenge, now = new Date()) => ch.startsAt <= now && now < ch.endsAt;

//A student may answer a coding challenge once, while it is running
export async function canAnswerCoding(challengeId: string, userId: string, tx: DB = db) {
  const ch = await getChallenge(challengeId, tx);
  if (!ch || ch.kind !== "CODING" || !isActive(ch)) return null;
  const [e] = await tx.select({ id: challengeEntries.id }).from(challengeEntries).where(and(eq(challengeEntries.challengeId, challengeId), eq(challengeEntries.userId, userId)));
  return e ? null : ch;
}
