import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { guildMembers } from "@/modules/progression/profile";
import { Crest } from "@/components/crest";
import { RankEmblem, XpBar } from "@/components/rank-seal";
import { rankProgress } from "@/lib/rules";

export const metadata: Metadata = { title: "Guild Hall" };

//SC-08 directory. Alphabetical, not ranked: leaderboards are out of scope (SRS 1.4).
export default async function GuildHallPage() {
  const me = await requireUser();
  const members = await guildMembers();
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold">Guild Hall</h1>
      <p className="mb-6 max-w-2xl text-muted">Everyone in the Guild, by name. Open a profile to see their rank, streak, badges, and reviews.</p>
      {members.length === 0 ? (
        <p className="panel p-6 text-muted">No students have joined yet. Faculty can invite them from Members.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id} className="min-w-0">
              <Link href={`/guild/${m.id}`} className={`panel flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${m.id === me.id ? "border-gold" : ""}`}>
                <Crest id={m.id} name={m.name} size={44} ring={m.id === me.id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{m.name}{m.id === me.id && " (you)"}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-sm">
                    <RankEmblem xp={m.xpTotal} size={16} />
                    <span className="font-bold">{rankProgress(m.xpTotal).label}</span>
                    <span className="font-pixel ml-auto text-gold">{m.xpTotal} XP</span>
                  </span>
                  <XpBar xp={m.xpTotal} className="mt-1" />
                  <span className="mt-1 block text-xs text-muted">
                    {m.streak > 0 ? `${m.streak}-week streak` : "No streak yet"}, {m.badges} of 5 badges
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
