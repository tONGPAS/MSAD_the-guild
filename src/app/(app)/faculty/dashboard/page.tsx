import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { formatHours, medianTurnaround, parseRange, questsPerWeek, rangeTotals, reviewsPerStudent } from "@/modules/dashboard/service";
import { WeekBars } from "@/components/week-bars";

export const metadata: Metadata = { title: "Dashboard" };

//SC-10, FR-42 to FR-45
export default async function DashboardPage({ searchParams }: PageProps<"/faculty/dashboard">) {
  await requireUser({ role: "FACULTY" });
  const sp = await searchParams;
  const range = parseRange(sp.from, sp.to);
  const [median, perStudent, weeks, totals] = await Promise.all([
    medianTurnaround(range),
    reviewsPerStudent(range),
    questsPerWeek(range),
    rangeTotals(range),
  ]);
  const qs = `from=${range.fromKey}&to=${range.toKey}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted">Review activity for the dates you pick. Times are Philippine time.</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div>
            <label htmlFor="from" className="field-label">From</label>
            <input id="from" name="from" type="date" defaultValue={range.fromKey} className="field" />
          </div>
          <div>
            <label htmlFor="to" className="field-label">To</label>
            <input id="to" name="to" type="date" defaultValue={range.toKey} className="field" />
          </div>
          <button className="btn-ghost">Show</button>
        </form>
      </div>

      <section aria-label="Summary" className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="panel p-5">
          <p className="text-sm text-muted">Median time to first review</p>
          <p className="font-display text-4xl font-bold tabular-nums">{formatHours(median.hours)}</p>
          <p className="text-sm text-muted">across {median.n} reviewed quest{median.n === 1 ? "" : "s"}</p>
        </div>
        <Tile label="Quests submitted" value={totals.quests} />
        <Tile label="Peer reviews done" value={totals.reviews} />
        <Tile label="Mentor requests" value={totals.mentor} />
      </section>

      <section aria-labelledby="weekly" className="panel p-5">
        <h2 id="weekly" className="mb-4 text-xl font-bold">Quests submitted per week</h2>
        <WeekBars weeks={weeks} />
      </section>

      <section aria-labelledby="per-student">
        <h2 id="per-student" className="mb-1 text-xl font-bold">Reviews by student</h2>
        <p className="mb-3 text-sm text-muted">Missed means a review was taken away after going overdue or stale.</p>
        {perStudent.length === 0 ? (
          <p className="panel p-6 text-muted">No students yet.</p>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full text-left tabular-nums">
              <thead className="text-sm text-muted">
                <tr><th className="px-4 py-2 font-bold">Student</th><th className="px-4 py-2 text-right font-bold">Reviews</th><th className="px-4 py-2 text-right font-bold">Missed</th></tr>
              </thead>
              <tbody>
                {perStudent.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-4 py-2"><Link href={`/guild/${s.id}`} className="underline-offset-4 hover:underline">{s.name}</Link></td>
                    <td className="px-4 py-2 text-right">{s.reviews}</td>
                    <td className={`px-4 py-2 text-right ${s.missed > 0 ? "font-bold text-danger" : "text-muted"}`}>{s.missed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-bold">Export these dates as CSV</p>
          <p className="text-sm text-muted">One row per quest. Students appear as codes like S01, never by name. Each export is logged.</p>
        </div>
        <a href={`/api/faculty/export?${qs}`} className="btn-primary" download>Download CSV</a>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
