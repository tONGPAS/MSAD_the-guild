//Pip, the Guild's squire. Hand-drawn SVG with a fixed palette so he looks the same in light and dark.
//Arms are drawn hanging down from the shoulder and rotated per pose (SVG rotate is clockwise).

export type Pose = "idle" | "wave" | "point" | "cheer" | "think" | "sleep";

const C = {
  skin: "#f2cba6",
  skinEdge: "#d6a37c",
  steel: "#aeb6c6",
  steelLight: "#d3d9e3",
  steelEdge: "#6f788b",
  tabard: "#8a2433",
  tabardDeep: "#5e1621",
  gold: "#e0aa25",
  goldDeep: "#8f6a10",
  leather: "#5a3a26",
  boot: "#3f2a1f",
  trousers: "#3b3550",
  hair: "#6b4423",
  plume: "#c23a48",
  ink: "#2b2233",
  wood: "#a8743f",
  woodEdge: "#6f4a24",
};

const ARMS: Record<Pose, { l: number; r: number }> = {
  idle: { l: 14, r: -14 },
  wave: { l: 14, r: -150 },
  point: { l: 14, r: -95 },
  cheer: { l: 150, r: -150 },
  think: { l: 14, r: -165 },
  sleep: { l: 8, r: -8 },
};

function Arm({ x, angle, wave }: { x: number; angle: number; wave?: boolean }) {
  return (
    <g transform={`rotate(${angle} ${x} 78)`}>
      <g className={wave ? "pip-wave" : undefined} style={wave ? { transformOrigin: `${x}px 78px` } : undefined}>
        <rect x={x - 5.5} y={76} width={11} height={24} rx={5.5} fill={C.steel} stroke={C.steelEdge} strokeWidth={1.4} />
        <circle cx={x} cy={104} r={5.8} fill={C.skin} stroke={C.skinEdge} strokeWidth={1.4} />
      </g>
    </g>
  );
}

function Mouth({ pose }: { pose: Pose }) {
  if (pose === "cheer" || pose === "wave")
    return (
      <g>
        <path d="M53 59 Q60 70 67 59 Z" fill={C.ink} />
        <path d="M56 64 Q60 67 64 64 Q60 69 56 64 Z" fill="#e5737d" />
      </g>
    );
  if (pose === "think") return <path d="M56 63 Q60 61 64 63" fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" />;
  if (pose === "sleep") return <ellipse cx="60" cy="63" rx="2.4" ry="1.8" fill={C.ink} />;
  return <path d="M54 60 Q60 66 66 60" fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />;
}

function Eyes({ pose }: { pose: Pose }) {
  if (pose === "sleep")
    return (
      <g fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round">
        <path d="M47.5 52 Q51 55 54.5 52" />
        <path d="M65.5 52 Q69 55 72.5 52" />
      </g>
    );
  return (
    <g className="pip-blink" style={{ transformOrigin: "60px 52px" }}>
      <ellipse cx="51" cy="52" rx="3.1" ry="3.8" fill={C.ink} />
      <ellipse cx="69" cy="52" rx="3.1" ry="3.8" fill={C.ink} />
      <circle cx="52.2" cy="50.6" r="1.1" fill="#fff" />
      <circle cx="70.2" cy="50.6" r="1.1" fill="#fff" />
    </g>
  );
}

