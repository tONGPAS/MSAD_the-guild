import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { BADGE_ORDER, BADGES, type BadgeCode } from "@/modules/progression/badges";
import { guildProfile, recentXp } from "@/modules/progression/profile";
import { DifficultyTag } from "@/components/badges";
import { Crest } from "@/components/crest";
import { RankEmblem, XpBar } from "@/components/rank-seal";
import { formatRef, RANKS, rankProgress } from "@/lib/rules";
import { ago } from "@/lib/time";

export const metadata: Metadata = { title: "Profile" };

const ACTION_LABEL: Record<string, string> = {
  SUBMIT_QUEST: "Submitted a quest",
  COMPLETE_REVIEW: "Completed a review",
  RESOLVE_FAST: "Resolved a quest within 48 hours",
  HELPFUL_RATING: "Review rated helpful",
};

//SC-08, FR-31
export default async function ProfilePage({ params }: PageProps<"/guild/[id]">) {
  const viewer = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const p = await guildProfile(id);
  if (!p || (p.user.status !== "ACTIVE" && viewer.role !== "FACULTY")) notFound();
  const self = viewer.id === p.user.id;
  const prog = rankProgress(p.user.xpTotal);
  const earned = new Map(p.badges.map((b) => [b.code as BadgeCode, b.awardedAt]));
  const xp = self ? await recentXp(p.user.id) : [];
  //A review links only where the quest page would open for this viewer (BRL-10)
  const canOpen = (submitterId: string) => viewer.role === "FACULTY" || self || submitterId === viewer.id;

  return (
    <div className="space-y-8">
      <Link href="/guild" className="text-sm text-muted underline">Guild Hall</Link>
      <section className="panel flex flex-wrap items-center gap-6 p-6" style={{ backgroundImage: "radial-gradient(circle at 0% 0%, var(--gold-soft), transparent 60%)" }}>
        <Crest id={p.user.id} name={p.user.name} size={80} ring />
        <div className="min-w-56 flex-1">
          <h1 className="text-3xl font-extrabold">{p.user.name}{self && <span className="ml-2 text-lg font-normal text-muted">(you)</span>}</h1>
          <p className="mt-1 flex items-center gap-2">
            <RankEmblem xp={p.user.xpTotal} size={28} />
            <span className="font-bold">{prog.label}</span>
            <span className="font-pixel ml-auto text-gold">{p.user.xpTotal} XP</span>
          </p>
          <XpBar xp={p.user.xpTotal} tall className="mt-2" />
          <p className="mt-1 text-sm text-muted">{prog.next ? `${prog.toNext} XP to reach ${prog.next}` : "Reached the highest rank."}</p>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Review streak" value={p.user.streak} unit={p.user.streak === 1 ? "week" : "weeks"} />
        <Stat label="Reviews done" value={p.reviewsDone} />
        <Stat label="Quests submitted" value={p.questsSubmitted} />
        <Stat
          label="Rated helpful"
          value={p.rated ? `${Math.round((p.helpful / p.rated) * 100)}%` : "None yet"}
          unit={p.rated ? `of ${p.rated} rated` : undefined}
        />
      </dl>

      <section aria-labelledby="badges">
        <h2 id="badges" className="mb-3 text-xl font-bold">Badges</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {BADGE_ORDER.map((code) => {
            const at = earned.get(code);
            return (
              <li key={code} className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center ${at ? "border-gold border-b-4 border-b-gold-deep bg-gold-soft" : "border-dashed border-line text-muted"}`}>
                <BadgeIcon code={code} earned={!!at} />
                <p className="font-bold leading-tight">{BADGES[code].label}</p>
                <p className="text-xs">{at ? `Earned ${ago(at)}` : BADGES[code].how}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="history">
        <h2 id="history" className="mb-3 text-xl font-bold">Review history</h2>
        {p.history.length === 0 ? (
          <p className="panel p-6 text-muted">No reviews finished yet.</p>
        ) : (
          <ul className="panel divide-y divide-line">
            {p.history.map((h) => {
              const row = (
                <>
                  <span className="w-24 font-mono text-sm text-muted">{formatRef(h.refNo)}</span>
                  <span className="min-w-0 flex-1 basis-40 font-bold">{h.title}</span>
                  <DifficultyTag level={h.difficulty} />
                  <span className="w-28 text-sm text-muted">{ago(h.createdAt)}</span>
                  <span className="w-28 text-sm">{h.helpful === null ? <span className="text-muted">Not rated</span> : h.helpful ? <span className="text-ok">Helpful</span> : <span className="text-muted">Not helpful</span>}</span>
                </>
              );
              return (
                <li key={h.reviewId}>
                  {canOpen(h.submitterId)
                    ? <Link href={`/quests/${h.refNo}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-canvas">{row}</Link>
                    : <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">{row}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {self && (
        <>
          <section aria-labelledby="ranks">
            <h2 id="ranks" className="mb-3 text-xl font-bold">Ranks</h2>
            <ol className="flex flex-wrap gap-2">
              {RANKS.map((r) => (
                <li key={r.rank} className={`rounded-md border px-3 py-2 text-sm ${p.user.xpTotal >= r.min ? "border-gold bg-gold-soft font-bold" : "border-line text-muted"}`}>
                  {r.label} <span className="font-normal">({r.min} XP)</span>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="xp">
            <h2 id="xp" className="mb-3 text-xl font-bold">Recent XP</h2>
            {xp.length === 0 ? (
              <p className="panel p-6 text-muted">No XP yet. Submit a quest (10 XP) or finish a review (25 XP) to start.</p>
            ) : (
              <ul className="panel divide-y divide-line">
                {xp.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3 px-4 py-3">
                    <span>{ACTION_LABEL[e.action] ?? e.action}</span>
                    <span className="whitespace-nowrap"><strong className="text-gold">+{e.points}</strong> <span className="text-sm text-muted">{ago(e.createdAt)}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="panel p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-pixel text-2xl">
        {value} {unit && <span className="text-base font-normal text-muted">{unit}</span>}
      </dd>
    </div>
  );
}

//Each badge gets its own glyph; locked ones are greyed outlines so the goal is still visible
function BadgeIcon({ code, earned }: { code: BadgeCode; earned: boolean }) {
  const fill = earned ? "var(--gold-bright)" : "none";
  const stroke = earned ? "var(--gold-deep)" : "var(--muted)";
  const glyph = {
    FIRST_QUEST: <path d="M12 26 L20 8 L28 26 M15 20 H25" />,
    FIRST_REVIEW: <path d="M10 20 L17 27 L30 12" />,
    STREAK_3: <path d="M20 8 C22 14 28 16 28 23 A8 8 0 0 1 12 23 C12 18 16 17 16 12 C18 15 19 17 20 18 C21 14 21 11 20 8 Z" />,
    HELPFUL_10: <path d="M20 29 L11 20 A5 5 0 0 1 20 13 A5 5 0 0 1 29 20 Z" />,
    RANK_MASTER: <path d="M10 26 L12 14 L17 19 L20 11 L23 19 L28 14 L30 26 Z" />,
  }[code];
  return (
    <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r="18" fill={earned ? "var(--brand)" : "none"} stroke={stroke} strokeWidth="2" strokeDasharray={earned ? undefined : "4 3"} />
      <g fill={code === "FIRST_QUEST" || code === "FIRST_REVIEW" ? "none" : fill} stroke={earned ? "var(--gold-bright)" : stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{glyph}</g>
    </svg>
  );
}
