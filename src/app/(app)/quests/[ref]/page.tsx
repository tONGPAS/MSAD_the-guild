import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { getQuestForViewer } from "@/modules/quests/service";
import { attachmentUrl } from "@/modules/quests/storage";
import { getChallenge } from "@/modules/challenges/service";
import { giveCoin, rateReview, replyToIssue, resolveQuest } from "@/modules/reviews/actions";
import { DifficultyTag, StatusTag } from "@/components/badges";
import { CodeView } from "@/components/code-view";
import { QuestBrief } from "@/components/quest-brief";
import { RewardBurst } from "@/components/reward-burst";
import { db } from "@/db";
import { justEarnedBadges } from "@/modules/progression/badges";
import { Coin, CommentIcon, ScorePips } from "@/components/comment-icon";
import { Crest } from "@/components/crest";
import { CrownEmblem } from "@/components/rank-seal";
import { SubmitButton } from "@/components/submit-button";
import { FAST_RESOLVE_HOURS, formatRef, isStale, SUBMIT_XP_DAILY_CAP, XP } from "@/lib/rules";
import { ago, stamp } from "@/lib/time";
import { MentorRequestForm } from "./mentor-form";

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
  const { quest: q, isSubmitter, isReviewer, isFaculty } = view;
  const image = q.attachmentRef ? await attachmentUrl(q.attachmentRef) : null;
  const challenge = q.challengeId ? await getChallenge(q.challengeId) : null;
  const openMentor = q.mentorRequests.find((m) => m.status !== "RESOLVED");
  const earned = sp.submitted || sp.reviewed || sp.resolved ? await justEarnedBadges(db, user.id) : [];
  const stale = isStale(q.status, q.assignedAt);
  const history = [
    ...q.statusLogs.map((s) => ({
      id: s.id,
      at: s.changedAt,
      text: (
        <>
          {s.fromStatus ? <>Moved to <strong>{label(s.toStatus)}</strong></> : <>Quest created</>}
          {s.changer ? <> by {s.changedBy === user.id ? "you" : s.changer.name}</> : <> automatically</>}
        </>
      ),
    })),
    ...q.reassignments.map((r) => ({
      id: r.id,
      at: r.createdAt,
      text: r.reason === "CLAIMED"
        ? <>Claimed by {r.to.name} from {r.from.name} after it went stale</>
        : <>Reassigned from {r.from.name} to {r.to.name}: review was 7 days overdue</>,
    })),
    ...q.mentorRequests.map((m) => ({ id: `${m.id}-c`, at: m.createdAt, text: <>Mentor review requested</> })),
    ...q.mentorRequests
      .filter((m) => m.resolvedAt)
      .map((m) => ({ id: `${m.id}-r`, at: m.resolvedAt!, text: <>Mentor review done by {m.handler?.name ?? "faculty"}</> })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <div className="space-y-8">
      {sp.submitted && (
        <RewardBurst
          title="Quest submitted!"
          xpGained={sp.submitted === "nox" ? 0 : XP.SUBMIT_QUEST}
          xpAfter={user.xpTotal}
          badges={earned}
          summoned={q.reviewer ? { id: q.reviewer.id, name: q.reviewer.name } : undefined}
          message={
            <>
              {q.reviewer ? "A classmate has been picked to review it." : "No reviewer is free yet; one is picked as soon as a classmate joins."}{" "}
              {sp.submitted === "nox" && <>You already earned quest XP {SUBMIT_XP_DAILY_CAP} times today.</>}
            </>
          }
        />
      )}
      {sp.reviewed && (
        <RewardBurst title="Review delivered!" message="Your classmate has been notified. Thanks for helping them level up." xpGained={XP.COMPLETE_REVIEW} xpAfter={user.xpTotal} badges={earned} />
      )}
      {sp.resolved && (
        <RewardBurst
          title="Quest complete!"
          message={sp.resolved === "fast" ? `Resolved within ${FAST_RESOLVE_HOURS} hours, so you earned the quick-finish bonus.` : "Feedback received and closed."}
          xpGained={sp.resolved === "fast" ? XP.RESOLVE_FAST : 0}
          xpAfter={user.xpTotal}
          badges={earned}
        />
      )}
      {sp.mentored && <p role="status" className="rounded-md bg-ok-soft p-4 text-ok">Mentor review saved. The student has been notified.</p>}

      <header>
        <p className="font-mono text-sm text-muted">{formatRef(q.refNo)}</p>
        {challenge && (
          <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-rare-soft px-2.5 py-0.5 text-sm font-bold text-rare">Answer to the challenge: {challenge.title}</p>
        )}
        <h1 className="mb-3 text-3xl font-extrabold">{q.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <StatusTag status={q.status} />
          <DifficultyTag level={q.difficulty} />
          {stale && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-sm font-bold text-danger">Stale, over 72 h</span>}
        </div>
        {/*The two people this quest is about, face to face*/}
        <div className="panel mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
          <Person id={q.submitter.id} name={q.submitter.name} label={isSubmitter ? "You" : q.submitter.name} role={`Submitted ${ago(q.createdAt)}`} />
          <svg width="40" height="16" viewBox="0 0 40 16" aria-hidden className="text-muted">
            <path d="M2 8 H34 M28 2 L36 8 L28 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={q.reviewer ? undefined : "4 4"} />
          </svg>
          {q.reviewer
            ? <Person id={q.reviewer.id} name={q.reviewer.name} label={isReviewer ? "You" : q.reviewer.name} role="Reviewer" />
            : <span className="text-sm text-muted">Waiting for a reviewer to join</span>}
        </div>
      </header>

      {openMentor && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold bg-gold-soft p-4">
          <p>
            {openMentor.status === "PENDING"
              ? <><strong>Mentor review requested.</strong> Waiting for a faculty member to pick it up.</>
              : <><strong>{openMentor.handler?.id === user.id ? "You are" : `${openMentor.handler?.name} is`} doing a mentor review.</strong></>}
          </p>
          {isFaculty && openMentor.status === "PENDING" && <Link href="/faculty/mentor" className="btn-primary">Open mentor requests</Link>}
          {isFaculty && openMentor.status === "IN_PROGRESS" && openMentor.handler?.id === user.id && (
            <Link href={`/faculty/mentor/${openMentor.id}`} className="btn-primary">Continue mentor review</Link>
          )}
        </div>
      )}

      {isReviewer && q.status === "IN_REVIEW" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warn/40 bg-warn-soft p-4">
          <p className="text-warn"><strong>This quest is waiting for your review.</strong></p>
          <Link href={`/quests/${q.refNo}/review`} className="btn-primary">Write your review</Link>
        </div>
      )}

      <section aria-labelledby="code">
        <h2 id="code" className="mb-3 text-xl font-bold">Code</h2>
        <div className="mb-4"><QuestBrief context={q.context} notes={q.notes} by={isSubmitter ? "you" : q.submitter.name} /></div>
        <CodeView link={q.link} prTitle={q.prTitle} prSize={q.prSize} snippet={q.snippet} image={image} language={q.language} />
      </section>

      {q.reviews.map((r) => (
        <section key={r.id} aria-labelledby={`rev-${r.id}`} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id={`rev-${r.id}`} className="flex items-center gap-3 text-xl font-bold">
              <Crest id={r.reviewer.id} name={r.reviewer.name} size={34} ring={r.isMentor} />
              <span>
                Review by {r.reviewer.id === user.id ? "you" : r.reviewer.name}
                {r.isMentor && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 align-middle text-sm font-bold text-gold">
                    <CrownEmblem size={16} /> Faculty mentor
                  </span>
                )}
              </span>
            </h2>
            <span className="text-sm text-muted">{stamp(r.createdAt)}</span>
          </div>

          <dl className="grid grid-cols-3 gap-3">
            {CRITERIA.map(([k, label]) => (
              <div key={k} className="panel p-4">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-1"><ScorePips value={r[k]} /></dd>
              </div>
            ))}
          </dl>

          <ul className="space-y-3">
            {r.comments.filter((c) => c.kind !== "REPLY").map((c) => {
              const replies = r.comments.filter((x) => x.parentId === c.id);
              return (
                <li key={c.id} className={`panel p-4 ${c.kind === "ISSUE" ? "border-danger/40" : "border-gold/50"}`}>
                  <p className={`mb-1 flex items-center gap-1.5 text-sm font-bold ${c.kind === "ISSUE" ? "text-danger" : "text-gold"}`}>
                    <CommentIcon kind={c.kind as "ISSUE" | "PRAISE"} />
                    {c.kind === "ISSUE" ? "Issue" : "Praise"}
                  </p>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                  {r.coinCommentId === c.id && (
                    <p className="anim-pop mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-0.5 text-sm font-bold text-gold"><Coin /> Thanked with a coin</p>
                  )}
                  {isSubmitter && !r.isMentor && !r.coinCommentId && c.authorId === r.reviewer.id && (
                    <form action={giveCoin.bind(null, q.id, r.id, c.id)} className="mt-2">
                      <button className="inline-flex items-center gap-1.5 rounded-full border-2 border-gold/60 px-2.5 py-0.5 text-sm font-bold text-gold hover:bg-gold-soft" title="Give one coin per review to the comment that helped most. The reviewer earns 5 XP.">
                        <Coin size={16} /> Give a coin
                      </button>
                    </form>
                  )}
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

      {isSubmitter && !openMentor && (q.status === "IN_REVIEW" || q.status === "COMPLETED") && <MentorRequestForm questId={q.id} />}

      {isSubmitter && q.status === "COMPLETED" && !openMentor && (
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
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap justify-between gap-2 px-4 py-2">
              <span>{h.text}</span>
              <span className="text-muted">{stamp(h.at)}</span>
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

function Person({ id, name, label, role }: { id: string; name: string; label: string; role: string }) {
  return (
    <span className="flex items-center gap-2">
      <Crest id={id} name={name} size={34} />
      <span className="leading-tight">
        <span className="block font-bold">{label}</span>
        <span className="block text-xs text-muted">{role}</span>
      </span>
    </span>
  );
}
