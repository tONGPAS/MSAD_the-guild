/* eslint-disable @next/next/no-img-element */
//Signed storage URLs change every view, so a plain img is used instead of next/image

export function CodeView(p: { link: string | null; prTitle: string | null; prSize: number | null; snippet: string | null; image: string | null }) {
  return (
    <div className="space-y-4">
      {p.link && (
        <a href={p.link} target="_blank" rel="noopener noreferrer" className="panel block p-4 hover:border-brand">
          <span className="block font-bold text-brand underline">{p.prTitle ?? "Open pull request on GitHub"}</span>
          <span className="block break-all text-sm text-muted">{p.link}</span>
          {p.prSize !== null && <span className="mt-1 block text-sm text-muted">{p.prSize} lines changed</span>}
        </a>
      )}
      {p.snippet && (
        <pre className="max-h-[32rem] overflow-auto rounded-lg border border-line bg-surface p-4 font-mono text-sm leading-relaxed" tabIndex={0} aria-label="Submitted code">
          <code>{p.snippet}</code>
        </pre>
      )}
      {p.image && <img src={p.image} alt="Screenshot attached by the submitter" className="max-h-96 rounded-lg border border-line" />}
    </div>
  );
}
