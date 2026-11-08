"use client";

import { useActionState, useState } from "react";
import { createChallenge, type ChallengeFormState } from "@/modules/challenges/actions";
import { CHALLENGE_LIMITS as L, METRICS, type Metric, type Template } from "@/modules/challenges/templates";
import { SubmitButton } from "@/components/submit-button";

const LANGS = [["c", "C"], ["cpp", "C++"]] as const;

export function ChallengeForm({ t }: { t: Template }) {
  const [state, action] = useActionState<ChallengeFormState, FormData>(createChallenge, {});
  const [scope, setScope] = useState(t.scope);
  return (
    <form action={action} className="panel grid max-w-3xl gap-5 p-5">
      {state.error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-danger">{state.error}</p>}
      <input type="hidden" name="kind" value={t.kind} />
      <input type="hidden" name="templateKey" value={t.key} />
      <div>
        <label htmlFor="title" className="field-label">Title</label>
        <input id="title" name="title" required minLength={3} maxLength={80} defaultValue={t.title} className="field" />
      </div>
      <div>
        <label htmlFor="description" className="field-label">{t.kind === "CODING" ? "The task" : "Description"}</label>
        <textarea id="description" name="description" required minLength={10} maxLength={1000} rows={4} defaultValue={t.description} className="field" />
      </div>

      {t.kind === "GOAL" && (
        <>
          <fieldset>
            <legend className="field-label">Who works toward it</legend>
            <div className="flex flex-wrap gap-2">
              {(["PERSONAL", "GUILD"] as const).map((s) => (
                <label key={s} className="cursor-pointer">
                  <input type="radio" name="scope" value={s} checked={scope === s} onChange={() => setScope(s)} className="peer sr-only" />
                  <span className="block rounded-lg border-2 border-b-4 border-line bg-surface px-3 py-1.5 font-bold peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand peer-focus-visible:outline-3 peer-focus-visible:outline-gold">
                    {s === "PERSONAL" ? "Each student" : "The whole Guild together"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="metric" className="field-label">What it counts</label>
              <select id="metric" name="metric" defaultValue={t.metric} className="field">
                {(Object.keys(METRICS) as Metric[]).map((m) => <option key={m} value={m}>{METRICS[m].label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="target" className="field-label">{scope === "GUILD" ? "Guild target" : "Target per student"}</label>
              <input id="target" name="target" type="number" required min={1} max={L.maxTarget} defaultValue={t.target} className="field" />
            </div>
          </div>
        </>
      )}

      {t.kind !== "GOAL" && (
        <fieldset>
          <legend className="field-label">Language</legend>
          <div className="flex gap-2">
            {LANGS.map(([v, label]) => (
              <label key={v} className="cursor-pointer">
                <input type="radio" name="language" value={v} defaultChecked={(t.language ?? "c") === v} className="peer sr-only" />
                <span className="block rounded-lg border-2 border-b-4 border-line bg-surface px-4 py-1.5 font-mono font-bold peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand peer-focus-visible:outline-3 peer-focus-visible:outline-gold">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {t.kind === "REVIEW" && (
        <>
          <div>
            <label htmlFor="context" className="field-label">What the code should do <span className="font-normal text-muted">(shown as the brief)</span></label>
            <input id="context" name="context" maxLength={500} defaultValue={t.context} className="field" />
          </div>
          <div>
            <label htmlFor="code" className="field-label">Code to review</label>
            <textarea id="code" name="code" required rows={14} maxLength={10000} defaultValue={t.code} spellCheck={false} className="field font-mono text-sm" />
            <p className="mt-1 text-sm text-muted">Shown exactly as typed, spacing included, so you can plant readability problems too.</p>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="xpReward" className="field-label">XP reward</label>
          <input id="xpReward" name="xpReward" type="number" required min={5} max={L.maxXp} defaultValue={t.xpReward} className="field" />
          <p className="mt-1 text-sm text-muted">5 to {L.maxXp}. A review is worth 25 XP, for scale.</p>
        </div>
        <div>
          <label htmlFor="days" className="field-label">Runs for (days)</label>
          <input id="days" name="days" type="number" required min={1} max={L.maxDays} defaultValue={t.days} className="field" />
        </div>
      </div>
      <SubmitButton pending="Publishing..." className="btn-gold justify-self-start">Publish challenge</SubmitButton>
    </form>
  );
}
