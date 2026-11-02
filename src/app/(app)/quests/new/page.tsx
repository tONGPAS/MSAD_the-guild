import type { Metadata } from "next";
import { db } from "@/db";
import { SUBMIT_XP_DAILY_CAP } from "@/lib/rules";
import { requireUser } from "@/modules/auth/session";
import { submissionsPaidToday } from "@/modules/progression/service";
import { attachmentsEnabled } from "@/modules/quests/storage";
import { NewQuestForm } from "./form";

export const metadata: Metadata = { title: "New quest" };

//SC-03
export default async function NewQuestPage() {
  const user = await requireUser({ role: "STUDENT" });
  const left = Math.max(0, SUBMIT_XP_DAILY_CAP - (await submissionsPaidToday(db, user.id)));
  return (
    <>
      <h1 className="mb-1 text-3xl font-extrabold">Submit a quest</h1>
      <p className="mb-6 max-w-2xl text-muted">Share code you want feedback on. One classmate is picked in turn to review it, and you are notified when their feedback is in.</p>
      <NewQuestForm attachments={attachmentsEnabled()} xpLeftToday={left} />
    </>
  );
}
