import { Pip } from "@/components/pip";
import { PIP } from "@/lib/pip-lines";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { claimQuest } from "@/modules/quests/actions";
import { questBoard } from "@/modules/quests/service";
import { DifficultyTag, StatusTag } from "@/components/badges";
import { SubmitButton } from "@/components/submit-button";
import { formatRef, STALE_HOURS } from "@/lib/rules";
import { ago } from "@/lib/time";

export const metadata: Metadata = { title: "Quest Board" };

//SC-07, FR-32 to FR-34. Titles only: code stays with the people taking part (BRL-10).
export default async function QuestBoardPage({ searchParams }: PageProps<"/board">) {
  const user = await requireUser();
  const sp = await searchParams;
  const rows = await questBoard();
  const staleCount = rows.filter((r) => r.stale).length;

  return (
    <>
      <h1 className="mb-1 text-3xl font-bold">Quest Board</h1>
      <p className="mb-6 max-w-2xl text-muted">
        Every quest still waiting on feedback. A quest goes <strong>Stale</strong> after {STALE_HOURS} hours in review without one,
        and then any classmate can claim it so the submitter isn&apos;t left waiting.
      </p>
      {sp.claim === "gone" && (
        <p role="status" className="mb-4 rounded-md bg-warn-soft p-4 text-warn">That quest was reviewed or claimed by someone else just now.</p>
      )}
      <p className="mb-3 text-sm text-muted">{rows.length} open, {staleCount} stale</p>
      {rows.length === 0 ? (
        <div className="panel p-5"><Pip lines={[...PIP.boardEmpty]} pose="sleep" size={64} /></div>
      ) : (
        <ul className="panel divide-y divide-line">
          {rows.map((r) => {
            const stale = r.stale;
            const mine = r.submitterId === user.id;
            const assignedToMe = r.reviewerId === user.id;
            const canClaim = stale && user.role === "STUDENT" && !mine && !assignedToMe;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <span className="w-24 shrink-0 font-mono text-sm text-muted">{formatRef(r.refNo)}</span>
                <span className="min-w-0 flex-1 basis-48">
                  <span className="block font-bold">{r.title}</span>
                  {(mine || assignedToMe) && <span className="text-sm text-muted">{mine ? "Your quest" : "Assigned to you"}</span>}
                </span>
                <DifficultyTag level={r.difficulty} />
                {r.prSize !== null && <span className="text-sm text-muted">{r.prSize} lines</span>}
                <span className="w-28 text-sm text-muted">{ago(r.createdAt)}</span>
                <StatusTag status={r.status} />
                {stale && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-sm font-bold text-danger">Stale</span>}
                {canClaim && (
                  <form action={claimQuest.bind(null, r.id)}>
                    <SubmitButton pending="Claiming..." className="btn-ghost">Claim and review</SubmitButton>
                  </form>
                )}
                {assignedToMe && r.status === "IN_REVIEW" && (
                  <Link href={`/quests/${r.refNo}/review`} className="btn-primary">Review it</Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
