import "server-only";

const PR_RE = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)\/?(?:[#?].*)?$/;

export function isPullRequestUrl(url: string) {
  return PR_RE.test(url);
}

//FR-11, SR-06: public metadata only, no user tokens, gives up quietly after 3 s
export async function fetchPrMeta(url: string): Promise<{ title: string; size: number } | null> {
  const m = url.match(PR_RE);
  if (!m) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}/pulls/${m[3]}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "the-guild" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const pr = (await res.json()) as { title?: string; additions?: number; deletions?: number };
    if (typeof pr.title !== "string") return null;
    return { title: pr.title.slice(0, 300), size: (pr.additions ?? 0) + (pr.deletions ?? 0) };
  } catch {
    return null;
  }
}
