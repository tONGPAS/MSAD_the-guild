import Link from "next/link";
import type { ChallengeView } from "@/modules/challenges/service";
import { KIND_LABEL, METRICS } from "@/modules/challenges/templates";

const KIND_STYLE = {
  GOAL: "bg-brand-soft text-brand",
  CODING: "bg-rare-soft text-rare",
  REVIEW: "bg-epic-soft text-epic",
} as const;

export function timeLeft(ms: number) {
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "Less than an hour left";
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} left`;
  return `${Math.floor(h / 24)} days left`;
}

export function ProgressBar({ value, max, gold }: { value: number; max: number; gold?: boolean }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="relative h-3 overflow-hidden rounded-full border-2 border-line bg-sunken" role="progressbar" aria-valuenow={Math.min(value, max)} aria-valuemin={0} aria-valuemax={max}>
      <div className={`xp-fill h-full ${gold ? "bg-gold-bright" : "bg-brand"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

//One challenge as a quest-log card. href decides where it opens (student or Guild Master view).
export function ChallengeCard({ c, href, faculty }: { c: ChallengeView; href: string; faculty?: boolean }) {
  const done = !!c.entry?.completedAt || (c.scope === "GUILD" && !!c.rewardedAt);
  const target = c.target ?? 0;
  const guild = c.scope === "GUILD";
  return (
    <Link href={href} className={`panel group flex min-w-0 flex-col gap-2 p-4 transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${done ? "border-gold" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-full px-2 py-0.5 font-bold ${KIND_STYLE[c.kind]}`}>{guild ? "Guild goal" : KIND_LABEL[c.kind]}</span>
        <span className="text-muted">{c.state === "active" ? timeLeft(c.msLeft) : c.state === "ended" ? "Ended" : "Starts soon"}</span>
        <span className="font-pixel ml-auto text-lg text-gold">+{c.xpReward} XP</span>
      </div>
      <p className="font-display text-xl leading-tight font-extrabold">{c.title}</p>
      <p className="line-clamp-2 text-muted">{c.description}</p>
      {c.kind === "GOAL" && c.metric && faculty && !guild && (
        <p className="mt-auto pt-1 text-sm font-bold">{METRICS[c.metric].label}: {target} to finish · {c.entries} {c.entries === 1 ? "student has" : "students have"} finished</p>
      )}
      {c.kind === "GOAL" && c.metric && !(faculty && !guild) && (
        <div className="mt-auto pt-1">
          <div className="mb-1 flex justify-between text-sm">
            <span>{METRICS[c.metric].label}{guild ? " (whole Guild)" : ""}</span>
            <span className="font-pixel text-base">{Math.min(guild ? c.guildTotal : c.mine, target)}/{target}</span>
          </div>
          <ProgressBar value={guild ? c.guildTotal : faculty ? 0 : c.mine} max={target} gold={done} />
          {guild && !faculty && <p className="mt-1 text-sm text-muted">{`You've added ${c.mine}. ${c.mine > 0 ? "You're in for the reward." : "Add one to share the reward."}`}</p>}
        </div>
      )}
      {c.kind !== "GOAL" && (
        <p className="mt-auto pt-1 text-sm font-bold">
          {faculty
            ? `${c.entries} ${c.entries === 1 ? "entry" : "entries"}`
            : done
              ? "Completed"
              : c.entry
                ? "Solution submitted, waiting for its review"
                : c.state === "active"
                  ? c.kind === "CODING" ? "Write a solution and submit it as a quest" : "Review the code"
                  : "Not taken"}
        </p>
      )}
      {done && !faculty && <p className="text-sm font-bold text-ok">✓ Done, +{c.xpReward} XP earned</p>}
    </Link>
  );
}
