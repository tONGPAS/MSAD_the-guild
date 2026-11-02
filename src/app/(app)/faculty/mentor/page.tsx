import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { pickUpRequest } from "@/modules/mentor/actions";
import { myOpenRequests, myResolvedRequests, pendingRequests } from "@/modules/mentor/service";
import { DifficultyTag } from "@/components/badges";
import { SubmitButton } from "@/components/submit-button";
import { formatRef } from "@/lib/rules";
import { ago } from "@/lib/time";

export const metadata: Metadata = { title: "Mentor requests" };

//SC-09, FR-37, FR-38
export default async function MentorRequestsPage({ searchParams }: PageProps<"/faculty/mentor">) {
  const me = await requireUser({ role: "FACULTY" });
  const sp = await searchParams;
  const [pending, mine, done] = await Promise.all([pendingRequests(), myOpenRequests(me.id), myResolvedRequests(me.id)]);

  return (
    <div className="space-y-10">
      {sp.taken && (
        <p role="status" className="rounded-md bg-warn-soft p-4 text-warn">Another faculty member picked that request up first. It is no longer in your list.</p>
      )}

      {mine.length > 0 && (
        <section aria-labelledby="mine">
          <h2 id="mine" className="mb-3 text-2xl font-bold">Your open reviews</h2>
          <ul className="panel divide-y divide-line">
            {mine.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <span className="w-24 font-mono text-sm text-muted">{formatRef(r.refNo)}</span>
                <span className="min-w-0 flex-1 basis-48 font-bold">{r.title}</span>
                <span className="text-sm text-muted">{r.submitter}</span>
                <Link href={`/faculty/mentor/${r.id}`} className="btn-primary">Continue review</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="pending">
        <h1 id="pending" className="mb-1 text-3xl font-bold">Mentor requests</h1>
        <p className="mb-4 text-muted">Students ask for a faculty review when a peer review was not enough. Oldest first. Picking one up hides it from other faculty.</p>
        {pending.length === 0 ? (
          <p className="panel p-6 text-muted">No requests waiting. You will get a notification when a student asks for a mentor.</p>
        ) : (
          <ul className="panel divide-y divide-line">
            {pending.map((r) => (
              <li key={r.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-mono text-sm text-muted">{formatRef(r.refNo)}</span>
                    <span className="font-bold">{r.title}</span>
                    <DifficultyTag level={r.difficulty} />
                  </p>
                  <p className="text-sm text-muted">{r.submitter}, asked {ago(r.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words">&ldquo;{r.reason}&rdquo;</p>
                </div>
                <form action={pickUpRequest.bind(null, r.id)}>
                  <SubmitButton pending="Picking up...">Pick up</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section aria-labelledby="done">
          <h2 id="done" className="mb-3 text-xl font-bold">Recently resolved by you</h2>
          <ul className="panel divide-y divide-line text-sm">
            {done.map((r) => (
              <li key={r.id}>
                <Link href={`/quests/${r.refNo}`} className="flex flex-wrap gap-x-4 px-4 py-3 hover:bg-canvas">
                  <span className="w-24 font-mono text-muted">{formatRef(r.refNo)}</span>
                  <span className="flex-1 font-bold">{r.title}</span>
                  <span className="text-muted">{ago(r.resolvedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
