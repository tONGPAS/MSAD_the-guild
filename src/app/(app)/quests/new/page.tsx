import type { Metadata } from "next";
import { db } from "@/db";
import { SUBMIT_XP_DAILY_CAP } from "@/lib/rules";
import { requireUser } from "@/modules/auth/session";
import { submissionsPaidToday } from "@/modules/progression/service";
import { attachmentsEnabled } from "@/modules/quests/storage";
import { canAnswerCoding } from "@/modules/challenges/service";
import { NewQuestForm } from "./form";

export const metadata: Metadata = { title: "New quest" };

//SC-03
export default async function NewQuestPage({ searchParams }: PageProps<"/quests/new">) {
  const user = await requireUser({ role: "STUDENT" });
  const cid = (await searchParams).challenge;
  const ch = typeof cid === "string" ? await canAnswerCoding(cid, user.id) : null;
  const left = Math.max(0, SUBMIT_XP_DAILY_CAP - (await submissionsPaidToday(db, user.id)));
  return (
    <>
      <h1 className="mb-1 text-3xl font-extrabold">Submit a quest</h1>
      <p className="mb-6 max-w-2xl text-muted">Share code you want feedback on. One classmate is picked in turn to review it, and you are notified when their feedback is in.</p>
      {ch && (
        <section className="panel mb-6 max-w-3xl border-rare/50 bg-rare-soft p-4">
          <p className="font-pixel text-sm text-rare">ANSWERING A CODING CHALLENGE · +{ch.xpReward} XP WHEN REVIEWED</p>
          <p className="font-display text-xl font-extrabold">{ch.title}</p>
          <p className="mt-1">{ch.description}</p>
        </section>
      )}
      <NewQuestForm attachments={attachmentsEnabled()} xpLeftToday={left} challenge={ch ? { id: ch.id, title: ch.title, language: ch.language } : null} />
    </>
  );
}
