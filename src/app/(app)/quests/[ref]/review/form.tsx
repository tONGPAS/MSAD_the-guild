"use client";

import { useActionState, useState } from "react";
import { submitReview, type ReviewFormState } from "@/modules/reviews/actions";
import { SubmitButton } from "@/components/submit-button";

type Kind = "ISSUE" | "PRAISE";
type Draft = { id: number; kind: Kind; body: string };

const CRITERIA = [
  { key: "readability", label: "Readability", hint: "Names, formatting, comments" },
  { key: "correctness", label: "Correctness", hint: "Does it do what it should, edge cases" },
  { key: "structure", label: "Structure", hint: "Functions, organization, duplication" },
] as const;
type Key = (typeof CRITERIA)[number]["key"];

//OBJ3 target: median written feedback of at least 30 words
const WORD_GOAL = 30;

export function ReviewForm({ questId }: { questId: string }) {
  const [state, action] = useActionState<ReviewFormState, FormData>(submitReview.bind(null, questId), {});
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
        {CRITERIA.map((c) => (
          <fieldset key={c.key}>
            <legend className="font-bold">{c.label}</legend>
            <p className="mb-2 text-sm text-muted">{c.hint}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer">
                  <input
                    type="radio" name={c.key} value={n} className="peer sr-only"
                    checked={scores[c.key] === n} onChange={() => setScores((s) => ({ ...s, [c.key]: n }))}
                  />
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line font-bold peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:outline-3 peer-focus-visible:outline-gold">
                    {n}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">Comments</h2>
        {comments.length > 0 && (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className={`flex gap-2 rounded-md border-l-4 bg-canvas p-3 ${c.kind === "ISSUE" ? "border-danger" : "border-ok"}`}>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${c.kind === "ISSUE" ? "text-danger" : "text-ok"}`}>{c.kind === "ISSUE" ? "Issue" : "Praise"}</p>
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
              className={`btn flex-1 border ${kind === k ? (k === "ISSUE" ? "border-danger bg-danger-soft text-danger" : "border-ok bg-ok-soft text-ok") : "border-line"}`}
            >
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
        <p className={`text-sm ${words >= WORD_GOAL ? "text-ok" : "text-muted"}`}>
          {words} words written. {words >= WORD_GOAL ? "Good depth." : `Aim for ${WORD_GOAL}+ so your feedback is useful.`}
        </p>
      </div>

      <SubmitButton pending="Sending review..." className="btn-primary w-full">Submit review</SubmitButton>
    </form>
  );
}
