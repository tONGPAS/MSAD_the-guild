//The submitter's brief, shown to whoever reads the code, so feedback answers the real question
export function QuestBrief({ context, notes, by }: { context: string | null; notes: string | null; by: string }) {
  if (!context && !notes) return null;
  return (
    <section aria-label="Submitter's brief" className="panel border-gold/60 p-4" style={{ backgroundImage: "linear-gradient(135deg, var(--gold-soft), transparent 70%)" }}>
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-gold">
        <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden>
          <path d="M5 3 H15 A3 3 0 0 1 18 6 V17 A2 2 0 0 0 20 19 H8 A3 3 0 0 1 5 16 Z" fill="var(--gold-soft)" stroke="var(--gold-deep)" strokeWidth="1.6" />
        </svg>
        Brief from {by}
      </p>
      {context && (
        <div>
          <p className="text-xs font-bold text-muted">What this code should do</p>
          <p className="whitespace-pre-wrap break-words">{context}</p>
        </div>
      )}
      {notes && (
        <div className={context ? "mt-3" : ""}>
          <p className="text-xs font-bold text-muted">Notes for the reviewer</p>
          <p className="whitespace-pre-wrap break-words">{notes}</p>
        </div>
      )}
    </section>
  );
}
