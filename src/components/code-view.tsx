/* eslint-disable @next/next/no-img-element */
//Signed storage URLs change every view, so a plain img is used instead of next/image
import { highlightCode } from "@/lib/highlight";
import { LANGUAGES, type Language } from "@/lib/rules";

export async function CodeView(p: { link: string | null; prTitle: string | null; prSize: number | null; snippet: string | null; image: string | null; language: Language }) {
  const lang = LANGUAGES[p.language];
  const html = p.snippet ? await highlightCode(p.snippet, p.language) : null;
  return (
    <div className="space-y-4">
      {p.link && (
        <a href={p.link} target="_blank" rel="noopener noreferrer" className="panel block p-4 hover:border-brand">
          <span className="block font-bold text-brand underline">{p.prTitle ?? "Open pull request on GitHub"}</span>
          <span className="block break-all text-sm text-muted">{p.link}</span>
          {p.prSize !== null && <span className="mt-1 block text-sm text-muted">{p.prSize} lines changed</span>}
        </a>
      )}
      {p.link && <p className="text-sm text-muted">Language: <span className="font-bold text-ink">{lang.label}</span></p>}
      {html && (
        <div className="overflow-hidden rounded-lg border-2 border-line bg-surface">
          {/*Editor-style tab so the language is obvious before reading a line*/}
          <div className="flex items-center gap-2 border-b-2 border-line bg-sunken px-3 py-1.5 text-sm">
            <span className="rounded-t-md border-2 border-b-0 border-line bg-surface px-2.5 py-0.5 font-mono">quest.{lang.ext}</span>
            <span className="ml-auto font-bold text-muted">{lang.label}</span>
          </div>
          <div className="code-editor max-h-[32rem] overflow-auto" tabIndex={0} role="region" aria-label={`Submitted ${lang.label} code`} dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
      {p.image && <img src={p.image} alt="Screenshot attached by the submitter" className="max-h-96 rounded-lg border border-line" />}
    </div>
  );
}
