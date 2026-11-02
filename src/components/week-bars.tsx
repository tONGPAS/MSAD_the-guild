//FR-44 chart: one series, so one color and no legend (the heading names it).
//HTML columns rather than a scaled SVG, so labels stay readable at phone width.

function niceMax(n: number) {
  if (n <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= n) return m * p;
  return 10 * p;
}

function weekLabel(key: string) {
  const [, m, d] = key.split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${d}`;
}

export function WeekBars({ weeks }: { weeks: { week: string; n: number }[] }) {
  const top = niceMax(Math.max(0, ...weeks.map((w) => w.n)));
  const ticks = [top, top / 2, 0];
  return (
    <figure className="m-0">
      <div className="flex gap-2">
        <div aria-hidden className="relative w-6 shrink-0 text-right text-xs tabular-nums text-muted" style={{ height: "12rem" }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / top) * 100}%` }}>{t}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: "12rem" }}>
            {ticks.map((t) => (
              <div key={t} aria-hidden className={`absolute inset-x-0 border-t ${t === 0 ? "border-muted/60" : "border-line"}`} style={{ top: `${100 - (t / top) * 100}%` }} />
            ))}
            <ol className="absolute inset-0 flex items-end gap-0.5" aria-hidden>
              {weeks.map((w) => (
                <li key={w.week} className="group relative flex h-full flex-1 items-end justify-center" title={`Week of ${weekLabel(w.week)}: ${w.n} quest${w.n === 1 ? "" : "s"}`}>
                  {w.n > 0 && (
                    <>
                      <span className="absolute text-xs font-bold tabular-nums text-ink" style={{ bottom: `calc(${(w.n / top) * 100}% + 2px)` }}>{w.n}</span>
                      <span className="block w-full max-w-10 rounded-t bg-brand transition-opacity group-hover:opacity-80" style={{ height: `${(w.n / top) * 100}%` }} />
                    </>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <ol aria-hidden className="mt-1 flex gap-0.5">
            {weeks.map((w, i) => (
              <li key={w.week} className="flex-1 text-center text-xs text-muted">
                {weeks.length <= 8 || i % 2 === 0 ? weekLabel(w.week) : ""}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted underline">Show as a table</summary>
        <table className="mt-2 w-full max-w-xs text-left tabular-nums">
          <thead><tr><th className="py-1 font-bold">Week of</th><th className="py-1 text-right font-bold">Quests</th></tr></thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.week} className="border-t border-line"><td className="py-1">{weekLabel(w.week)}</td><td className="py-1 text-right">{w.n}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
