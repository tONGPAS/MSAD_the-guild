import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { xpEvents } from "@/db/schema";
import { requireUser } from "@/modules/auth/session";
import { RankSeal } from "@/components/rank-seal";
import { RANKS, rankProgress } from "@/lib/rules";
import { ago } from "@/lib/time";

export const metadata: Metadata = { title: "Guild Hall" };

const ACTION_LABEL: Record<string, string> = {
  SUBMIT_QUEST: "Submitted a quest",
  COMPLETE_REVIEW: "Completed a review",
  RESOLVE_FAST: "Resolved a quest within 48 hours",
  HELPFUL_RATING: "Review rated helpful",
};

//Early SC-08 (own profile only). Streaks, badges, and other profiles arrive in Release 3.
export default async function ProfilePage() {
  const user = await requireUser({ role: "STUDENT" });
  const p = rankProgress(user.xpTotal);
  const events = await db.select().from(xpEvents).where(eq(xpEvents.userId, user.id)).orderBy(desc(xpEvents.createdAt)).limit(30);

  return (
    <div className="space-y-8">
      <section className="panel flex flex-wrap items-center gap-6 p-6">
        <span className="text-ink"><RankSeal xp={user.xpTotal} size={88} /></span>
        <div className="min-w-56 flex-1">
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="mb-3 text-muted">{p.next ? `${p.toNext} XP to reach ${p.next}` : "You reached the highest rank."}</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gold-soft" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next rank">
            <div className="h-full bg-gold" style={{ width: `${p.pct}%` }} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Ranks</h2>
        <ol className="flex flex-wrap gap-2">
          {RANKS.map((r) => (
            <li key={r.rank} className={`rounded-md border px-3 py-2 text-sm ${user.xpTotal >= r.min ? "border-gold bg-gold-soft font-bold" : "border-line text-muted"}`}>
              {r.label} <span className="font-normal">({r.min} XP)</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Recent XP</h2>
        {events.length === 0 ? (
          <p className="panel p-6 text-muted">No XP yet. Submit a quest (10 XP) or finish a review (25 XP) to start.</p>
        ) : (
          <ul className="panel divide-y divide-line">
            {events.map((e) => (
              <li key={e.id} className="flex justify-between gap-3 px-4 py-3">
                <span>{ACTION_LABEL[e.action] ?? e.action}</span>
                <span className="whitespace-nowrap"><strong className="text-gold">+{e.points}</strong> <span className="text-sm text-muted">{ago(e.createdAt)}</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
