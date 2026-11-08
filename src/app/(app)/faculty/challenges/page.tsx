import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { challengeViews } from "@/modules/challenges/service";
import { ChallengeCard } from "@/components/challenge-card";
import { BitSays } from "@/components/bit-says";

export const metadata: Metadata = { title: "Challenges" };

//CR-02: the Guild Master's challenge board
export default async function FacultyChallenges() {
  await requireUser({ role: "FACULTY" });
  const views = await challengeViews(null, { includeEnded: true });
  const active = views.filter((c) => c.state === "active");
  const ended = views.filter((c) => c.state === "ended").reverse();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Challenges</h1>
          <p className="text-muted">Set goals, coding tasks, and review challenges for the Guild. Start from a template and change anything you like.</p>
        </div>
        <Link href="/faculty/challenges/new" className="btn-gold">New challenge</Link>
      </div>
      <section aria-labelledby="active-h">
        <h2 id="active-h" className="mb-3 text-xl font-bold">Running now</h2>
        {active.length === 0 ? (
          <div className="panel p-5"><BitSays pose="think" size={64} lines={["No challenges are running, Guild Master. A weekly Review Sprint is a good first one!"]} /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">{active.map((c) => <ChallengeCard key={c.id} c={c} faculty href={`/faculty/challenges/${c.id}`} />)}</div>
        )}
      </section>
      {ended.length > 0 && (
        <section aria-labelledby="ended-h">
          <h2 id="ended-h" className="mb-3 text-xl font-bold">Ended</h2>
          <div className="grid gap-3 opacity-80 sm:grid-cols-2">{ended.map((c) => <ChallengeCard key={c.id} c={c} faculty href={`/faculty/challenges/${c.id}`} />)}</div>
        </section>
      )}
    </div>
  );
}
