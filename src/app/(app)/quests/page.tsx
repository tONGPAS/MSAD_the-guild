import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { myAssignments, myQuests } from "@/modules/quests/service";
import { QuestRows } from "@/components/quest-rows";

export const metadata: Metadata = { title: "My quests" };

//SC-04, FR-16, FR-17
export default async function QuestsPage() {
  const user = await requireUser({ role: "STUDENT" });
  const [mine, assigned] = await Promise.all([myQuests(user.id), myAssignments(user.id)]);
  const open = assigned.filter((q) => q.status === "IN_REVIEW");
  const done = assigned.filter((q) => q.status !== "IN_REVIEW");

  return (
    <div className="space-y-10">
      <section aria-labelledby="todo">
        <h1 id="todo" className="mb-1 text-3xl font-bold">Waiting for your review</h1>
        <p className="mb-4 text-muted">Quests the Guild assigned to you. Your classmates are waiting on these.</p>
        <QuestRows rows={open} href={(r) => `/quests/${r.refNo}/review`} empty="Nothing to review right now. New quests are handed out in turn, so yours will come." />
      </section>

      <section aria-labelledby="mine">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="mine" className="text-2xl font-bold">Your quests</h2>
            <p className="text-muted">Code you submitted for feedback.</p>
          </div>
          <Link href="/quests/new" className="btn-primary">Submit a quest</Link>
        </div>
        <QuestRows rows={mine} empty="You have not submitted any code yet. Submit a pull request link or a snippet to get a reviewer." />
      </section>

      {done.length > 0 && (
        <section aria-labelledby="done">
          <h2 id="done" className="mb-4 text-2xl font-bold">Reviews you have done</h2>
          <QuestRows rows={done} empty="" />
        </section>
      )}
    </div>
  );
}
