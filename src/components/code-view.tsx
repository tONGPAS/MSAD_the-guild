/* eslint-disable @next/next/no-img-element */
//Signed storage URLs change every view, so a plain img is used instead of next/image
import { highlightC } from "@/lib/highlight";

export async function CodeView(p: { link: string | null; prTitle: string | null; prSize: number | null; snippet: string | null; image: string | null }) {
  const html = p.snippet ? await highlightC(p.snippet) : null;
  return (
    <div className="space-y-4">
      {p.link && (
        <a href={p.link} target="_blank" rel="noopener noreferrer" className="panel block p-4 hover:border-brand">
          <span className="block font-bold text-brand underline">{p.prTitle ?? "Open pull request on GitHub"}</span>
          <span className="block break-all text-sm text-muted">{p.link}</span>
          {p.prSize !== null && <span className="mt-1 block text-sm text-muted">{p.prSize} lines changed</span>}
        </a>
      )}
      {html && (
        <div className="code-editor max-h-[32rem] overflow-auto rounded-lg border-2 border-line bg-surface" tabIndex={0} role="region" aria-label="Submitted code" dangerouslySetInnerHTML={{ __html: html }} />
      )}
      {p.image && <img src={p.image} alt="Screenshot attached by the submitter" className="max-h-96 rounded-lg border border-line" />}
    </div>
  );
}
