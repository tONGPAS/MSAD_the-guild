import { rankProgress } from "@/lib/rules";
import { Crest } from "./crest";
import { RankEmblem } from "./rank-seal";
import { Bit } from "./bit";

type Props = {
  title: string;
  message?: React.ReactNode;
  xpGained: number;
  xpAfter: number;
  badges?: string[];
  summoned?: { id: string; name: string };
};

//The moment after an action pays off: XP floats up and the bar fills from where it was.
//All motion is CSS and switched off under reduced motion; the end state is the same either way.
export function RewardBurst({ title, message, xpGained, xpAfter, badges = [], summoned }: Props) {
  const before = rankProgress(xpAfter - xpGained);
  const after = rankProgress(xpAfter);
  const rankedUp = before.label !== after.label;
  const fromPct = rankedUp ? 0 : before.pct;

  return (
    <section role="status" className="panel anim-pop relative overflow-hidden border-gold border-b-gold-deep">
      <div className="flex flex-wrap items-center gap-4 p-5" style={{ backgroundImage: "radial-gradient(circle at 100% 0%, var(--gold-soft), transparent 60%)" }}>
        <div className="relative">
          <RankEmblem xp={xpAfter} size={rankedUp ? 64 : 52} />
          {xpGained > 0 && (
            <span className="font-pixel anim-float pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-2xl whitespace-nowrap text-gold motion-reduce:hidden">
              +{xpGained} XP
            </span>
          )}
          {rankedUp && <Sparkles />}
        </div>
        <div className="min-w-56 flex-1">
          <p className="font-display text-2xl font-extrabold leading-tight">{rankedUp ? `Rank up: ${after.label}!` : title}</p>
          {rankedUp && <p className="text-muted">{title}</p>}
          {message && <p className="mt-0.5">{message}</p>}
          <div className="mt-3 flex items-center gap-3">
            <div className="anim-shine relative h-4 flex-1 overflow-hidden rounded-full border-2 border-gold-deep bg-black/20">
              <div className="anim-fill h-full bg-gold-bright" style={{ width: `${after.pct}%`, ["--from" as string]: `${fromPct}%` }} />
            </div>
            <span className="font-pixel text-lg text-gold">{xpGained > 0 ? `+${xpGained} XP` : "No XP"}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{after.next ? `${after.toNext} XP to ${after.next}` : "Highest rank reached"}</p>
        </div>
        {!summoned && <Bit pose="cheer" size={56} className="hidden sm:block" />}
        {summoned && (
          <div className="flex items-center gap-2 rounded-xl border-2 border-line bg-surface px-3 py-2">
            <Crest id={summoned.id} name={summoned.name} size={36} />
            <span className="leading-tight">
              <span className="block text-xs text-muted">Reviewer summoned</span>
              <span className="block font-bold">{summoned.name}</span>
            </span>
          </div>
        )}
      </div>
      {badges.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t-2 border-gold/40 bg-gold-soft px-5 py-3">
          <span className="font-bold">Badge earned:</span>
          {badges.map((b) => (
            <span key={b} className="anim-pop rounded-full border-2 border-gold-deep bg-gold-bright px-3 py-0.5 text-sm font-bold text-[#2b1d00]">{b}</span>
          ))}
        </div>
      )}
    </section>
  );
}

function Sparkles() {
  const spots = [
    { x: -14, y: -10, d: 0 }, { x: 58, y: -6, d: 200 }, { x: 64, y: 44, d: 400 }, { x: -10, y: 50, d: 600 },
  ];
  return (
    <>
      {spots.map((s, i) => (
        <svg key={i} aria-hidden width="14" height="14" viewBox="0 0 10 10" className="anim-sparkle absolute motion-reduce:hidden" style={{ left: s.x, top: s.y, animationDelay: `${s.d}ms`, animationIterationCount: 3 }}>
          <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="var(--gold-bright)" />
        </svg>
      ))}
    </>
  );
}
