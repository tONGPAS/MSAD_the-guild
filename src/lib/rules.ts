//Every tunable number from the SRS business rules lives here, so OI-04 tuning is a one-file change

//BRL-01, FR-04
export const INVITE_TTL_DAYS = 7;

//FR-06
export const SESSION_IDLE_MINUTES = 30;

//NFR-03
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

//BRL-05
export const XP = {
  SUBMIT_QUEST: 10,
  COMPLETE_REVIEW: 25,
  RESOLVE_FAST: 10,
  HELPFUL_RATING: 15,
} as const;
export type XpAction = keyof typeof XP;

export const FAST_RESOLVE_HOURS = 48;

export const RANKS = [
  { rank: "APPRENTICE", label: "Apprentice", min: 0 },
  { rank: "JOURNEYMAN", label: "Journeyman", min: 100 },
  { rank: "ADEPT", label: "Adept", min: 300 },
  { rank: "EXPERT", label: "Expert", min: 600 },
  { rank: "MASTER", label: "Master", min: 1000 },
] as const;
export type RankCode = (typeof RANKS)[number]["rank"];

export function rankFor(xp: number): RankCode {
  let current: RankCode = "APPRENTICE";
  for (const r of RANKS) if (xp >= r.min) current = r.rank;
  return current;
}

export function rankProgress(xp: number) {
  const idx = RANKS.findLastIndex((r) => xp >= r.min);
  const cur = RANKS[idx];
  const next = RANKS[idx + 1];
  if (!next) return { label: cur.label, next: null, pct: 100, toNext: 0 };
  const pct = Math.round(((xp - cur.min) / (next.min - cur.min)) * 100);
  return { label: cur.label, next: next.label, pct, toNext: next.min - xp };
}

//BRL-08 (used by the Release 3 daily job)
export const STALE_HOURS = 72;
export const REASSIGN_DAYS = 7;

//FR-09, SEC-06
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

//Data dictionary 7.3
export const LIMITS = {
  name: 100,
  title: 120,
  link: 300,
  snippet: 10000,
  comment: 2000,
  reason: 500,
} as const;

export function formatRef(refNo: number) {
  return `QS-${String(refNo).padStart(6, "0")}`;
}
