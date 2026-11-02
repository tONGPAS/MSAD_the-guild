//A shield per person, so people are recognisable at a glance (the person-to-person part of the Guild).
//Colour comes from the id, so it never changes, and only uses theme tokens so it works in light and dark.
const TINCTURES = ["var(--brand)", "var(--rare)", "var(--epic)", "var(--common)", "var(--gold)"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => /^[A-Za-z]/.test(p));
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Crest({ id, name, size = 40, ring }: { id: string; name: string; size?: number; ring?: boolean }) {
  const fill = TINCTURES[hash(id) % TINCTURES.length];
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-hidden className="shrink-0">
      <path d="M20 2 L37 8 V22 C37 33 29 40 20 44 C11 40 3 33 3 22 V8 Z" fill={fill} stroke={ring ? "var(--gold-bright)" : "rgb(0 0 0 / 0.25)"} strokeWidth={ring ? 3 : 2} />
      <path d="M20 6 L33 10.5 V22 C33 30.5 27 36.5 20 40 Z" fill="rgb(255 255 255 / 0.12)" />
      <text x="20" y="28.5" textAnchor="middle" fontSize="20" fontFamily="var(--font-pixel)" fill="#fff" style={{ letterSpacing: "0.5px" }}>
        {initials(name)}
      </text>
    </svg>
  );
}
