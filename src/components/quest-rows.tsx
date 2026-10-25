import Link from "next/link";
import type { QuestStatus } from "@/db/schema";
import { formatRef } from "@/lib/rules";
import { ago } from "@/lib/time";
import { DifficultyTag, StatusTag } from "./badges";

export type QuestRow = {
  id: string;
  refNo: number;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  status: QuestStatus;
  createdAt: Date;
  assignedAt: Date | null;
  prSize: number | null;
  submitter?: string;
};

export function QuestRows({ rows, empty, href = (r) => `/quests/${r.refNo}` }: { rows: QuestRow[]; empty: React.ReactNode; href?: (r: QuestRow) => string }) {
  if (rows.length === 0) return <div className="panel p-6 text-muted">{empty}</div>;
  return (
    <ul className="panel divide-y divide-line">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={href(r)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-canvas">
            <span className="w-24 shrink-0 font-mono text-sm text-muted">{formatRef(r.refNo)}</span>
            <span className="min-w-0 flex-1 basis-48 font-bold">{r.title}</span>
            {r.submitter && <span className="text-sm text-muted">{r.submitter}</span>}
            <DifficultyTag level={r.difficulty} />
            <span className="w-24 text-sm text-muted">{ago(r.createdAt)}</span>
            <StatusTag status={r.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
