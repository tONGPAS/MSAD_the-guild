import type { Metadata } from "next";
import { requireUser } from "@/modules/auth/session";
import { attachmentsEnabled } from "@/modules/quests/storage";
import { NewQuestForm } from "./form";

export const metadata: Metadata = { title: "New quest" };

//SC-03
export default async function NewQuestPage() {
  await requireUser({ role: "STUDENT" });
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold">Submit a quest</h1>
      <p className="mb-6 max-w-2xl text-muted">One classmate is picked in turn to review it. You will get a notification when their feedback is in.</p>
      <NewQuestForm attachments={attachmentsEnabled()} />
    </>
  );
}
