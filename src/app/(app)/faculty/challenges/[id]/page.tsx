import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { challengeEntries, quests, users } from "@/db/schema";
import { requireUser } from "@/modules/auth/session";
import { challengeViews, metricByUser } from "@/modules/challenges/service";
import { endChallenge } from "@/modules/challenges/actions";
import { KIND_LABEL, METRICS } from "@/modules/challenges/templates";
import { formatRef } from "@/lib/rules";
import { ProgressBar, timeLeft } from "@/components/challenge-card";
import { CodeView } from "@/components/code-view";
import { QuestBrief } from "@/components/quest-brief";
import { Crest } from "@/components/crest";
import { StatusTag } from "@/components/badges";
import { ScorePips } from "@/components/comment-icon";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Challenge" };

//CR-02: how a challenge is going, student by student
export default async function FacultyChallenge({ params, searchParams }: PageProps<"/faculty/challenges/[id]">) {
  await requireUser({ role: "FACULTY" });
  const { id } = await params;
  const c = (await challengeViews(null, { includeEnded: true })).find((x) => x.id === id);
  if (!c) notFound();
  const sp = await searchParams;
  const students = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.role, "STUDENT"), eq(users.status, "ACTIVE")))
    .orderBy(asc(users.name));
  const entries = await db
    .select({ userId: challengeEntries.userId, completedAt: challengeEntries.completedAt, review: challengeEntries.review, words: challengeEntries.words, refNo: quests.refNo, status: quests.status })
    .from(challengeEntries)
    .leftJoin(quests, eq(quests.id, challengeEntries.questId))
    .where(eq(challengeEntries.challengeId, c.id));
  const byUser = new Map(entries.map((e) => [e.userId, e]));
  const counts = c.kind === "GOAL" && c.metric ? await metricByUser(db, c.metric, c.startsAt, c.endsAt) : new Map<string, number>();
  const name = new Map(students.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/faculty/challenges" className="text-sm text-muted underline">Challenges</Link>
        <p className="font-pixel mt-2 text-sm text-muted">{(c.scope === "GUILD" ? "Guild goal" : KIND_LABEL[c.kind]).toUpperCase()} · {c.state === "active" ? timeLeft(c.msLeft).toUpperCase() : "ENDED"} · +{c.xpReward} XP</p>
        <h1 className="text-3xl font-bold">{c.title}</h1>
        <p className="mt-1 max-w-2xl">{c.description}</p>
      </div>
      {sp.created && <p role="status" className="panel border-ok/50 p-3 font-bold text-ok">Published. Students can see it now.</p>}

      {c.state === "active" && (
        <form action={endChallenge.bind(null, c.id)} className="flex flex-wrap items-center gap-3">
          <SubmitButton pending="Ending..." className="btn-ghost">End now</SubmitButton>
          <span className="text-sm text-muted">Ending early keeps every reward already earned.</span>
        </form>
      )}

      {c.kind === "GOAL" && c.metric && c.target && (
        <section className="panel space-y-3 p-4">
          {c.scope === "GUILD" && (
            <>
              <div className="flex justify-between font-bold"><span>Guild total</span><span className="font-pixel text-lg">{Math.min(c.guildTotal, c.target)}/{c.target}</span></div>
              <ProgressBar value={c.guildTotal} max={c.target} gold={!!c.rewardedAt} />
            </>
          )}
          <table className="w-full text-left">
            <caption className="sr-only">Progress per student</caption>
            <thead className="text-sm text-muted"><tr><th className="py-1 font-normal">Student</th><th className="py-1 font-normal">{METRICS[c.metric].label}</th><th className="py-1 text-right font-normal">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {students.map((s) => {
                const n = counts.get(s.id) ?? 0;
                const done = !!byUser.get(s.id)?.completedAt;
                return (
                  <tr key={s.id}>
                    <td className="py-2"><span className="flex items-center gap-2"><Crest id={s.id} name={s.name} size={26} />{s.name}</span></td>
                    <td className="font-pixel py-2 text-lg">{n}{c.scope === "PERSONAL" ? `/${c.target}` : ""}</td>
                    <td className={`py-2 text-right text-sm font-bold ${done ? "text-ok" : "text-muted"}`}>{done ? "Rewarded" : c.scope === "GUILD" ? (n > 0 ? "Contributing" : "Not yet") : "In progress"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {c.kind === "CODING" && (
        <section className="panel p-4">
          <h2 className="mb-2 font-bold">Answers ({entries.length})</h2>
          {entries.length === 0 ? <p className="text-muted">No answers yet.</p> : (
            <ul className="divide-y divide-line">
              {entries.map((e) => (
                <li key={e.userId} className="flex flex-wrap items-center gap-3 py-2">
                  <Crest id={e.userId} name={name.get(e.userId) ?? "?"} size={26} />
                  <span className="font-bold">{name.get(e.userId)}</span>
                  {e.refNo && <Link href={`/quests/${e.refNo}`} className="text-brand underline">{formatRef(e.refNo)}</Link>}
                  {e.status && <StatusTag status={e.status} />}
                  <span className={`ml-auto text-sm font-bold ${e.completedAt ? "text-ok" : "text-muted"}`}>{e.completedAt ? "Reviewed, rewarded" : "Waiting for review"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {c.kind === "REVIEW" && c.code && (
        <>
          <div className="min-w-0 space-y-4">
            <QuestBrief context={c.context} notes={null} by="you" />
            <CodeView link={null} prTitle={null} prSize={null} snippet={c.code} image={null} language={c.language} />
          </div>
          <section aria-labelledby="entries-h">
            <h2 id="entries-h" className="mb-3 text-xl font-bold">Reviews ({entries.length})</h2>
            {entries.length === 0 ? <p className="panel p-4 text-muted">No reviews yet.</p> : (
              <ul className="grid gap-3">
                {entries.map((e) => (
                  <li key={e.userId} className="panel min-w-0 space-y-2 p-4">
                    <div className="flex items-center gap-2"><Crest id={e.userId} name={name.get(e.userId) ?? "?"} size={28} /><span className="font-bold">{name.get(e.userId)}</span><span className="ml-auto text-sm text-muted">{e.words} words</span></div>
                    {e.review && (
                      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        {(["readability", "correctness", "structure"] as const).map((k) => (
                          <div key={k} className="flex items-center gap-2"><dt className="capitalize text-muted">{k}</dt><dd><ScorePips value={e.review![k]} /></dd></div>
                        ))}
                      </dl>
                    )}
                    <ul className="space-y-1.5">
                      {e.review?.comments.map((cm, i) => (
                        <li key={i} className="min-w-0 break-words"><span className={`mr-1.5 text-sm font-bold ${cm.kind === "ISSUE" ? "text-warn" : "text-ok"}`}>{cm.kind === "ISSUE" ? "Issue" : "Praise"}</span>{cm.body}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
