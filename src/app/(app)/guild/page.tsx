import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { guildMembers } from "@/modules/progression/profile";
import { RankSeal } from "@/components/rank-seal";

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
            <li key={m.id}>
              <Link href={`/guild/${m.id}`} className="panel flex items-center gap-4 p-4 hover:border-brand">
                <RankSeal xp={m.xpTotal} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{m.name}{m.id === me.id && " (you)"}</span>
                  <span className="block text-sm text-muted">
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
