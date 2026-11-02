import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { manilaDateKey, manilaDayStart, manilaWeekStart } from "@/lib/rules";

export type Range = { from: Date; to: Date; fromKey: string; toKey: string };

const DAY = 86_400_000;
const isoDay = /^\d{4}-\d{2}-\d{2}$/;

//"from" and "to" are Manila calendar days, both included. Default: the last 28 days.
export function parseRange(fromRaw?: string | string[], toRaw?: string | string[]): Range {
  const today = manilaDayStart();
  const toDay = typeof toRaw === "string" && isoDay.test(toRaw) ? new Date(`${toRaw}T00:00:00+08:00`) : today;
  let fromDay = typeof fromRaw === "string" && isoDay.test(fromRaw) ? new Date(`${fromRaw}T00:00:00+08:00`) : new Date(toDay.getTime() - 27 * DAY);
  if (Number.isNaN(fromDay.getTime()) || fromDay > toDay) fromDay = new Date(toDay.getTime() - 27 * DAY);
  return { from: fromDay, to: new Date(toDay.getTime() + DAY), fromKey: manilaDateKey(fromDay), toKey: manilaDateKey(toDay) };
}

//FR-42: from submission to the first time the quest reached Completed, read from status history
export async function medianTurnaround(r: Range) {
  const rows = await db.execute<{ median_hours: number | null; n: number }>(sql`
    with first_done as (
      select q.id, q.created_at, min(s.changed_at) as done_at
      from quests q join status_logs s on s.quest_id = q.id and s.to_status = 'COMPLETED'
      group by q.id, q.created_at
    )
    select percentile_cont(0.5) within group (order by extract(epoch from done_at - created_at) / 3600) as median_hours,
           count(*)::int as n
    from first_done where done_at >= ${r.from.toISOString()}::timestamptz and done_at < ${r.to.toISOString()}::timestamptz`);
  const row = rows[0];
  return { hours: row?.median_hours === null || row?.median_hours === undefined ? null : Number(row.median_hours), n: row?.n ?? 0 };
}

//FR-43: every active Student, including those with zero, so nobody hides at the bottom of a short list
export async function reviewsPerStudent(r: Range) {
  return db.execute<{ id: string; name: string; reviews: number; missed: number }>(sql`
    select u.id, u.name,
      (select count(*)::int from reviews v where v.reviewer_id = u.id and not v.is_mentor and v.created_at >= ${r.from.toISOString()}::timestamptz and v.created_at < ${r.to.toISOString()}::timestamptz) as reviews,
      (select count(*)::int from reassignments a where a.from_reviewer = u.id and a.created_at >= ${r.from.toISOString()}::timestamptz and a.created_at < ${r.to.toISOString()}::timestamptz) as missed
    from users u
    where u.role = 'STUDENT' and u.status = 'ACTIVE' and u.consent_at is not null
    order by reviews desc, u.name asc`);
}

//FR-44: Monday-start Manila weeks, with empty weeks filled in so the chart's time axis is honest
export async function questsPerWeek(r: Range) {
  const rows = await db.execute<{ week: string; n: number }>(sql`
    select to_char(date_trunc('week', created_at at time zone 'Asia/Manila'), 'YYYY-MM-DD') as week, count(*)::int as n
    from quests where created_at >= ${r.from.toISOString()}::timestamptz and created_at < ${r.to.toISOString()}::timestamptz
    group by 1 order by 1`);
  const counts = new Map(rows.map((x) => [x.week, x.n]));
  const weeks: { week: string; n: number }[] = [];
  for (let w = manilaWeekStart(r.from.getTime()); w < r.to; w = new Date(w.getTime() + 7 * DAY)) {
    const key = manilaDateKey(w);
    weeks.push({ week: key, n: counts.get(key) ?? 0 });
  }
  return weeks;
}

export async function rangeTotals(r: Range) {
  const rows = await db.execute<{ quests: number; reviews: number; mentor: number; resolved: number }>(sql`
    select
      (select count(*)::int from quests where created_at >= ${r.from.toISOString()}::timestamptz and created_at < ${r.to.toISOString()}::timestamptz) as quests,
      (select count(*)::int from reviews where not is_mentor and created_at >= ${r.from.toISOString()}::timestamptz and created_at < ${r.to.toISOString()}::timestamptz) as reviews,
      (select count(*)::int from mentor_requests where created_at >= ${r.from.toISOString()}::timestamptz and created_at < ${r.to.toISOString()}::timestamptz) as mentor,
      (select count(*)::int from quests where resolved_at >= ${r.from.toISOString()}::timestamptz and resolved_at < ${r.to.toISOString()}::timestamptz) as resolved`);
  return rows[0];
}

//FR-45, BRL-10: one row per quest submitted in the range; people appear only as codes
export async function exportRows(r: Range) {
  return db.execute<Record<string, string | number | boolean | null>>(sql`
    with codes as (
      select id, case role when 'STUDENT' then 'S' else 'F' end
        || lpad((row_number() over (partition by role order by created_at, id))::text, 2, '0') as code
      from users
    ),
    peer as (
      select distinct on (quest_id) quest_id, id, reviewer_id, readability, correctness, structure, helpful, created_at
      from reviews where not is_mentor order by quest_id, created_at
    ),
    words as (
      select review_id, sum(array_length(regexp_split_to_array(trim(body), '\\s+'), 1))::int as n
      from comments where kind <> 'REPLY' group by review_id
    )
    select 'QS-' || lpad(q.ref_no::text, 6, '0') as quest,
      to_char(q.created_at at time zone 'Asia/Manila', 'YYYY-MM-DD HH24:MI') as submitted_at,
      q.difficulty, q.status,
      sc.code as submitter, rc.code as reviewer,
      to_char(p.created_at at time zone 'Asia/Manila', 'YYYY-MM-DD HH24:MI') as reviewed_at,
      round((extract(epoch from p.created_at - q.created_at) / 3600)::numeric, 1) as turnaround_hours,
      p.readability, p.correctness, p.structure,
      w.n as comment_words,
      p.helpful,
      exists (select 1 from reviews m where m.quest_id = q.id and m.is_mentor) as mentor_reviewed,
      (select count(*)::int from reassignments a where a.quest_id = q.id) as reassignments
    from quests q
    join codes sc on sc.id = q.submitter_id
    left join peer p on p.quest_id = q.id
    left join codes rc on rc.id = p.reviewer_id
    left join words w on w.review_id = p.id
    where q.created_at >= ${r.from.toISOString()}::timestamptz and q.created_at < ${r.to.toISOString()}::timestamptz
    order by q.ref_no`);
}

export function formatHours(h: number | null) {
  if (h === null) return "No reviews yet";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} days`;
}
