import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { allQuests, type QuestFilters } from "@/modules/quests/service";
import { QuestRows } from "@/components/quest-rows";
import { BitSays } from "@/components/bit-says";
import { BIT } from "@/lib/bit-lines";

export const metadata: Metadata = { title: "All quests" };

const STATUSES = [["PENDING", "Pending"], ["IN_REVIEW", "In Review"], ["COMPLETED", "Completed"], ["RESOLVED", "Resolved"]] as const;
const LEVELS = [["EASY", "Easy"], ["MEDIUM", "Medium"], ["HARD", "Hard"]] as const;

//FR-41
export default async function FacultyQuestsPage({ searchParams }: PageProps<"/faculty/quests">) {
  await requireUser({ role: "FACULTY" });
  const sp = await searchParams;
  const pick = <T extends string>(v: unknown, allowed: readonly (readonly [T, string])[]) =>
    allowed.find(([k]) => k === v)?.[0];
  const filters: QuestFilters = {
    status: pick(sp.status, STATUSES),
    difficulty: pick(sp.difficulty, LEVELS),
    q: typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined,
  };
  const filtered = !!(filters.status || filters.difficulty || filters.q);
  const rows = await allQuests(filters);

  return (
    <>
      <h1 className="mb-1 text-3xl font-bold">All quests</h1>
      <p className="mb-5 text-muted">Every quest and review, whoever it is assigned to.</p>
      <BitSays lines={[...BIT.facultyTips]} pose="idle" size={64} className="mb-5" />
      <form method="get" data-tour="filters" className="panel mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="field-label">Search title or person</label>
          <input id="q" name="q" defaultValue={filters.q} className="field" />
        </div>
        <div>
          <label htmlFor="status" className="field-label">Status</label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className="field">
            <option value="">Any</option>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="difficulty" className="field-label">Difficulty</label>
          <select id="difficulty" name="difficulty" defaultValue={filters.difficulty ?? ""} className="field">
            <option value="">Any</option>
            {LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button className="btn-primary">Filter</button>
        {filtered && <Link href="/faculty/quests" className="btn-ghost">Clear</Link>}
      </form>
      <p className="mb-3 text-sm text-muted">{rows.length} quest{rows.length === 1 ? "" : "s"}{filtered ? " match" : ""}</p>
      <QuestRows rows={rows} empty={filtered ? "No quests match these filters." : "No quests yet. Invite students from Members so they can start submitting."} />
    </>
  );
}
