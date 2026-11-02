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
import { BitSays } from "@/components/bit-says";
import { BIT } from "@/lib/bit-lines";

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
      <div data-tour="card">
      <AdventurerCard
        id={user.id} name={user.name} xp={user.xpTotal} streak={me?.streak ?? 0}
        badges={badges?.n ?? 0} paidToday={paidToday} toReview={open.length}
      />
      </div>
      <BitSays lines={[...BIT.studentTips]} pose="idle" size={72} />
      <section aria-labelledby="todo" data-tour="todo">
        <h2 id="todo" className="mb-1 text-2xl font-bold">Waiting for your review</h2>
        <p className="mb-4 text-muted">Quests the Guild assigned to you. Your classmates are waiting on these. {!user.trainingDone && <Link href="/training" className="font-bold text-brand underline">Practice first in the Training Grounds.</Link>}</p>
        <QuestRows rows={open} href={(r) => `/quests/${r.refNo}/review`} empty={<BitSays lines={[...BIT.noReviews]} pose="sleep" size={64} />} />
      </section>

      <section aria-labelledby="mine">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="mine" className="text-2xl font-bold">Your quests</h2>
            <p className="text-muted">Code you submitted for feedback.</p>
          </div>
          <Link href="/quests/new" data-tour="submit" className="btn-primary">Submit a quest</Link>
        </div>
        <QuestRows rows={mine} empty={<BitSays lines={[...BIT.noQuests]} pose="cheer" size={64} />} />
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
