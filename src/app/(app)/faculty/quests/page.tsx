import type { Metadata } from "next";
import { requireUser } from "@/modules/auth/session";
import { allQuests } from "@/modules/quests/service";
import { QuestRows } from "@/components/quest-rows";

export const metadata: Metadata = { title: "All quests" };

//Early FR-41. Filters, Mentor Requests, and the dashboard arrive in Release 2.
export default async function FacultyQuestsPage() {
  await requireUser({ role: "FACULTY" });
  const rows = await allQuests();
  const counts = rows.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold">All quests</h1>
      <p className="mb-6 text-muted">
        {rows.length} quests: {counts.PENDING ?? 0} pending, {counts.IN_REVIEW ?? 0} in review, {counts.COMPLETED ?? 0} completed, {counts.RESOLVED ?? 0} resolved.
      </p>
      <QuestRows rows={rows} empty="No quests yet. Invite students from Members so they can start submitting." />
    </>
  );
}
