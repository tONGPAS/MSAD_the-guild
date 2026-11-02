import { RANKS, rankProgress } from "@/lib/rules";

const tierOf = (xp: number) => Math.max(0, RANKS.findLastIndex((r) => xp >= r.min));

//Rank emblem: a gold diamond with one pip per tier, so rank reads as a shape, not just a word
export function RankEmblem({ xp, size = 40 }: { xp: number; size?: number }) {
  const tier = tierOf(xp);
  const p = rankProgress(xp);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`${p.label} rank`} className="shrink-0">
      <path d="M20 2 L38 20 L20 38 L2 20 Z" fill="var(--gold-bright)" stroke="var(--gold-deep)" strokeWidth="2.5" />
      <path d="M20 8 L32 20 L20 32 L8 20 Z" fill="var(--gold-deep)" opacity="0.28" />
      {Array.from({ length: tier + 1 }, (_, i) => {
        const x = 20 + (i - tier / 2) * 5.5;
        return <rect key={i} x={x - 2} y={18} width={4} height={4} fill="#2b1d00" transform={`rotate(45 ${x} 20)`} />;
      })}
    </svg>
  );
}

//Segmented like a game HUD bar; the segments are decoration, the fill is the real percentage
export function XpBar({ xp, className = "", tall }: { xp: number; className?: string; tall?: boolean }) {
  const p = rankProgress(xp);
  return (
    <div
      className={`relative overflow-hidden rounded-full border-2 border-gold-deep bg-black/25 ${tall ? "h-4" : "h-2.5"} ${className}`}
      role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100}
      aria-label={p.next ? `${p.pct}% of the way to ${p.next}` : "Highest rank reached"}
    >
      <div className="xp-fill h-full bg-gold-bright" style={{ width: `${p.pct}%` }} />
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 calc(10% - 2px), rgb(0 0 0 / 0.28) calc(10% - 2px) 10%)" }} />
    </div>
  );
}

//Compact HUD block used in the header and directory: emblem, rank name, XP in pixel numerals
export function RankSeal({ xp, size = 40 }: { xp: number; size?: number }) {
  const p = rankProgress(xp);
  return (
    <span className="inline-flex items-center gap-2" title={p.next ? `${p.toNext} XP to ${p.next}` : "Highest rank"}>
      <RankEmblem xp={xp} size={size} />
      <span className="leading-tight">
        <span className="block text-sm font-bold">{p.label}</span>
        <span className="font-pixel block text-xs opacity-90">{xp} XP</span>
      </span>
    </span>
  );
}

//Faculty sit above every student rank. A display tier only: no XP, badges, or stats behind it,
//so the student data used for the results chapter stays clean.
export const GUILD_MASTER = "Guild Master";

export function CrownEmblem({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`${GUILD_MASTER} rank`} className="shrink-0">
      <path d="M20 2 L38 20 L20 38 L2 20 Z" fill="var(--brand-deep)" stroke="var(--gold-bright)" strokeWidth="2.5" />
      <path d="M11 25 L12.5 15 L16.5 19 L20 12 L23.5 19 L27.5 15 L29 25 Z" fill="var(--gold-bright)" stroke="var(--gold-deep)" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="11" y="25" width="18" height="3" rx="1" fill="var(--gold-bright)" stroke="var(--gold-deep)" strokeWidth="1" />
      <circle cx="20" cy="12" r="1.6" fill="#fff" />
    </svg>
  );
}
