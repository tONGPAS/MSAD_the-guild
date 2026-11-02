import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/modules/auth/session";
import { isUnlocked, LEVELS, type TrainingProgress } from "@/modules/tutorial/training";
import { BitSays } from "@/components/bit-says";

export const metadata: Metadata = { title: "Training Grounds" };

//FR-46: the level map. Levels open in order; each shows its best score as gems.
export default async function TrainingMap() {
  const user = await requireUser();
  const [row] = await db.select({ p: users.trainingProgress }).from(users).where(eq(users.id, user.id));
  const progress = (row?.p ?? {}) as TrainingProgress;
  const cleared = LEVELS.filter((l) => progress[String(l.n) as "1"] !== undefined).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-pixel text-sm text-muted">PRACTICE · NO XP</p>
        <h1 className="text-3xl font-bold">Training Grounds</h1>
        <p className="text-muted">Three practice reviews. Each one teaches a different thing to look for. They open in order.</p>
      </div>
      <BitSays
        pose={cleared === 3 ? "cheer" : "wave"} size={80}
        lines={[
          cleared === 3 ? "You cleared every level! Come back any time to beat your best score." : cleared ? `${cleared} of 3 cleared. On to the next one!` : "Welcome to the Training Grounds! Start with level 1. Each level is a short piece of C code to review.",
          "Real reviews use the same rubric and comments, so this is exactly how it works for real.",
          "Your score here is private and earns no XP. Mistakes are free!",
        ]}
      />
      <ol className="relative grid gap-4">
        <span aria-hidden className="absolute top-8 bottom-8 left-[2.15rem] border-l-4 border-dashed border-line" />
        {LEVELS.map((l) => {
          const open = isUnlocked(progress, l.n);
          const best = progress[String(l.n) as "1"];
          const done = best !== undefined;
          const body = (
            <>
              <span className={`font-pixel relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 text-3xl ${done ? "border-gold-deep bg-gold-bright text-[#2b1d00]" : open ? "border-brand bg-surface text-brand" : "border-line bg-sunken text-muted"}`}>
                {open ? l.n : <LockIcon />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-xl font-extrabold">{l.title}</span>
                  <span className="text-sm font-bold text-muted">{l.tag}</span>
                </span>
                <span className="block text-muted">{open ? l.goal : `Finish level ${l.n - 1} to open this.`}</span>
              </span>
              {done ? (
                <span className="flex shrink-0 flex-col items-end gap-1" aria-label={`Best: ${best} of ${l.findings.length} found`}>
                  <span className="flex gap-1">{l.findings.map((f, i) => <Gem key={f.key} on={i < best} />)}</span>
                  <span className="text-sm font-bold text-ok">Cleared</span>
                </span>
              ) : open ? (
                <span className="btn-primary shrink-0">Start</span>
              ) : null}
            </>
          );
          return (
            <li key={l.n} className="min-w-0">
              {open ? (
                <Link href={`/training/${l.n}`} className={`panel flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${done ? "border-gold" : ""}`}>{body}</Link>
              ) : (
                <div className="panel flex items-center gap-4 p-4 opacity-70" aria-disabled="true">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Gem({ on }: { on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path d="M10 1 L19 8 L10 19 L1 8 Z" fill={on ? "var(--gold-bright)" : "var(--line)"} stroke={on ? "var(--gold-deep)" : "var(--edge)"} strokeWidth="1.4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
