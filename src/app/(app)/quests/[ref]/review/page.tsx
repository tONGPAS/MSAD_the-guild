import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { getQuestForViewer } from "@/modules/quests/service";
import { attachmentUrl } from "@/modules/quests/storage";
import { DifficultyTag } from "@/components/badges";
import { CodeView } from "@/components/code-view";
import { formatRef } from "@/lib/rules";
import { ReviewForm } from "./form";

export const metadata: Metadata = { title: "Review" };

//SC-05, UC-05
export default async function ReviewPage({ params }: PageProps<"/quests/[ref]/review">) {
  const user = await requireUser({ role: "STUDENT" });
  const refNo = Number((await params).ref);
  if (!Number.isInteger(refNo)) notFound();
  const view = await getQuestForViewer(refNo, user);
  if (!view || !view.isReviewer) notFound();
  const q = view.quest;
  if (q.status !== "IN_REVIEW") redirect(`/quests/${q.refNo}`);
  const image = q.attachmentRef ? await attachmentUrl(q.attachmentRef) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/quests" className="text-sm text-muted underline">Back to my quests</Link>
        <p className="mt-3 font-mono text-sm text-muted">{formatRef(q.refNo)}</p>
        <h1 className="text-3xl font-bold">Review: {q.title}</h1>
        <div className="mt-2 flex gap-4 text-sm text-muted">
          <DifficultyTag level={q.difficulty} />
          <span>by {q.submitter.name}</span>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <CodeView link={q.link} prTitle={q.prTitle} prSize={q.prSize} snippet={q.snippet} image={image} />
        <ReviewForm questId={q.id} />
      </div>
    </div>
  );
}
