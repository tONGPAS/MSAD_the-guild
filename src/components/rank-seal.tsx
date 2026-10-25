import { rankProgress } from "@/lib/rules";

//The one loud element: a gold ring that fills toward the next rank
export function RankSeal({ xp, size = 44 }: { xp: number; size?: number }) {
  const p = rankProgress(xp);
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-2" title={p.next ? `${p.toNext} XP to ${p.next}` : "Highest rank"}>
      <svg width={size} height={size} viewBox="0 0 44 44" role="img" aria-label={`${p.label}, ${xp} XP`}>
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <circle
          cx="22" cy="22" r={r} fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${(p.pct / 100) * c} ${c}`} transform="rotate(-90 22 22)"
        />
        <text x="22" y="26.5" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor" fontFamily="var(--font-display)">
          {p.label[0]}
        </text>
      </svg>
      <span className="leading-tight">
        <span className="block text-sm font-bold">{p.label}</span>
        <span className="block text-xs opacity-80">{xp} XP</span>
      </span>
    </span>
  );
}
