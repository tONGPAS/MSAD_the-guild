import { Bit } from "./bit";
import { ProgressBar } from "./challenge-card";
import type { guildGrowth } from "@/modules/progression/titles";

//Bit grows as the whole Guild completes peer reviews (CR-02)
export function GuildGrowth({ g, compact, noBit }: { g: Awaited<ReturnType<typeof guildGrowth>>; compact?: boolean; noBit?: boolean }) {
  return (
    <section className="panel flex flex-wrap items-center gap-4 p-4" aria-label="Guild growth">
      {!noBit && <Bit stage={g.stage} pose={g.stage === 3 ? "cheer" : "idle"} size={compact ? 70 : 92} />}
      <div className="min-w-48 flex-1">
        <p className="font-pixel text-sm text-muted">GUILD BIT · STAGE {g.stage + 1} OF 4</p>
        <p className="font-display text-xl font-extrabold">{g.name}</p>
        {g.next ? (
          <>
            <p className="mb-1.5 text-sm text-muted">Bit grows into a {g.next.name} when the Guild finishes {g.next.at} peer reviews. {g.next.at - g.reviews} to go!</p>
            <ProgressBar value={g.reviews} max={g.next.at} gold />
          </>
        ) : (
          <p className="text-sm text-muted">Fully grown, thanks to {g.reviews} peer reviews from the whole Guild.</p>
        )}
      </div>
    </section>
  );
}
