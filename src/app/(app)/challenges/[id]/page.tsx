import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { challengeEntries, quests, users } from "@/db/schema";
import { requireUser } from "@/modules/auth/session";
import { challengeViews } from "@/modules/challenges/service";
import { submitChallengeReview } from "@/modules/challenges/actions";
import { KIND_LABEL, METRICS } from "@/modules/challenges/templates";
import { formatRef } from "@/lib/rules";
import { CodeView } from "@/components/code-view";
import { QuestBrief } from "@/components/quest-brief";
import { ReviewForm } from "@/components/review-form";
import { ProgressBar, timeLeft } from "@/components/challenge-card";
import { Bit } from "@/components/bit";
import { Crest } from "@/components/crest";
import { ScorePips } from "@/components/comment-icon";

export const metadata: Metadata = { title: "Challenge" };

export default async function ChallengePage({ params, searchParams }: PageProps<"/challenges/[id]">) {
  const user = await requireUser({ role: "STUDENT" });
  const { id } = await params;
  const c = (await challengeViews(user.id, { includeEnded: true })).find((x) => x.id === id);
  if (!c || c.state === "upcoming") notFound();
  const sp = await searchParams;
  const done = !!c.entry?.completedAt || (c.scope === "GUILD" && !!c.rewardedAt && c.mine > 0);
  const active = c.state === "active";

  //Review challenges: after you submit (or once it ends) you can read how classmates reviewed the same code
  const showOthers = c.kind === "REVIEW" && (!!c.entry || !active);
  const others = showOthers
    ? await db
        .select({ id: challengeEntries.id, userId: users.id, name: users.name, review: challengeEntries.review, words: challengeEntries.words })
        .from(challengeEntries)
        .innerJoin(users, eq(users.id, challengeEntries.userId))
        .where(and(eq(challengeEntries.challengeId, c.id), isNotNull(challengeEntries.review)))
        .orderBy(challengeEntries.createdAt)
    : [];
  const [answer] = c.kind === "CODING" && c.entry?.questId
    ? await db.select({ refNo: quests.refNo, status: quests.status }).from(quests).where(eq(quests.id, c.entry.questId))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/challenges" className="text-sm text-muted underline">Challenges</Link>
        <p className="font-pixel mt-2 text-sm text-muted">{(c.scope === "GUILD" ? "Guild goal" : KIND_LABEL[c.kind]).toUpperCase()} · {active ? timeLeft(c.msLeft).toUpperCase() : "ENDED"} · +{c.xpReward} XP</p>
        <h1 className="text-3xl font-bold">{c.title}</h1>
        <p className="mt-1 max-w-2xl">{c.description}</p>
      </div>

      {(done || sp.done) && (
        <section role="status" className="panel anim-pop flex items-center gap-4 border-gold p-4" style={{ backgroundImage: "radial-gradient(circle at 0% 0%, var(--gold-soft), transparent 60%)" }}>
          <Bit pose="cheer" size={72} />
          <div>
            <p className="font-display text-xl font-extrabold">Challenge complete!</p>
            <p className="font-pixel text-xl text-gold">+{c.xpReward} XP</p>
          </div>
        </section>
      )}

      {c.kind === "GOAL" && c.metric && c.target && (
        <section className="panel space-y-2 p-4">
          <div className="flex justify-between">
            <span className="font-bold">{METRICS[c.metric].label}{c.scope === "GUILD" ? ", whole Guild" : ""}</span>
            <span className="font-pixel text-lg">{Math.min(c.scope === "GUILD" ? c.guildTotal : c.mine, c.target)}/{c.target}</span>
          </div>
          <ProgressBar value={c.scope === "GUILD" ? c.guildTotal : c.mine} max={c.target} gold={done} />
          <p className="text-sm text-muted">
            {c.scope === "GUILD"
              ? `You've added ${c.mine}. Everyone who adds at least one shares the reward when the Guild reaches ${c.target}.`
              : "This fills in by itself as you use the Guild. Nothing to submit."}
          </p>
        </section>
      )}

      {c.kind === "CODING" && (
        <section className="panel space-y-3 p-4">
          {answer ? (
            <p>
              Your answer is <Link href={`/quests/${answer.refNo}`} className="font-bold text-brand underline">{formatRef(answer.refNo)}</Link>.{" "}
              {c.entry?.completedAt ? "A classmate reviewed it, so the challenge is complete." : "The reward arrives when a classmate finishes reviewing it."}
            </p>
          ) : active ? (
            <>
              <p>Write your solution, then submit it as a quest. A classmate reviews it like any other quest, and you earn the reward once their review is in.</p>
              <Link href={`/quests/new?challenge=${c.id}`} className="btn-gold inline-block">Submit your solution</Link>
            </>
          ) : (
            <p className="text-muted">This challenge has ended.</p>
          )}
        </section>
      )}

      {c.kind === "REVIEW" && c.code && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-4">
            <QuestBrief context={c.context} notes={null} by="the Guild Masters" />
            <CodeView link={null} prTitle={null} prSize={null} snippet={c.code} image={null} language={c.language} />
          </div>
          {active && !c.entry ? (
            <ReviewForm submit={submitChallengeReview.bind(null, c.id)} />
          ) : (
            <p className="panel h-fit p-4 text-muted">{c.entry ? "You reviewed this code. See how your classmates reviewed it below." : "This challenge has ended."}</p>
          )}
        </div>
      )}

      {showOthers && others.length > 0 && (
        <section aria-labelledby="others-h">
          <h2 id="others-h" className="mb-3 text-xl font-bold">How the Guild reviewed it</h2>
          <ul className="grid gap-3">
            {others.map((o) => (
              <li key={o.id} className="panel min-w-0 space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <Crest id={o.userId} name={o.name} size={30} />
                  <span className="font-bold">{o.userId === user.id ? "You" : o.name}</span>
                  <span className="ml-auto text-sm text-muted">{o.words} words</span>
                </div>
                {o.review && (
                  <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    {(["readability", "correctness", "structure"] as const).map((k) => (
                      <div key={k} className="flex items-center gap-2"><dt className="capitalize text-muted">{k}</dt><dd><ScorePips value={o.review![k]} /></dd></div>
                    ))}
                  </dl>
                )}
                <ul className="space-y-1.5">
                  {o.review?.comments.map((cm, i) => (
                    <li key={i} className="min-w-0 break-words"><span className={`mr-1.5 text-sm font-bold ${cm.kind === "ISSUE" ? "text-warn" : "text-ok"}`}>{cm.kind === "ISSUE" ? "Issue" : "Praise"}</span>{cm.body}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
