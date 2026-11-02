import { z } from "zod";
import { LIMITS } from "@/lib/rules";

export type ReviewFormState = { missing?: string[]; error?: string };

export function readPayload(form: FormData): unknown {
  try {
    return JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return {};
  }
}

const score = z.coerce.number().int().min(1).max(5);

//FR-18 to FR-21, BRL-07: lists every missing item instead of stopping at the first
export function checkReview(raw: unknown) {
  const missing: string[] = [];
  const v = (raw ?? {}) as Record<string, unknown>;
  const scores = {} as Record<"readability" | "correctness" | "structure", number>;
  for (const k of ["readability", "correctness", "structure"] as const) {
    const r = score.safeParse(v[k]);
    if (r.success) scores[k] = r.data;
    else missing.push(`A ${k} score from 1 to 5`);
  }
  const list = Array.isArray(v.comments) ? v.comments : [];
  const cleaned = list
    .map((c) => ({ kind: String((c as { kind?: unknown }).kind), body: String((c as { body?: unknown }).body ?? "").trim() }))
    .filter((c) => (c.kind === "ISSUE" || c.kind === "PRAISE") && c.body.length > 0)
    .map((c) => ({ kind: c.kind as "ISSUE" | "PRAISE", body: c.body.slice(0, LIMITS.comment) }));
  if (cleaned.length === 0) missing.push("At least one Issue or Praise comment");
  return { missing, scores, comments: cleaned };
}

