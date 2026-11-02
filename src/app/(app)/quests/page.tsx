import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { myAssignments, myQuests } from "@/modules/quests/service";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { userBadges, users } from "@/db/schema";
import { submissionsPaidToday } from "@/modules/progression/service";
import { AdventurerCard } from "@/components/adventurer-card";
import { QuestRows } from "@/components/quest-rows";

export const metadata: Metadata = { title: "My quests" };

//SC-04, FR-16, FR-17
export default async function QuestsPage() {
  const user = await requireUser({ role: "STUDENT" });
  const [mine, assigned, paidToday, [me], [badges]] = await Promise.all([
    myQuests(user.id),
    myAssignments(user.id),
    submissionsPaidToday(db, user.id),
    db.select({ streak: users.streak }).from(users).where(eq(users.id, user.id)),
    db.select({ n: count() }).from(userBadges).where(eq(userBadges.userId, user.id)),
  ]);
  const open = assigned.filter((q) => q.status === "IN_REVIEW");
  const done = assigned.filter((q) => q.status !== "IN_REVIEW");

  return (
    <div className="space-y-10">
      <h1 className="sr-only">My quests</h1>
      <AdventurerCard
        id={user.id} name={user.name} xp={user.xpTotal} streak={me?.streak ?? 0}
        badges={badges?.n ?? 0} paidToday={paidToday} toReview={open.length}
      />
      <section aria-labelledby="todo">
        <h2 id="todo" className="mb-1 text-2xl font-bold">Waiting for your review</h2>
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
