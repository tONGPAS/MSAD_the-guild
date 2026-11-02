import Link from "next/link";
import type { QuestStatus } from "@/db/schema";
import { formatRef } from "@/lib/rules";
import { ago } from "@/lib/time";
import { Gem, RARITY, StatusTag, type Difficulty } from "./badges";

export type QuestRow = {
  id: string;
  refNo: number;
  title: string;
  difficulty: Difficulty;
  status: QuestStatus;
  createdAt: Date;
  assignedAt: Date | null;
  prSize: number | null;
  submitter?: string;
};

//A quest as a loot card: the gem says how hard, the left gutter takes the rarity colour on hover
export function QuestRows({ rows, empty, href = (r) => `/quests/${r.refNo}` }: { rows: QuestRow[]; empty: React.ReactNode; href?: (r: QuestRow) => string }) {
  if (rows.length === 0) return <div className="panel p-6 text-muted">{empty}</div>;
  return (
    <ul className="grid gap-2">
      {rows.map((r) => {
        const rar = RARITY[r.difficulty];
        return (
          <li key={r.id} className="min-w-0">
            <Link
              href={href(r)}
              className="panel group flex items-center gap-3 px-3 py-3 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${rar.soft}`}>
                <Gem level={r.difficulty} size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold group-hover:underline">{r.title}</span>
                <span className="flex flex-wrap gap-x-3 text-sm text-muted">
                  <span className="font-mono">{formatRef(r.refNo)}</span>
                  <span className={`font-bold ${rar.text}`}>{rar.rarity}</span>
                  {r.submitter && <span>{r.submitter}</span>}
                  <span>{ago(r.createdAt)}</span>
                </span>
              </span>
              <StatusTag status={r.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
