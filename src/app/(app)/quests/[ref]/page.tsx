import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { getQuestForViewer } from "@/modules/quests/service";
import { attachmentUrl } from "@/modules/quests/storage";
import { rateReview, replyToIssue, resolveQuest } from "@/modules/reviews/actions";
import { DifficultyTag, StatusTag } from "@/components/badges";
import { CodeView } from "@/components/code-view";
import { SubmitButton } from "@/components/submit-button";
import { FAST_RESOLVE_HOURS, formatRef } from "@/lib/rules";
import { ago, stamp } from "@/lib/time";

export const metadata: Metadata = { title: "Quest" };

const CRITERIA = [
  ["readability", "Readability"],
  ["correctness", "Correctness"],
  ["structure", "Structure"],
] as const;

//SC-06, FR-22 to FR-26
export default async function QuestPage({ params, searchParams }: PageProps<"/quests/[ref]">) {
  const user = await requireUser();
  const refNo = Number((await params).ref);
  const sp = await searchParams;
  if (!Number.isInteger(refNo)) notFound();
  const view = await getQuestForViewer(refNo, user);
  //Same response for "missing" and "not yours", so quest numbers cannot be probed (NFR-13)
  if (!view) notFound();
  const { quest: q, isSubmitter, isReviewer } = view;
  const image = q.attachmentRef ? await attachmentUrl(q.attachmentRef) : null;

  return (
    <div className="space-y-8">
      {sp.submitted && (
        <p role="status" className="rounded-md bg-ok-soft p-4 text-ok">
          Quest submitted. {q.reviewer ? <>{q.reviewer.name} has been assigned to review it.</> : <>No reviewer is free yet, so it will be assigned as soon as one joins.</>} You earned 10 XP.
        </p>
      )}
      {sp.reviewed && <p role="status" className="rounded-md bg-ok-soft p-4 text-ok">Review sent. You earned 25 XP.</p>}

      <header>
        <p className="font-mono text-sm text-muted">{formatRef(q.refNo)}</p>
        <h1 className="mb-3 text-3xl font-bold">{q.title}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <StatusTag status={q.status} />
          <DifficultyTag level={q.difficulty} />
          <span className="text-muted">Submitted by {isSubmitter ? "you" : q.submitter.name}, {ago(q.createdAt)}</span>
          <span className="text-muted">Reviewer: {q.reviewer ? (isReviewer ? "you" : q.reviewer.name) : "not assigned yet"}</span>
        </div>
      </header>

      {isReviewer && q.status === "IN_REVIEW" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warn/40 bg-warn-soft p-4">
          <p className="text-warn"><strong>This quest is waiting for your review.</strong></p>
          <Link href={`/quests/${q.refNo}/review`} className="btn-primary">Write your review</Link>
        </div>
      )}

      <section aria-labelledby="code">
        <h2 id="code" className="mb-3 text-xl font-bold">Code</h2>
        <CodeView link={q.link} prTitle={q.prTitle} prSize={q.prSize} snippet={q.snippet} image={image} />
      </section>

      {q.reviews.map((r) => (
        <section key={r.id} aria-labelledby={`rev-${r.id}`} className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`rev-${r.id}`} className="text-xl font-bold">
              Review by {r.reviewer.id === user.id ? "you" : r.reviewer.name}
              {r.isMentor && <span className="ml-2 text-base font-normal text-muted">(faculty mentor)</span>}
            </h2>
            <span className="text-sm text-muted">{stamp(r.createdAt)}</span>
          </div>

          <dl className="grid grid-cols-3 gap-3">
            {CRITERIA.map(([k, label]) => (
              <div key={k} className="panel p-4">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="font-display text-2xl font-bold">{r[k]}<span className="text-base text-muted">/5</span></dd>
              </div>
            ))}
          </dl>

          <ul className="space-y-3">
            {r.comments.filter((c) => c.kind !== "REPLY").map((c) => {
              const replies = r.comments.filter((x) => x.parentId === c.id);
              return (
                <li key={c.id} className={`rounded-lg border-l-4 bg-surface p-4 ${c.kind === "ISSUE" ? "border-danger" : "border-ok"}`}>
                  <p className={`mb-1 text-sm font-bold ${c.kind === "ISSUE" ? "text-danger" : "text-ok"}`}>{c.kind === "ISSUE" ? "Issue" : "Praise"}</p>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                  {replies.map((rep) => (
                    <div key={rep.id} className="mt-3 border-l-2 border-line pl-3">
                      <p className="text-sm text-muted">{rep.authorId === user.id ? "You" : rep.author.name} replied</p>
                      <p className="whitespace-pre-wrap">{rep.body}</p>
                    </div>
                  ))}
                  {isSubmitter && c.kind === "ISSUE" && (
                    <form action={replyToIssue.bind(null, q.id, c.id)} className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <label htmlFor={`reply-${c.id}`} className="sr-only">Reply to this issue</label>
                      <input id={`reply-${c.id}`} name="body" required maxLength={2000} placeholder="Reply, e.g. fixed in the next commit" className="field" />
                      <SubmitButton pending="Sending..." className="btn-ghost shrink-0">Reply</SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>

          {isSubmitter && (
            <div className="panel flex flex-wrap items-center gap-3 p-4">
              {r.helpful === null ? (
                <>
                  <span className="font-bold">Was this review helpful?</span>
                  <form action={rateReview.bind(null, q.id, r.id, true)}><button className="btn-ghost">Helpful</button></form>
                  <form action={rateReview.bind(null, q.id, r.id, false)}><button className="btn-ghost">Not helpful</button></form>
                </>
              ) : (
                <span className="text-muted">You rated this review {r.helpful ? "helpful" : "not helpful"}.</span>
              )}
            </div>
          )}
        </section>
      ))}

      {isSubmitter && q.status === "COMPLETED" && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft p-5">
          <div>
            <p className="font-bold">Done with this feedback?</p>
            <p className="text-sm text-muted">Resolve within {FAST_RESOLVE_HOURS} hours of the review for a 10 XP bonus.</p>
          </div>
          <form action={resolveQuest.bind(null, q.id)}>
            <SubmitButton pending="Resolving...">Mark resolved</SubmitButton>
          </form>
        </section>
      )}

      <section aria-labelledby="history">
        <h2 id="history" className="mb-3 text-xl font-bold">History</h2>
        <ol className="panel divide-y divide-line text-sm">
          {q.statusLogs.map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between gap-2 px-4 py-2">
              <span>
                {s.fromStatus ? <>Moved to <strong>{label(s.toStatus)}</strong></> : <>Quest created</>}
                {s.changer ? <> by {s.changedBy === user.id ? "you" : s.changer.name}</> : <> automatically</>}
              </span>
              <span className="text-muted">{stamp(s.changedAt)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function label(s: string) {
  return { PENDING: "Pending", IN_REVIEW: "In Review", COMPLETED: "Completed", RESOLVED: "Resolved" }[s] ?? s;
}
