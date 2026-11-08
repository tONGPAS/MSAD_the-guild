"use client";

import { useId } from "react";

//Bit, the Guild slime. Fixed palette so he looks the same in light and dark.
//Client component only for useId: each drawing needs its own gradient ids, or a hidden copy breaks the others.
export type Pose = "idle" | "wave" | "think" | "cheer" | "alert" | "sleep";

const C = { hi: "#9cc6ff", mid: "#3f7fea", lo: "#2350b5", edge: "#173a86", rim: "#bfe0ff", ink: "#14214a", gold: "#f2c33d", goldDeep: "#9c6d07", maroon: "#8a2433" };
const BODY = "M22 128 C16 96 36 52 80 50 C124 52 144 96 138 128 C137 137 126 141 80 141 C34 141 23 137 22 128 Z";

//Static squash per pose; the animation runs on top of it
const SHAPE: Record<Pose, { sx: number; sy: number; dy: number }> = {
  idle: { sx: 1, sy: 1, dy: 0 },
  wave: { sx: 1, sy: 1, dy: 0 },
  think: { sx: 1, sy: 1, dy: 0 },
  cheer: { sx: 0.94, sy: 1.08, dy: -4 },
  alert: { sx: 0.94, sy: 1.07, dy: -12 },
  sleep: { sx: 1.12, sy: 0.8, dy: 0 },
};
const MOTION: Record<Pose, string> = { idle: "bit-squish", wave: "bit-squish", think: "bit-squish", cheer: "bit-bounce", alert: "bit-hop", sleep: "bit-breathe" };

function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  const a = r * 1.6, b = r * 0.45;
  return <path d={`M${x} ${y - a} L${x + b} ${y - b} L${x + a} ${y} L${x + b} ${y + b} L${x} ${y + a} L${x - b} ${y + b} L${x - a} ${y} L${x - b} ${y - b} Z`} fill={C.gold} />;
}

