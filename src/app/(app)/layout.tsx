import { Suspense } from "react";
import Link from "next/link";
import { GuideTour } from "@/components/guide-tour";
import { signOut } from "@/modules/auth/actions";
import { requireUser } from "@/modules/auth/session";
import { pendingCount } from "@/modules/mentor/service";
import { unreadCount } from "@/modules/notifications/service";
import { GuildMark } from "@/components/guild-mark";
import { NavTabs, type NavItem } from "@/components/nav-tabs";
import { CrownEmblem, GUILD_MASTER, RankEmblem, XpBar } from "@/components/rank-seal";
import { rankProgress } from "@/lib/rules";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isFaculty = user.role === "FACULTY";
  const [unread, mentorWaiting] = await Promise.all([unreadCount(user.id), isFaculty ? pendingCount() : Promise.resolve(0)]);
  const nav: NavItem[] = isFaculty
    ? [
        { href: "/faculty/quests", label: "All quests" },
        { href: "/faculty/mentor", label: "Mentor requests", count: mentorWaiting },
        { href: "/faculty/dashboard", label: "Dashboard" },
        { href: "/guild", label: "Guild Hall" },
        { href: "/faculty/users", label: "Members" },
      ]
    : [
        { href: "/quests", label: "My quests" },
        { href: "/board", label: "Quest Board" },
        { href: "/quests/new", label: "New quest" },
        { href: "/guild", label: "Guild Hall" },
      ];
  const prog = rankProgress(user.xpTotal);

  return (
    <>
      <header className="border-b-4 border-gold-bright bg-banner text-white" style={{ backgroundImage: "linear-gradient(180deg, rgb(255 255 255 / 0.06), transparent 60%)" }}>
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 pb-2">
            <Link href="/" className="flex items-center gap-2">
              <GuildMark />
              <span className="font-display text-xl font-extrabold tracking-tight">The Guild</span>
            </Link>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <Link href={`${isFaculty ? "/faculty/quests" : "/quests"}?tour=1`} className="grid h-9 w-9 place-items-center rounded-full border-2 border-white/40 font-display font-extrabold hover:bg-white/10" aria-label="Replay the guided tour" title="Replay the guided tour">?</Link>
              {/*EI-02: unread count on every signed-in page*/}
              <Link href="/notifications" data-tour="bell" className="relative rounded-lg p-2 hover:bg-white/10" aria-label={`Notifications, ${unread} unread`}>
                <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unread > 0 && (
                  <span className="font-pixel absolute -top-0.5 -right-0.5 min-w-5 rounded-full border-2 border-banner bg-gold-bright px-1 text-center text-xs text-[#2b1d00]">{unread}</span>
                )}
              </Link>

              {isFaculty ? (
                <span data-tour="hud" className="flex items-center gap-2" title={GUILD_MASTER}>
                  <CrownEmblem size={34} />
                  <span className="hidden leading-tight sm:block">
                    <span className="block text-sm font-bold">{user.name}</span>
                    <span className="block text-xs font-bold text-gold-bright">{GUILD_MASTER}</span>
                  </span>
                </span>
              ) : (
                <Link href="/profile" data-tour="hud" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/10" title={prog.next ? `${prog.toNext} XP to ${prog.next}` : "Highest rank"}>
                  <RankEmblem xp={user.xpTotal} size={32} />
                  <span className="w-24 leading-tight sm:w-40">
                    <span className="flex items-baseline justify-between gap-2 whitespace-nowrap">
                      <span className="hidden text-sm font-bold sm:inline">{prog.label}</span>
                      <span className="font-pixel text-sm text-gold-bright">{user.xpTotal} XP</span>
                    </span>
                    <XpBar xp={user.xpTotal} className="mt-1" />
                  </span>
                </Link>
              )}

              <form action={signOut}>
                <button type="submit" className="rounded-lg p-2 hover:bg-white/10" aria-label="Sign out" title="Sign out">
                  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
          <div data-tour="tabs"><NavTabs items={nav} /></div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <Suspense fallback={null}>
        <GuideTour role={user.role} autoStart={!user.tourDone} />
      </Suspense>
    </>
  );
}
