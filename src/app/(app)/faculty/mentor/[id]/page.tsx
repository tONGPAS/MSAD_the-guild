import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { submitMentorReview } from "@/modules/mentor/actions";
import { getRequest } from "@/modules/mentor/service";
import { attachmentUrl } from "@/modules/quests/storage";
import { DifficultyTag, StatusTag } from "@/components/badges";
import { CodeView } from "@/components/code-view";
import { ReviewForm } from "@/components/review-form";
import { formatRef } from "@/lib/rules";

export const metadata: Metadata = { title: "Mentor review" };

//FR-39: the same rubric screen as a peer review
export default async function MentorReviewPage({ params }: PageProps<"/faculty/mentor/[id]">) {
  const me = await requireUser({ role: "FACULTY" });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const mr = await getRequest(id);
  if (!mr) notFound();
  if (mr.status === "RESOLVED") redirect(`/quests/${mr.quest.refNo}`);
  if (mr.handledBy !== me.id) redirect("/faculty/mentor");
  const q = mr.quest;
  const image = q.attachmentRef ? await attachmentUrl(q.attachmentRef) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/faculty/mentor" className="text-sm text-muted underline">Back to mentor requests</Link>
        <p className="mt-3 font-mono text-sm text-muted">{formatRef(q.refNo)}</p>
        <h1 className="text-3xl font-bold">Mentor review: {q.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
          <StatusTag status={q.status} />
          <DifficultyTag level={q.difficulty} />
          <span>by {q.submitter.name}</span>
          <Link href={`/quests/${q.refNo}`} className="underline">See the peer review so far</Link>
        </div>
        <p className="mt-4 rounded-md border border-line bg-surface p-4">
          <span className="block text-sm font-bold text-muted">What the student asked</span>
          <span className="whitespace-pre-wrap break-words">{mr.reason}</span>
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <CodeView link={q.link} prTitle={q.prTitle} prSize={q.prSize} snippet={q.snippet} image={image} />
        <ReviewForm submit={submitMentorReview.bind(null, mr.id)} />
      </div>
    </div>
  );
}
