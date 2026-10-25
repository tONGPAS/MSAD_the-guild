import type { QuestStatus } from "@/db/schema";

const STATUS: Record<QuestStatus, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "bg-canvas text-muted border-line" },
  IN_REVIEW: { label: "In Review", cls: "bg-warn-soft text-warn border-warn/30" },
  COMPLETED: { label: "Completed", cls: "bg-brand-soft text-brand border-brand/30" },
  RESOLVED: { label: "Resolved", cls: "bg-ok-soft text-ok border-ok/30" },
};

export function StatusTag({ status }: { status: QuestStatus }) {
  const s = STATUS[status];
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-sm font-bold ${s.cls}`}>{s.label}</span>;
}

const DIFF = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" } as const;
const PIPS = { EASY: 1, MEDIUM: 2, HARD: 3 } as const;

//Pips carry the level so it is not told by color alone (NFR-07)
export function DifficultyTag({ level }: { level: keyof typeof DIFF }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-2.5 w-1.5 rounded-sm ${i <= PIPS[level] ? "bg-ink" : "bg-line"}`} />
        ))}
      </span>
      {DIFF[level]}
    </span>
  );
}
