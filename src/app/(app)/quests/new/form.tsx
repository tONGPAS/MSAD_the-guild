"use client";

import { useActionState } from "react";
import { createQuest, type QuestFormState } from "@/modules/quests/actions";
import { Gem, RARITY, type Difficulty } from "@/components/badges";
import { SubmitButton } from "@/components/submit-button";

//Full class strings per rarity so Tailwind keeps them
const PICKED: Record<Difficulty, string> = {
  EASY: "peer-checked:border-common peer-checked:bg-common-soft",
  MEDIUM: "peer-checked:border-rare peer-checked:bg-rare-soft",
  HARD: "peer-checked:border-epic peer-checked:bg-epic-soft",
};
const LEVELS = (["EASY", "MEDIUM", "HARD"] as const).map((v) => ({ v, ...RARITY[v] }));

export function NewQuestForm({ attachments, xpLeftToday }: { attachments: boolean; xpLeftToday: number }) {
  const [state, action] = useActionState<QuestFormState, FormData>(createQuest, {});
  const f = state.fields;
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="panel space-y-4 p-6">
        {state.error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-danger">{state.error}</p>}
        <div>
          <label htmlFor="title" className="field-label">Title</label>
          <input id="title" name="title" required maxLength={120} defaultValue={f?.title} placeholder="e.g. Stack push and pop using a linked list" className="field" />
        </div>
        <div>
          <label htmlFor="link" className="field-label">GitHub pull request link</label>
          <input id="link" name="link" type="url" defaultValue={f?.link} placeholder="https://github.com/owner/repo/pull/12" className="field" />
        </div>
        <p className="text-center text-sm text-muted">or</p>
        <div>
          <label htmlFor="snippet" className="field-label">Paste a code snippet</label>
          <textarea id="snippet" name="snippet" rows={12} maxLength={10000} defaultValue={f?.snippet} spellCheck={false} className="field font-mono text-sm" />
        </div>
      </div>

      <div className="space-y-6">
        <fieldset className="panel p-5">
          <legend className="field-label px-1">Difficulty</legend>
          <p className="mb-2 text-sm text-muted">How hard was this to write? It tells your reviewer what to expect.</p>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <label key={l.v} className="cursor-pointer">
                <input type="radio" name="difficulty" value={l.v} defaultChecked={(f?.difficulty ?? "MEDIUM") === l.v} className="peer sr-only" />
                <span className={`flex flex-col items-center gap-1 rounded-xl border-2 border-b-4 border-line border-b-edge bg-surface px-1 py-3 transition-transform peer-checked:-translate-y-0.5 peer-focus-visible:outline-3 peer-focus-visible:outline-gold motion-reduce:transition-none ${PICKED[l.v]}`}>
                  <Gem level={l.v} size={26} />
                  <span className={`text-sm font-extrabold ${l.text}`}>{l.rarity}</span>
                  <span className="text-xs text-muted">{l.diff}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {attachments && (
          <div className="panel p-5">
            <label htmlFor="attachment" className="field-label">Screenshot or GIF (optional)</label>
            <input id="attachment" name="attachment" type="file" accept="image/png,image/jpeg,image/gif" className="block w-full text-sm" />
            <p className="mt-1 text-sm text-muted">PNG, JPG, or GIF, up to 5 MB.</p>
          </div>
        )}

        <div className="panel p-5">
          <label className="flex cursor-pointer gap-3">
            <input type="checkbox" name="confirm" required className="mt-1 h-5 w-5 accent-[var(--brand)]" />
            <span>This code is not graded or confidential.</span>
          </label>
        </div>

        <SubmitButton pending="Submitting..." className="btn-gold w-full text-lg">Submit quest</SubmitButton>
        <p className="-mt-3 text-center text-sm text-muted">
          {xpLeftToday > 0
            ? <>Earns <span className="font-pixel text-base text-gold">+10 XP</span> ({xpLeftToday} of 3 quest rewards left today)</>
            : "You've used today's 3 quest rewards. You can still post; it just won't earn XP."}
        </p>
      </div>
    </form>
  );
}
