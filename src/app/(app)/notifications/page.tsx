import type { Metadata } from "next";
import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { quests } from "@/db/schema";
import { requireUser } from "@/modules/auth/session";
import { readAllNotifications } from "@/modules/notifications/actions";
import { listNotifications } from "@/modules/notifications/service";
import { ago } from "@/lib/time";

export const metadata: Metadata = { title: "Notifications" };

//SR-04, EI-02
export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id);
  const ids = [...new Set(items.map((n) => n.relatedQuestId).filter((x): x is string => !!x))];
  const refs = ids.length
    ? new Map((await db.select({ id: quests.id, refNo: quests.refNo }).from(quests).where(inArray(quests.id, ids))).map((q) => [q.id, q.refNo]))
    : new Map<string, number>();
  const unread = items.some((n) => !n.readAt);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {unread && (
          <form action={readAllNotifications}><button className="btn-ghost">Mark all as read</button></form>
        )}
      </div>
      {items.length === 0 ? (
        <p className="panel p-6 text-muted">No notifications yet. You will see new assignments and finished reviews here.</p>
      ) : (
        <ul className="panel divide-y divide-line">
          {items.map((n) => {
            const ref = n.relatedQuestId ? refs.get(n.relatedQuestId) : undefined;
            const body = (
              <span className="flex flex-wrap items-baseline gap-x-3 px-4 py-3">
                {!n.readAt && <span className="h-2.5 w-2.5 self-center rounded-full bg-gold" aria-label="Unread" />}
                <span className={`flex-1 ${n.readAt ? "text-muted" : "font-bold"}`}>{n.message}</span>
                <span className="text-sm text-muted">{ago(n.createdAt)}</span>
              </span>
            );
            return <li key={n.id}>{ref ? <Link href={`/quests/${ref}`} className="block hover:bg-canvas">{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </>
  );
}
