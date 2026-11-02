//Issue = a bug to squash, Praise = a star. Shape plus word, never colour alone.
export function CommentIcon({ kind, size = 18 }: { kind: "ISSUE" | "PRAISE"; size?: number }) {
  return kind === "ISSUE" ? (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <ellipse cx="10" cy="11.5" rx="4.5" ry="6" fill="var(--danger)" />
      <circle cx="10" cy="5" r="2.6" fill="var(--danger)" />
      <path d="M5.5 8 L2 6 M5.5 12 H1.5 M5.5 15.5 L2.5 18 M14.5 8 L18 6 M14.5 12 H18.5 M14.5 15.5 L17.5 18 M10 7 V18" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 7 V18" stroke="var(--surface)" strokeWidth="1.2" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <path d="M10 1.5 L12.6 7 L18.5 7.6 L14 11.6 L15.3 17.6 L10 14.5 L4.7 17.6 L6 11.6 L1.5 7.6 L7.4 7 Z" fill="var(--gold-bright)" stroke="var(--gold-deep)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

//A 1 to 5 score as five pips, with the number beside it for anyone who skims
export function ScorePips({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label={`${value} out of 5`}>
      <span aria-hidden className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-3 w-3 rotate-45 rounded-[2px] border-2 ${i <= value ? "border-gold-deep bg-gold-bright" : "border-line bg-sunken"}`} />
        ))}
      </span>
      <span className="font-pixel text-lg">{value}</span>
    </span>
  );
}
