import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/modules/auth/session";
import { isUnlocked, levelOf, type TrainingProgress } from "@/modules/tutorial/training";
import { submitTraining } from "@/modules/tutorial/actions";
import { CodeView } from "@/components/code-view";
import { QuestBrief } from "@/components/quest-brief";
import { ReviewForm } from "@/components/review-form";
import { Bit } from "@/components/bit";
import { BitSays } from "@/components/bit-says";

export const metadata: Metadata = { title: "Training Grounds" };

const WORD_GOAL = 30;

//FR-46: one practice level, or its debrief after submitting (?found=...)
export default async function TrainingLevel({ params, searchParams }: PageProps<"/training/[level]">) {
  const user = await requireUser();
  const level = levelOf(Number((await params).level));
  if (!level) notFound();
  const [row] = await db.select({ p: users.trainingProgress }).from(users).where(eq(users.id, user.id));
  const progress = (row?.p ?? {}) as TrainingProgress;
  if (!isUnlocked(progress, level.n)) redirect("/training");
  const sp = await searchParams;
  const home = user.role === "FACULTY" ? "/faculty/quests" : "/quests";
  const total = level.findings.length;
  const what = level.n === 2 ? "problem" : "bug";

  if (typeof sp.found === "string") {
    const found = new Set(sp.found.split(","));
    const words = Math.max(0, Number(sp.words) || 0);
    const n = level.findings.filter((f) => found.has(f.key)).length;
    const verdict = n === total ? (total === 1 ? "Got it! That's the one." : `A perfect catch! All ${total} found.`) : n > 0 ? `Good eye! You caught ${n} of ${total}.` : `That ${what} was sneaky. Here is where it was hiding.`;
    return (
      <div className="space-y-6">
        <div>
          <Link href="/training" className="text-sm text-muted underline">Training Grounds</Link>
          <h1 className="mt-2 text-3xl font-bold">Level {level.n} debrief: {level.title}</h1>
        </div>
        <section className="panel anim-pop flex flex-wrap items-end gap-4 p-5" style={{ backgroundImage: "radial-gradient(circle at 0% 0%, var(--gold-soft), transparent 60%)" }}>
          <Bit pose={n === total ? "cheer" : n > 0 ? "idle" : "think"} size={110} />
          <div className="min-w-56 flex-1">
            <p className="font-display text-2xl font-extrabold">{verdict}</p>
            <p className="font-pixel mt-1 text-2xl text-gold">{n}/{total} {what}{total === 1 ? "" : "s"}</p>
            <p className="text-muted">
              You wrote {words} words. {words >= WORD_GOAL ? "That's the kind of detail that helps." : `Real reviews aim for ${WORD_GOAL} or more, so say why it matters and how to fix it.`}
            </p>
          </div>
        </section>
        <ul className="grid gap-3">
          {level.findings.map((f) => {
            const got = found.has(f.key);
            return (
              <li key={f.key} className={`panel flex gap-3 p-4 ${got ? "border-ok/50" : "border-warn/50"}`}>
                <span aria-hidden className={`font-pixel grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl ${got ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>{got ? "✓" : "!"}</span>
                <div className="min-w-0">
                  <p className="font-bold">{f.name} <span className={`text-sm font-bold ${got ? "text-ok" : "text-warn"}`}>{got ? "Found" : "Missed"}</span></p>
                  <code className="my-1 inline-block rounded bg-sunken px-1.5 py-0.5 font-mono text-sm break-all">{f.code}</code>
                  <p>{f.why}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted">Bit checks for words that point at each {what}, so an unusual way of saying it might not register. It is practice, so what matters is that you looked.</p>
        <div className="flex flex-wrap gap-2">
          {level.n < 3 ? (
            <Link href={`/training/${level.n + 1}`} className="btn-gold">Next level</Link>
          ) : (
            <Link href={home} className="btn-gold">Back to my quests</Link>
          )}
          <Link href={`/training/${level.n}`} className="btn-ghost">Try again</Link>
          <Link href="/training" className="btn-ghost">Level map</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/training" className="text-sm text-muted underline">Training Grounds</Link>
        <p className="font-pixel mt-2 text-sm text-muted">LEVEL {level.n} · {level.tag.toUpperCase()} · NO XP</p>
        <h1 className="text-3xl font-bold">{level.title}</h1>
        <p className="text-muted">{level.goal} Score it with the rubric, then leave a comment for each thing you find.</p>
      </div>
      <BitSays pose="think" size={72} lines={level.hints} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-4">
          <QuestBrief context={level.context} notes={level.notes} by="Bit" />
          <CodeView link={null} prTitle={null} prSize={null} snippet={level.snippet} image={null} language="c" />
        </div>
        <ReviewForm submit={submitTraining.bind(null, level.n)} />
      </div>
    </div>
  );
}
