"use client";

import { useState } from "react";
import { Squire, type Pose } from "./squire";

//Pip with a speech bubble. Clicking him moves to the next line and he hops.
//Lines are plain text so screen readers get them through the live region.
export function Pip({ lines, pose = "idle", size = 84, side = "left", className = "" }: { lines: string[]; pose?: Pose; size?: number; side?: "left" | "right"; className?: string }) {
  const [i, setI] = useState(0);
  const [hop, setHop] = useState(0);
  const many = lines.length > 1;

  function next() {
    setHop((h) => h + 1);
    if (many) setI((n) => (n + 1) % lines.length);
  }

  return (
    <div className={`flex items-end gap-3 ${side === "right" ? "flex-row-reverse" : ""} ${className}`}>
      <button
        type="button" onClick={next}
        className="shrink-0 rounded-xl focus-visible:outline-3 focus-visible:outline-brand"
        aria-label={many ? "Pip the squire. Click for another tip" : "Pip the squire"}
        title={many ? "Click Pip for another tip" : undefined}
      >
        <span key={hop} className={`block ${hop ? "pip-hop" : ""}`}>
          <Squire pose={pose} size={size} />
        </span>
      </button>
      <div className={`speech ${side === "right" ? "speech-right" : ""} relative mb-6 max-w-sm min-w-0 flex-1`}>
        <p aria-live="polite" key={i} className="anim-pop">{lines[i]}</p>
        {many && <p className="font-pixel mt-1 text-sm text-muted">{i + 1}/{lines.length} · click Pip for more</p>}
      </div>
    </div>
  );
}