//stage: how far the Guild has grown Bit (CR-02). 1 adds a cape, 2 a grander crown, 3 a golden aura.
export function Bit({ pose = "idle", size = 120, className = "", still, stage = 0 }: { pose?: Pose; size?: number; className?: string; still?: boolean; stage?: 0 | 1 | 2 | 3 }) {
  const g = "bit" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const { sx, sy, dy } = SHAPE[pose];
  const bodyT = `translate(80 ${141 + dy}) scale(${sx} ${sy}) translate(-80 -141)`;
  const ey = (pose === "sleep" ? 106 : 93) + dy;
  const my = ey + 11;
  const crownY = pose === "sleep" ? 141 - 91 * 0.8 : 50 + dy;
  const crownRot = { cheer: -4, alert: -18, sleep: -24 }[pose as string] ?? -12;
  const eyes = [64, 96];
  const anim = (cls: string) => (still ? undefined : cls);

  return (
    <svg width={size} height={(size * 150) / 160} viewBox="0 0 160 150" role="img" aria-label="Bit the slime" className={`shrink-0 overflow-visible ${className}`}>
      <defs>
        <radialGradient id={`${g}b`} cx="38%" cy="28%" r="80%">
          <stop offset="0" stopColor={C.hi} /><stop offset=".45" stopColor={C.mid} /><stop offset="1" stopColor={C.lo} />
        </radialGradient>
        <radialGradient id={`${g}c`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff3c4" /><stop offset=".5" stopColor={C.gold} stopOpacity=".9" /><stop offset="1" stopColor={C.gold} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${g}k`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe27a" /><stop offset="1" stopColor="#d19a14" />
        </linearGradient>
        <clipPath id={`${g}clip`}><path d={BODY} /></clipPath>
      </defs>

      {stage >= 3 && (
        <g className={anim("bit-core")}>
          <ellipse cx="80" cy="96" rx="80" ry="66" fill={`url(#${g}c)`} opacity=".9" />
        </g>
      )}
      <ellipse cx="80" cy="143" rx={58 * sx} ry="5" fill="rgb(20 30 70 / 0.18)" className={anim(pose === "alert" || pose === "cheer" ? "bit-shadow" : "")} />

      <g className={anim(MOTION[pose])}>
        <g transform={bodyT}>
          {pose === "cheer" && [[-1, -50], [1, 50]].map(([side, ang]) => {
            const x = 80 + side * 50;
            return (
              <g key={side} transform={`rotate(${ang} ${x} 100)`}>
                <g className={anim("bit-flap")}>
                  <ellipse cx={x} cy={86} rx="10" ry="18" fill={`url(#${g}b)`} stroke={C.edge} strokeWidth="2.6" />
                  <ellipse cx={x - 3 * side} cy={76} rx="3" ry="5" fill="#fff" opacity=".55" />
                </g>
              </g>
            );
          })}
          {stage >= 1 && (
            <g>
              <path d="M42 76 Q2 104 6 141 Q12 146 22 140 L138 140 Q148 146 154 141 Q158 104 118 76 Q80 92 42 76 Z" fill={C.maroon} stroke="#5e1621" strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M6 141 Q12 146 22 140 M138 140 Q148 146 154 141" stroke={C.gold} strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M14 112 Q10 126 12 136 M146 112 Q150 126 148 136" stroke="#5e1621" strokeWidth="1.6" fill="none" opacity=".6" />
            </g>
          )}
          <path d={BODY} fill={`url(#${g}b)`} stroke={C.edge} strokeWidth="3" strokeLinejoin="round" />
          <g clipPath={`url(#${g}clip)`}>
            <ellipse cx="80" cy="150" rx="70" ry="26" fill={C.lo} opacity=".55" />
            <path d="M130 84 C140 104 140 122 132 134" stroke={C.rim} strokeWidth="5" fill="none" opacity=".55" strokeLinecap="round" />
            <circle cx="80" cy="128" r="15" fill={`url(#${g}c)`} className={anim(pose === "cheer" ? "bit-core bit-core-hot" : "bit-core")} />
            <path d="M80 121 L85.5 128 L80 135 L74.5 128 Z" fill={`url(#${g}k)`} stroke={C.goldDeep} strokeWidth="1.2" />
            <path d="M80 121 L83 128 L80 128 Z" fill="#fff" opacity=".6" />
            <g className={anim("bit-bubbles")}>
              <circle cx="112" cy="116" r="3.2" fill="#fff" opacity=".35" />
              <circle cx="104" cy="128" r="2" fill="#fff" opacity=".35" />
              <circle cx="50" cy="126" r="2.6" fill="#fff" opacity=".3" />
              <circle cx="118" cy="102" r="1.6" fill="#fff" opacity=".4" />
            </g>
          </g>
          <path d="M40 92 C42 72 56 60 72 58" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" opacity=".75" />
          <circle cx="38" cy="104" r="3.4" fill="#fff" opacity=".7" />
          <g transform={`rotate(${crownRot} 96 ${crownY})${stage >= 2 ? ` translate(95 ${crownY}) scale(1.3) translate(-95 ${-crownY})` : ""}`}>
            <g className={anim(pose === "cheer" ? "bit-crown-jig" : "")}>
              <path d={`M80 ${crownY + 2} L78 ${crownY - 16} L87 ${crownY - 8} L95 ${crownY - 21} L103 ${crownY - 8} L112 ${crownY - 16} L110 ${crownY + 2} Q95 ${crownY + 6} 80 ${crownY + 2} Z`} fill={`url(#${g}k)`} stroke={C.goldDeep} strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="95" cy={crownY - 3} r="3.2" fill={C.maroon} stroke="#5e1621" strokeWidth="1" />
              <circle cx="94" cy={crownY - 4} r="1" fill="#fff" />
              <circle cx="78" cy={crownY - 17} r="2" fill="#ffe27a" />
              <circle cx="95" cy={crownY - 22} r="2.2" fill="#ffe27a" />
              <circle cx="112" cy={crownY - 17} r="2" fill="#ffe27a" />
              {stage >= 2 && <circle cx="86" cy={crownY - 1} r="2.2" fill="#4fb7ff" stroke="#173a86" strokeWidth=".8" />}
              {stage >= 2 && <circle cx="104" cy={crownY - 1} r="2.2" fill="#4fb7ff" stroke="#173a86" strokeWidth=".8" />}
            </g>
          </g>
          {pose === "wave" && (
            <g transform="rotate(38 128 104)">
              <g className={anim("bit-wave")}>
                <ellipse cx="128" cy="86" rx="10" ry="20" fill={`url(#${g}b)`} stroke={C.edge} strokeWidth="2.6" />
                <ellipse cx="125" cy="76" rx="3" ry="5" fill="#fff" opacity=".6" />
              </g>
            </g>
          )}
          {pose === "think" && (
            <g transform="rotate(-28 100 128)">
              <ellipse cx="100" cy="114" rx="8" ry="15" fill={`url(#${g}b)`} stroke={C.edge} strokeWidth="2.4" />
              <ellipse cx="98" cy="106" rx="2.4" ry="4" fill="#fff" opacity=".6" />
            </g>
          )}
        </g>

        {/*Face*/}
        {pose === "cheer" || pose === "sleep" ? (
          eyes.map((ex) => (
            <path key={ex} d={pose === "cheer" ? `M${ex - 7} ${ey + 2} Q${ex} ${ey - 8} ${ex + 7} ${ey + 2}` : `M${ex - 7} ${ey} Q${ex} ${ey + 6} ${ex + 7} ${ey}`} stroke={C.ink} strokeWidth={pose === "cheer" ? 3.6 : 3} fill="none" strokeLinecap="round" />
          ))
        ) : (
          <g className={anim("bit-blink")}>
            {eyes.map((ex) => {
              const ry = pose === "alert" ? 11 : 9.5;
              const py = pose === "think" ? -3 : 0;
              return (
                <g key={ex}>
                  <ellipse cx={ex} cy={ey} rx="7.5" ry={ry} fill={C.ink} />
                  <ellipse cx={ex + 2.2} cy={ey - 3.6 + py} rx="3" ry="3.6" fill="#fff" />
                  <circle cx={ex - 2.6} cy={ey + 4 + py / 2} r="1.5" fill="#fff" opacity=".85" />
                  <path d={`M${ex - 5} ${ey + 6} Q${ex} ${ey + 9} ${ex + 5} ${ey + 6}`} stroke={C.hi} strokeWidth="1.6" fill="none" opacity=".8" />
                </g>
              );
            })}
          </g>
        )}
        <ellipse cx={eyes[0] - 11} cy={ey + 10} rx="6" ry="3.6" fill="#ff8fb3" opacity=".55" />
        <ellipse cx={eyes[1] + 11} cy={ey + 10} rx="6" ry="3.6" fill="#ff8fb3" opacity=".55" />
        {(pose === "cheer" || pose === "wave") && (
          <>
            <path d={`M73 ${my - 1} Q80 ${my + 11} 87 ${my - 1} Z`} fill={C.ink} />
            <path d={`M76 ${my + 4} Q80 ${my + 8} 84 ${my + 4} Q80 ${my + 2} 76 ${my + 4} Z`} fill="#ff7a9a" />
          </>
        )}
        {pose === "alert" && <ellipse cx="80" cy={my + 2} rx="3.6" ry="4.6" fill={C.ink} />}
        {pose === "think" && <path d={`M75 ${my + 1} Q79 ${my - 1} 85 ${my + 2}`} stroke={C.ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
        {pose === "idle" && <path d={`M74 ${my} Q77 ${my + 4} 80 ${my} Q83 ${my + 4} 86 ${my}`} stroke={C.ink} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        {pose === "sleep" && (
          <>
            <ellipse cx="80" cy={my} rx="2.6" ry="2" fill={C.ink} />
            <circle cx="96" cy={my - 6} r="7" fill={C.rim} opacity=".7" stroke="#fff" strokeWidth="1" className={anim("bit-snore")} />
          </>
        )}
      </g>

      {stage >= 3 && pose !== "cheer" && (
        <g className={anim("bit-twinkle")}>
          <Sparkle x={18} y={60} r={4} /><Sparkle x={146} y={92} r={3.5} />
        </g>
      )}
      {pose === "cheer" && (
        <g className={anim("bit-twinkle")}>
          <Sparkle x={22} y={44} r={7} /><Sparkle x={140} y={40} r={6} /><Sparkle x={132} y={72} r={4} />
        </g>
      )}
      {pose === "think" && (
        <g className={anim("bit-float")}>
          <circle cx="130" cy="44" r="13" fill="#fff" stroke="#c9c2dc" strokeWidth="2" />
          <circle cx="118" cy="62" r="4" fill="#fff" stroke="#c9c2dc" strokeWidth="1.6" />
          <text x="130" y="51" textAnchor="middle" fontWeight="900" fontSize="19" fill={C.maroon} fontFamily="system-ui, sans-serif">?</text>
        </g>
      )}
      {pose === "sleep" && (
        <g fill={C.edge} fontWeight="800" fontFamily="system-ui, sans-serif" className={anim("bit-float")}>
          <text x="122" y="70" fontSize="15" opacity=".7">z</text>
          <text x="132" y="54" fontSize="21" opacity=".8">Z</text>
        </g>
      )}
      {pose === "alert" && (
        <g className={anim("bit-float")}>
          <path d="M128 22 L124 50" stroke={C.maroon} strokeWidth="6" strokeLinecap="round" />
          <circle cx="122.5" cy="60" r="3.6" fill={C.maroon} />
          <path d="M26 66 l-8 -6 M22 80 l-10 -1 M134 84 l10 -2" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {pose === "wave" && <path d="M142 50 q5 4 2 10 M148 44 q8 7 3 18" stroke={C.gold} strokeWidth="2.6" fill="none" strokeLinecap="round" className={anim("bit-float")} />}
    </svg>
  );
}
