"use client";

import { useActionState, useState } from "react";
import type { ReviewFormState } from "@/modules/reviews/rubric";
import { CommentIcon } from "@/components/comment-icon";
import { SubmitButton } from "@/components/submit-button";

type Kind = "ISSUE" | "PRAISE";
type Draft = { id: number; kind: Kind; body: string };

const CRITERIA = [
  { key: "readability", label: "Readability", hint: "Names, formatting, comments", icon: "M2 10 C5 4 15 4 18 10 C15 16 5 16 2 10 Z M10 7.5 A2.5 2.5 0 1 1 10 12.5 A2.5 2.5 0 1 1 10 7.5 Z" },
  { key: "correctness", label: "Correctness", hint: "Does it do what it should, edge cases", icon: "M10 1.5 L17 4 V9.5 C17 14 14 17 10 18.5 C6 17 3 14 3 9.5 V4 Z M6.5 10 L9 12.5 L13.5 7.5" },
  { key: "structure", label: "Structure", hint: "Functions, organization, duplication", icon: "M2.5 2.5 H8.5 V8.5 H2.5 Z M11.5 2.5 H17.5 V8.5 H11.5 Z M2.5 11.5 H8.5 V17.5 H2.5 Z M11.5 11.5 H17.5 V17.5 H11.5 Z" },
] as const;
type Key = (typeof CRITERIA)[number]["key"];

//OBJ3 target: median written feedback of at least 30 words
const WORD_GOAL = 30;

type ReviewAction = (state: ReviewFormState, form: FormData) => Promise<ReviewFormState>;

//Shared by peer reviews (FR-18 to FR-21) and faculty mentor reviews (FR-39)
//xp is what the reviewer earns; faculty mentor reviews pass 0
export function ReviewForm({ submit, xp = 0 }: { submit: ReviewAction; xp?: number }) {
  const [state, action] = useActionState<ReviewFormState, FormData>(submit, {});
  const [scores, setScores] = useState<Partial<Record<Key, number>>>({});
  const [comments, setComments] = useState<Draft[]>([]);
  const [kind, setKind] = useState<Kind>("ISSUE");
  const [text, setText] = useState("");

  //Text still in the box counts as a comment, so a forgotten "Add" click loses nothing
  const all = text.trim() ? [...comments, { id: 0, kind, body: text.trim() }] : comments;
  const words = all.reduce((n, c) => n + c.body.trim().split(/\s+/).filter(Boolean).length, 0);

  function add() {
    if (!text.trim()) return;
    setComments((cs) => [...cs, { id: Date.now(), kind, body: text.trim() }]);
    setText("");
  }

  return (
    <form action={action} className="panel space-y-6 p-5 lg:sticky lg:top-4 lg:self-start">
      <div className="-mx-5 -mt-5 flex items-center justify-between gap-2 rounded-t-[10px] border-b-2 border-line bg-sunken px-5 py-3">
        <span className="font-display text-lg font-extrabold">Review sheet</span>
        {xp > 0 && <span className="font-pixel rounded-full bg-gold-soft px-2.5 text-lg text-gold">+{xp} XP</span>}
      </div>
      <input type="hidden" name="payload" value={JSON.stringify({ ...scores, comments: all })} />

      {(state.missing || state.error) && (
        <div role="alert" className="rounded-md bg-danger-soft p-3 text-danger">
          {state.error ?? (
            <>
              <p className="font-bold">Your review is missing:</p>
              <ul className="list-disc pl-5">{state.missing!.map((m) => <li key={m}>{m}</li>)}</ul>
            </>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-bold">Rubric</h2>
        {CRITERIA.map((c) => {
          const v = scores[c.key] ?? 0;
          return (
            <fieldset key={c.key}>
              <legend className="flex items-center gap-2 font-bold">
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><path d={c.icon} fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>
                {c.label}
              </legend>
              <p className="mb-2 text-sm text-muted">{c.hint}</p>
              {/*Gems fill up to the chosen score, like a stat bar; the number stays on each gem*/}
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input
                      type="radio" name={c.key} value={n} className="peer sr-only"
                      checked={v === n} onChange={() => setScores((s) => ({ ...s, [c.key]: n }))}
                    />
                    <span
                      className={`font-pixel grid h-11 w-11 place-items-center rounded-lg border-2 border-b-4 text-xl transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-gold ${
                        n <= v ? "border-gold-deep bg-gold-bright text-[#2b1d00]" : "border-line border-b-edge bg-sunken text-muted hover:border-gold"
                      }`}
                    >
                      {n}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">Comments</h2>
        {comments.length > 0 && (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className={`anim-pop flex gap-2 rounded-lg border-2 bg-sunken p-3 ${c.kind === "ISSUE" ? "border-danger/40" : "border-gold/50"}`}>
                <div className="min-w-0 flex-1">
                  <p className={`flex items-center gap-1.5 text-sm font-bold ${c.kind === "ISSUE" ? "text-danger" : "text-gold"}`}><CommentIcon kind={c.kind} size={16} />{c.kind === "ISSUE" ? "Issue" : "Praise"}</p>
                  <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
                </div>
                <button type="button" onClick={() => setComments((cs) => cs.filter((x) => x.id !== c.id))} className="self-start text-sm text-muted underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div role="radiogroup" aria-label="Comment type" className="flex gap-2">
          {(["ISSUE", "PRAISE"] as const).map((k) => (
            <button
              key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
              className={`btn flex-1 border-2 border-b-4 ${kind === k ? (k === "ISSUE" ? "border-danger bg-danger-soft text-danger" : "border-gold-deep bg-gold-soft text-gold") : "border-line border-b-edge bg-surface text-muted"}`}
            >
              <CommentIcon kind={k} />
              {k === "ISSUE" ? "Issue" : "Praise"}
            </button>
          ))}
        </div>
        <label htmlFor="comment" className="sr-only">Comment text</label>
        <textarea
          id="comment" rows={4} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={kind === "ISSUE" ? "Line 12: the loop skips the last item when..." : "Clear function names, easy to follow."}
          className="field text-sm"
        />
        <button type="button" onClick={add} disabled={!text.trim()} className="btn-ghost w-full">Add {kind === "ISSUE" ? "issue" : "praise"}</button>
        {/*Depth meter toward the OBJ3 goal of 30+ words*/}
        <div>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-bold">Depth</span>
            <span className={`font-pixel text-base ${words >= WORD_GOAL ? "text-ok" : "text-muted"}`}>{words}/{WORD_GOAL} words</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-line bg-sunken" aria-hidden>
            <div className={`h-full transition-[width] duration-300 ${words >= WORD_GOAL ? "bg-ok" : "bg-gold-bright"}`} style={{ width: `${Math.min(100, (words / WORD_GOAL) * 100)}%` }} />
          </div>
          <p className={`mt-1 text-sm ${words >= WORD_GOAL ? "font-bold text-ok" : "text-muted"}`}>
            {words >= WORD_GOAL ? "Good depth. This will really help them." : `Aim for ${WORD_GOAL}+ words so your feedback is useful.`}
          </p>
        </div>
      </div>

      <SubmitButton pending="Sending review..." className="btn-gold w-full text-lg">Submit review</SubmitButton>
    </form>
  );
}
