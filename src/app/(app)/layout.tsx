import Link from "next/link";
import { signOut } from "@/modules/auth/actions";
import { requireUser } from "@/modules/auth/session";
import { unreadCount } from "@/modules/notifications/service";
import { RankSeal } from "@/components/rank-seal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await unreadCount(user.id);
  const nav =
    user.role === "STUDENT"
      ? [
          { href: "/quests", label: "My quests" },
          { href: "/quests/new", label: "New quest" },
        ]
      : [
          { href: "/faculty/quests", label: "All quests" },
          { href: "/faculty/users", label: "Members" },
        ];

  return (
    <>
      <header className="bg-brand text-brand-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/" className="font-display text-xl font-bold">The Guild</Link>
          <nav aria-label="Main" className="flex flex-wrap gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 font-bold hover:bg-white/15">{n.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            {/*EI-02: unread count on every signed-in page*/}
            <Link href="/notifications" className="relative rounded-md px-3 py-2 font-bold hover:bg-white/15" aria-label={`Notifications, ${unread} unread`}>
              <svg aria-hidden viewBox="0 0 24 24" className="inline h-5 w-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span className="hidden sm:inline">Notifications</span>
              {unread > 0 && (
                <span className="ml-1.5 inline-block min-w-6 rounded-full bg-gold px-1.5 text-center text-sm text-ink">{unread}</span>
              )}
            </Link>
            {user.role === "STUDENT" ? (
              <Link href="/profile" className="rounded-md px-2 py-1 hover:bg-white/15"><RankSeal xp={user.xpTotal} size={40} /></Link>
            ) : (
              <span className="text-sm opacity-90">{user.name}, Guild Master</span>
            )}
            <form action={signOut}>
              <button type="submit" className="whitespace-nowrap rounded-md px-2 py-2 text-sm underline-offset-4 hover:underline">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
