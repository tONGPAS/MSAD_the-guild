"use client";

import { useActionState, useState } from "react";
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
  const [contextLen, setContextLen] = useState((f?.context ?? "").length);
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

      {/*Reviews of code with no context come out vague; a sentence of intent makes them specific*/}
      <fieldset className="panel space-y-4 p-6 lg:col-start-1">
        <legend className="flex items-center gap-2 px-1 font-display text-lg font-extrabold">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <path d="M5 3 H15 A3 3 0 0 1 18 6 V17 A2 2 0 0 0 20 19 H8 A3 3 0 0 1 5 16 Z" fill="var(--gold-soft)" stroke="var(--gold-deep)" strokeWidth="1.6" />
            <path d="M8 8 H15 M8 11 H15 M8 14 H12" stroke="var(--gold-deep)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Brief your reviewer
        </legend>
        <div>
          <label htmlFor="context" className="field-label">What should this code do?</label>
          <textarea
            id="context" name="context" required minLength={10} maxLength={500} rows={3} defaultValue={f?.context}
            onChange={(e) => setContextLen(e.target.value.trim().length)}
            placeholder="e.g. Reads up to 10 grades and prints the average. It should handle an empty list without crashing."
            aria-describedby="context-hint" className="field"
          />
          <p id="context-hint" className={`mt-1 text-sm ${contextLen >= 10 ? "text-ok" : "text-muted"}`}>
            {contextLen >= 10 ? "Good. Your reviewer knows what to check." : "A sentence or two is enough."} <span className="font-pixel">{contextLen}/500</span>
          </p>
        </div>
        <div>
          <label htmlFor="notes" className="field-label">Notes for your reviewer <span className="font-normal text-muted">(optional)</span></label>
          <textarea
            id="notes" name="notes" maxLength={1000} rows={3} defaultValue={f?.notes}
            placeholder="e.g. I'm not sure my loop condition is right. Is there a cleaner way to free the list?"
            className="field"
          />
        </div>
      </fieldset>

      <div className="space-y-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
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
