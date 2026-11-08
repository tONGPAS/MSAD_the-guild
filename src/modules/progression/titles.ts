import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

//CR-02: titles are earned automatically from what a student does, never picked,
//so they stay achievements and not cosmetic customization (out of scope in the SRS)
export const TITLES = [
  { code: "SWIFT", label: "Swift Reviewer", how: "Finish 5 reviews within 24 hours of being assigned", need: 5 },
  { code: "KIND", label: "Kind Critic", how: "Write 10 praise comments", need: 10 },
  { code: "GOLDEN", label: "Golden Quill", how: "Receive 5 thank-you coins", need: 5 },
  { code: "DEEP", label: "Deep Thinker", how: "Write 5 reviews of 50 words or more", need: 5 },
  { code: "CHALLENGER", label: "Challenger", how: "Complete 3 challenges", need: 3 },
] as const;
export type TitleCode = (typeof TITLES)[number]["code"];

type Stats = Record<TitleCode, number>;

const WORDS = sql.raw(`coalesce(array_length(regexp_split_to_array(btrim(c.body), '\\s+'), 1), 0)`);

//Counts behind every title for a set of students in one query
export async function titleStats(userIds: string[]) {
  const out = new Map<string, Stats>();
  if (userIds.length === 0) return out;
  const ids = sql.join(userIds.map((id) => sql`${id}::uuid`), sql`, `);
  const rows = (await db.execute(sql`
    select u.id as user_id,
      (select count(*) from reviews r join quests q on q.id = r.quest_id
         where r.reviewer_id = u.id and not r.is_mentor and q.assigned_at is not null
           and r.created_at - q.assigned_at <= interval '24 hours')::int as swift,
      (select count(*) from comments c where c.author_id = u.id and c.kind = 'PRAISE')::int as kind,
      (select count(*) from xp_events x where x.user_id = u.id and x.action = 'COIN')::int as golden,
      (select count(*) from reviews r where r.reviewer_id = u.id and not r.is_mentor
         and (select coalesce(sum(${WORDS}), 0) from comments c where c.review_id = r.id and c.kind <> 'REPLY') >= 50)::int as deep,
      (select count(*) from challenge_entries e where e.user_id = u.id and e.completed_at is not null)::int as challenger
    from users u where u.id in (${ids})`)) as unknown as { user_id: string; swift: number; kind: number; golden: number; deep: number; challenger: number }[];
  for (const r of rows) out.set(r.user_id, { SWIFT: Number(r.swift), KIND: Number(r.kind), GOLDEN: Number(r.golden), DEEP: Number(r.deep), CHALLENGER: Number(r.challenger) });
  return out;
}

export function earnedTitles(stats: Stats | undefined) {
  if (!stats) return [];
  return TITLES.filter((t) => stats[t.code] >= t.need);
}

//Bit grows as the whole Guild finishes peer reviews: a shared goal everyone can see
export const BIT_STAGES = [
  { stage: 0, name: "Hatchling", at: 0 },
  { stage: 1, name: "Squire Slime", at: 10 },
  { stage: 2, name: "Knight Slime", at: 25 },
  { stage: 3, name: "Royal Slime", at: 50 },
] as const;

export async function guildGrowth() {
  const [r] = (await db.execute(sql`select count(*)::int as n from reviews where not is_mentor`)) as unknown as { n: number }[];
  const reviews = Number(r?.n ?? 0);
  const cur = [...BIT_STAGES].reverse().find((s) => reviews >= s.at)!;
  const next = BIT_STAGES.find((s) => s.at > reviews) ?? null;
  return { reviews, stage: cur.stage as 0 | 1 | 2 | 3, name: cur.name, next };
}
