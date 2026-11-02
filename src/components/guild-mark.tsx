//The guild's mark: a gold banner with a code bracket, used beside the name
export function GuildMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 28 32" aria-hidden>
      <path d="M3 2 H25 V28 L14 22 L3 28 Z" fill="var(--gold-bright)" stroke="var(--gold-deep)" strokeWidth="2" />
      <path d="M11 9 L7 13 L11 17 M17 9 L21 13 L17 17" fill="none" stroke="var(--brand-deep)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
