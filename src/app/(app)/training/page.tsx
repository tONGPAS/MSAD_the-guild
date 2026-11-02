import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { BUGS, TRAINING, type BugKey } from "@/modules/tutorial/training";
import { submitTraining } from "@/modules/tutorial/actions";
import { CodeView } from "@/components/code-view";
import { QuestBrief } from "@/components/quest-brief";
import { ReviewForm } from "@/components/review-form";
import { Squire } from "@/components/squire";
import { Pip } from "@/components/pip";

export const metadata: Metadata = { title: "Training Grounds" };

const WORD_GOAL = 30;

//FR-46: a practice review on planted bugs. Nothing here touches quests, XP, or the study data.
export default async function TrainingPage({ searchParams }: PageProps<"/training">) {
  const user = await requireUser();
  const sp = await searchParams;
  const home = user.role === "FACULTY" ? "/faculty/quests" : "/quests";

  if (typeof sp.found === "string") {
    const found = new Set(sp.found.split(",") as BugKey[]);
    const words = Math.max(0, Number(sp.words) || 0);
    const n = BUGS.filter((b) => found.has(b.key)).length;
    const verdict = n === 3 ? "A perfect catch! You found all three." : n > 0 ? `Good eye! You caught ${n} of 3.` : "Those bugs were sneaky. Here is where they were hiding.";
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Training Grounds: debrief</h1>
        <section className="panel anim-pop flex flex-wrap items-end gap-4 p-5" style={{ backgroundImage: "radial-gradient(circle at 0% 0%, var(--gold-soft), transparent 60%)" }}>
          <Squire pose={n >= 2 ? "cheer" : "think"} size={96} />
          <div className="min-w-56 flex-1">
            <p className="font-display text-2xl font-extrabold">{verdict}</p>
            <p className="font-pixel mt-1 text-2xl text-gold">{n}/3 bugs</p>
            <p className="text-muted">
              You wrote {words} words. {words >= WORD_GOAL ? "That's the kind of detail that helps." : `Real reviews aim for ${WORD_GOAL} or more, so say why and how to fix it.`}
            </p>
          </div>
        </section>
        <ul className="grid gap-3">
          {BUGS.map((b) => {
            const got = found.has(b.key);
            return (
              <li key={b.key} className={`panel flex gap-3 p-4 ${got ? "border-ok/50" : "border-warn/50"}`}>
                <span aria-hidden className={`font-pixel grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl ${got ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>{got ? "✓" : "!"}</span>
                <div className="min-w-0">
                  <p className="font-bold">{b.name} <span className={`text-sm font-bold ${got ? "text-ok" : "text-warn"}`}>{got ? "Found" : "Missed"}</span></p>
                  <code className="my-1 inline-block rounded bg-sunken px-1.5 py-0.5 font-mono text-sm break-all">{b.code}</code>
                  <p>{b.why}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted">Pip checks for words that point at each bug, so a different way of saying it might not register. It is practice, so what matters is that you looked.</p>
        <div className="flex flex-wrap gap-2">
          <Link href={home} className="btn-primary">Back to my quests</Link>
          <Link href="/training" className="btn-ghost">Try again</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-pixel text-sm text-muted">PRACTICE · NO XP</p>
        <h1 className="text-3xl font-bold">Training Grounds</h1>
        <p className="text-muted">Review this sample like a real quest. Score it, then leave comments on anything wrong.</p>
      </div>
      <Pip
        pose="think" size={72}
        lines={[
          "This code has three bugs hiding in it. Read the brief first: it tells you what the code should do.",
          "Check the loop. How many times does it run when n is 3?",
          "Look at the types in the division. What does int divided by int give you in C?",
          "The brief mentions an empty list. What happens when n is 0?",
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-4">
          <QuestBrief context={TRAINING.context} notes={TRAINING.notes} by="Pip" />
          <CodeView link={null} prTitle={null} prSize={null} snippet={TRAINING.snippet} image={null} />
        </div>
        <ReviewForm submit={submitTraining} />
      </div>
    </div>
  );
}
