import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { KIND_LABEL, METRICS, TEMPLATES, templateFor, type Kind, type Template } from "@/modules/challenges/templates";
import { ChallengeForm } from "./form";

export const metadata: Metadata = { title: "New challenge" };

const BLANK: Record<Kind, Template> = {
  GOAL: { key: "", kind: "GOAL", scope: "PERSONAL", title: "", description: "", metric: "REVIEWS", target: 3, xpReward: 25, days: 7 },
  CODING: { key: "", kind: "CODING", scope: "PERSONAL", title: "", description: "", xpReward: 30, days: 7, language: "c" },
  REVIEW: { key: "", kind: "REVIEW", scope: "PERSONAL", title: "", description: "Review this code like a real quest. Score it and comment on every problem you find.", xpReward: 20, days: 7, language: "c", code: "", context: "" },
};

const GROUPS: { title: string; blurb: string; pick: (t: Template) => boolean; kind: Kind }[] = [
  { title: "Goals", blurb: "Counted automatically from what students already do.", pick: (t) => t.kind === "GOAL" && t.scope === "PERSONAL", kind: "GOAL" },
  { title: "Guild goals", blurb: "One shared target for everyone. All who help get the reward.", pick: (t) => t.kind === "GOAL" && t.scope === "GUILD", kind: "GOAL" },
  { title: "Coding challenges", blurb: "Students answer with a quest; the reward comes when a classmate reviews it.", pick: (t) => t.kind === "CODING", kind: "CODING" },
  { title: "Review challenges", blurb: "Everyone reviews the same code, then sees how classmates reviewed it.", pick: (t) => t.kind === "REVIEW", kind: "REVIEW" },
];

export default async function NewChallenge({ searchParams }: PageProps<"/faculty/challenges/new">) {
  await requireUser({ role: "FACULTY" });
  const sp = await searchParams;
  const tpl = typeof sp.template === "string" ? templateFor(sp.template) : undefined;
  const blank = typeof sp.kind === "string" && sp.kind in BLANK ? BLANK[sp.kind as Kind] : undefined;
  const start = tpl ?? blank;

  if (start) {
    return (
      <div className="space-y-5">
        <div>
          <Link href="/faculty/challenges/new" className="text-sm text-muted underline">All templates</Link>
          <h1 className="mt-2 text-3xl font-bold">{tpl ? `New challenge from "${tpl.title}"` : `New ${KIND_LABEL[start.kind].toLowerCase()}`}</h1>
          <p className="text-muted">Change anything below, then publish. It starts as soon as you publish it.</p>
        </div>
        <ChallengeForm t={start} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/faculty/challenges" className="text-sm text-muted underline">Challenges</Link>
        <h1 className="mt-2 text-3xl font-bold">Pick a template</h1>
        <p className="text-muted">Every template can be edited before you publish it.</p>
      </div>
      {GROUPS.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">{g.title}</h2>
              <p className="text-sm text-muted">{g.blurb}</p>
            </div>
            {g.title !== "Guild goals" && <Link href={`/faculty/challenges/new?kind=${g.kind}`} className="text-sm font-bold text-brand underline">Start from scratch</Link>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.filter(g.pick).map((t) => (
              <Link key={t.key} href={`/faculty/challenges/new?template=${t.key}`} className="panel flex flex-col gap-1.5 p-4 transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-extrabold">{t.title}</span>
                  <span className="font-pixel text-lg text-gold">+{t.xpReward}</span>
                </span>
                <span className="line-clamp-3 text-sm text-muted">{t.description}</span>
                <span className="mt-auto pt-1 text-sm font-bold">
                  {t.metric ? `${t.target} ${METRICS[t.metric].unit} · ` : t.language ? `${t.language === "cpp" ? "C++" : "C"} · ` : ""}{t.days} days
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
