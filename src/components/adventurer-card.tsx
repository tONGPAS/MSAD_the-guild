import Link from "next/link";
import { rankProgress, SUBMIT_XP_DAILY_CAP } from "@/lib/rules";
import { Crest } from "./crest";
import { RankEmblem, XpBar } from "./rank-seal";

//The home screen's "character sheet": who you are in the Guild and what's left to earn today
export function AdventurerCard(p: { id: string; name: string; xp: number; streak: number; badges: number; paidToday: number; toReview: number }) {
  const prog = rankProgress(p.xp);
  const left = Math.max(0, SUBMIT_XP_DAILY_CAP - p.paidToday);
  return (
    <section aria-label="Your adventurer" className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5" style={{ backgroundImage: "radial-gradient(circle at 0% 0%, var(--gold-soft), transparent 55%)" }}>
        <Crest id={p.id} name={p.name} size={56} ring />
        <div className="min-w-48 flex-1">
          <p className="text-sm text-muted">Welcome back</p>
          <p className="font-display text-2xl font-extrabold leading-tight">{p.name.split(" ")[0]}</p>
          <div className="mt-2 flex items-center gap-2">
            <RankEmblem xp={p.xp} size={26} />
            <span className="font-bold">{prog.label}</span>
            <span className="font-pixel ml-auto text-sm text-gold">{p.xp} XP</span>
          </div>
          <XpBar xp={p.xp} tall className="mt-1" />
          <p className="mt-1 text-sm text-muted">{prog.next ? `${prog.toNext} XP to ${prog.next}` : "Highest rank reached"}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 border-t-2 border-line sm:grid-cols-4">
        <Stat label="Week streak" value={p.streak} icon={<Flame on={p.streak > 0} />} />
        <Stat label="Badges" value={`${p.badges}/5`} href={`/guild/${p.id}`} />
        <Stat label="Quest rewards left today" value={`${left}/${SUBMIT_XP_DAILY_CAP}`} />
        <Stat label="Reviews waiting on you" value={p.toReview} hot={p.toReview > 0} />
      </dl>
    </section>
  );
}

function Stat({ label, value, icon, href, hot }: { label: string; value: number | string; icon?: React.ReactNode; href?: string; hot?: boolean }) {
  const body = (
    <>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-pixel flex items-center gap-1.5 text-2xl ${hot ? "text-warn" : ""}`}>{icon}{value}</dd>
    </>
  );
  const cls = "border-line px-4 py-3 odd:border-r-2 sm:border-r-2 sm:last:border-r-0";
  return href ? <Link href={href} className={`${cls} hover:bg-sunken`}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Flame({ on }: { on: boolean }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden>
      <path d="M9 1 C10 6 15 8 15 14 A6 6 0 0 1 3 14 C3 10 6 9 6 5 C8 7 8 9 9 10 C10 7 10 4 9 1 Z" fill={on ? "var(--gold-bright)" : "var(--line)"} stroke={on ? "var(--danger)" : "var(--edge)"} strokeWidth="1.5" />
    </svg>
  );
}
