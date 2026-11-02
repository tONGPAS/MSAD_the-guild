import type { QuestStatus } from "@/db/schema";

const STATUS: Record<QuestStatus, { label: string; cls: string; dot: string }> = {
  PENDING: { label: "Pending", cls: "bg-sunken text-muted border-line", dot: "bg-muted" },
  IN_REVIEW: { label: "In Review", cls: "bg-warn-soft text-warn border-warn/30", dot: "bg-warn animate-pulse motion-reduce:animate-none" },
  COMPLETED: { label: "Completed", cls: "bg-brand-soft text-brand border-brand/30", dot: "bg-brand" },
  RESOLVED: { label: "Resolved", cls: "bg-ok-soft text-ok border-ok/30", dot: "bg-ok" },
};

export function StatusTag({ status }: { status: QuestStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-bold ${s.cls}`}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

//Difficulty reads as loot rarity. The gem has 1 to 3 facets lit and the word is always shown,
//so the level never depends on colour alone (NFR-07).
export const RARITY = {
  EASY: { rarity: "Common", diff: "Easy", facets: 1, text: "text-common", soft: "bg-common-soft", border: "border-common", color: "var(--common)" },
  MEDIUM: { rarity: "Rare", diff: "Medium", facets: 2, text: "text-rare", soft: "bg-rare-soft", border: "border-rare", color: "var(--rare)" },
  HARD: { rarity: "Epic", diff: "Hard", facets: 3, text: "text-epic", soft: "bg-epic-soft", border: "border-epic", color: "var(--epic)" },
} as const;
export type Difficulty = keyof typeof RARITY;

export function Gem({ level, size = 18 }: { level: Difficulty; size?: number }) {
  const r = RARITY[level];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <path d="M10 1 L19 8 L10 19 L1 8 Z" fill={r.color} stroke="rgb(0 0 0 / 0.3)" strokeWidth="1" />
      <path d="M1 8 H19 M6 8 L10 1 L14 8 L10 19 Z" fill="none" stroke="rgb(255 255 255 / 0.45)" strokeWidth="1" />
      {r.facets >= 2 && <path d="M10 1 L14 8 H6 Z" fill="rgb(255 255 255 / 0.3)" />}
      {r.facets >= 3 && <path d="M6 8 L10 19 L1 8 Z" fill="rgb(255 255 255 / 0.22)" />}
    </svg>
  );
}

export function DifficultyTag({ level }: { level: Difficulty }) {
  const r = RARITY[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm font-bold ${r.soft} ${r.text}`}>
      <Gem level={level} size={14} />
      {r.rarity}
      <span className="font-normal text-muted">({r.diff})</span>
    </span>
  );
}