export function Squire({ pose = "idle", size = 120, className = "", still }: { pose?: Pose; size?: number; className?: string; still?: boolean }) {
  const arms = ARMS[pose];
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 120 150" role="img" aria-label="Pip the squire" className={`shrink-0 overflow-visible ${className}`}>
      <ellipse cx="60" cy="143" rx="28" ry="4.5" fill="rgb(0 0 0 / 0.16)" />
      <g className={still ? undefined : "pip-bob"}>
        {/*Practice sword, held in the left hand when the arm hangs down*/}
        {(pose === "idle" || pose === "point" || pose === "think") && (
          <g transform="rotate(14 40 78)">
            <rect x={36.5} y={104} width={7} height={34} rx={2.5} fill={C.wood} stroke={C.woodEdge} strokeWidth={1.3} />
            <rect x={31} y={102} width={18} height={5} rx={2} fill={C.leather} />
          </g>
        )}
        {/*Legs and boots*/}
        <rect x="46" y="112" width="10" height="18" rx="3" fill={C.trousers} />
        <rect x="64" y="112" width="10" height="18" rx="3" fill={C.trousers} />
        <path d="M43 128 H57 V138 Q57 141 54 141 H43 Q40 141 40 138 Q40 128 43 128 Z" fill={C.boot} />
        <path d="M63 128 H77 Q80 128 80 138 Q80 141 77 141 H66 Q63 141 63 138 Z" fill={C.boot} />
        {/*Chainmail body and guild tabard*/}
        <rect x="38" y="70" width="44" height="46" rx="12" fill={C.steel} stroke={C.steelEdge} strokeWidth={1.4} />
        <path d="M43 72 H77 L81 116 Q60 122 39 116 Z" fill={C.tabard} stroke={C.gold} strokeWidth={2} strokeLinejoin="round" />
        <path d="M54 82 H66 V97 L60 93 L54 97 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth={1.2} />
        <path d="M58 86 L56 88.5 L58 91 M62 86 L64 88.5 L62 91" fill="none" stroke={C.tabardDeep} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        <rect x="39" y="104" width="42" height="6" rx="2" fill={C.leather} />
        <rect x="56" y="102.5" width="8" height="9" rx="1.5" fill="none" stroke={C.gold} strokeWidth={2} />
        {/*Head, cheeks, hair*/}
        <circle cx="60" cy="48" r="23" fill={C.skin} stroke={C.skinEdge} strokeWidth={1.5} />
        <circle cx="45.5" cy="59" r="3.6" fill="#ef8e86" opacity="0.55" />
        <circle cx="74.5" cy="59" r="3.6" fill="#ef8e86" opacity="0.55" />
        <path d="M39 42 Q46 47 52 42 Q58 47 64 42 Q71 47 81 42 L81 38 H39 Z" fill={C.hair} />
        <Eyes pose={pose} />
        <Mouth pose={pose} />
        {/*Kettle helmet with plume*/}
        <path d="M60 20 C62 7 73 1 82 6 C74 7 68 12 66 21 Z" fill={C.plume} stroke="#7e1f2a" strokeWidth={1.2} />
        <path d="M39 40 Q39 18 60 18 Q81 18 81 40 Z" fill={C.steel} stroke={C.steelEdge} strokeWidth={1.5} />
        <path d="M45 24 Q52 20 58 20" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth={2.5} strokeLinecap="round" />
        <ellipse cx="60" cy="40.5" rx="30" ry="6" fill={C.steelLight} stroke={C.steelEdge} strokeWidth={1.5} />
        <path d="M40 34 H80" stroke={C.steelEdge} strokeWidth={1.2} strokeDasharray="1.5 4" />
        <Arm x={40} angle={arms.l} />
        <Arm x={80} angle={arms.r} wave={pose === "wave"} />
        {pose === "point" && <circle cx="108.5" cy="74.5" r="2" fill={C.skinEdge} />}
      </g>
      {pose === "think" && (
        <text x="96" y="24" fontSize="26" fontWeight="800" fill={C.gold} stroke={C.goldDeep} strokeWidth={1} fontFamily="var(--font-display)" className="pip-float">?</text>
      )}
      {pose === "sleep" && (
        <g fill={C.steelEdge} fontFamily="var(--font-pixel)" className="pip-float">
          <text x="84" y="26" fontSize="16">z</text>
          <text x="94" y="14" fontSize="22">Z</text>
        </g>
      )}
      {pose === "cheer" && (
        <g fill={C.gold} className="anim-sparkle" style={{ animationIterationCount: "infinite", animationDuration: "1.8s" }}>
          <path d="M14 30 L16 36 L22 38 L16 40 L14 46 L12 40 L6 38 L12 36 Z" />
          <path d="M104 24 L105.5 28.5 L110 30 L105.5 31.5 L104 36 L102.5 31.5 L98 30 L102.5 28.5 Z" />
        </g>
      )}
    </svg>
  );
}
