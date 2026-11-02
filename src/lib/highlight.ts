import "server-only";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import c from "shiki/langs/c.mjs";
import githubLight from "shiki/themes/github-light.mjs";
import githubDark from "shiki/themes/github-dark.mjs";

//One highlighter per server instance. The JavaScript regex engine avoids shipping WebAssembly to Vercel.
let ready: Promise<HighlighterCore> | null = null;
const highlighter = () =>
  (ready ??= createHighlighterCore({ langs: [c], themes: [githubLight, githubDark], engine: createJavaScriptRegexEngine() }));

//Colours only. The code is passed through exactly as submitted: no reformatting, no trimming,
//because spacing and indentation are part of what the reviewer judges (Readability).
//Shiki escapes the code itself, so the returned HTML is safe to inject.
export async function highlightC(code: string) {
  const h = await highlighter();
  return h.codeToHtml(code, { lang: "c", themes: { light: "github-light", dark: "github-dark" }, defaultColor: "light" });
}
