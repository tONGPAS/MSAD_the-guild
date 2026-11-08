import type { Metadata } from "next";
import { requireUser } from "@/modules/auth/session";
import { challengeViews } from "@/modules/challenges/service";
import { guildGrowth } from "@/modules/progression/titles";
import { ChallengeCard } from "@/components/challenge-card";
import { GuildGrowth } from "@/components/guild-growth";
import { BitSays } from "@/components/bit-says";

export const metadata: Metadata = { title: "Challenges" };

//CR-02: the student quest log of challenges set by the Guild Masters
export default async function ChallengesPage() {
  const user = await requireUser({ role: "STUDENT" });
  const [views, growth] = await Promise.all([challengeViews(user.id, { includeEnded: true }), guildGrowth()]);
  const active = views.filter((c) => c.state === "active");
  const ended = views.filter((c) => c.state === "ended").reverse().slice(0, 6);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Challenges</h1>
        <p className="text-muted">Set by the Guild Masters. Goals fill in by themselves as you review; coding and review challenges you take on purpose.</p>
      </div>
      <GuildGrowth g={growth} />
      <section aria-labelledby="active-h">
        <h2 id="active-h" className="mb-3 text-xl font-bold">Active now</h2>
        {active.length === 0 ? (
          <div className="panel p-5"><BitSays pose="sleep" size={64} lines={["No challenges right now. The Guild Masters will post new ones soon!"]} /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">{active.map((c) => <ChallengeCard key={c.id} c={c} href={`/challenges/${c.id}`} />)}</div>
        )}
      </section>
      {ended.length > 0 && (
        <section aria-labelledby="ended-h">
          <h2 id="ended-h" className="mb-3 text-xl font-bold">Recently ended</h2>
          <div className="grid gap-3 opacity-80 sm:grid-cols-2">{ended.map((c) => <ChallengeCard key={c.id} c={c} href={`/challenges/${c.id}`} />)}</div>
        </section>
      )}
    </div>
  );
}
