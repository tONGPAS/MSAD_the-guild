"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/modules/auth/session";
import { checkReview, readPayload, type ReviewFormState } from "@/modules/reviews/rubric";
import { findIn, isUnlocked, levelOf, type TrainingProgress } from "./training";

//FR-46: finishing or skipping both count, so the tour never reappears on its own
export async function finishTour() {
  const user = await requireUser();
  await db.update(users).set({ tourDoneAt: new Date() }).where(eq(users.id, user.id));
}

//Practice review: same checks as a real one, then Bit grades which planted problems were mentioned.
//Only the best score per level is stored. No XP and no quest (BRL-05 stays about real reviews).
export async function submitTraining(n: number, _: ReviewFormState, form: FormData): Promise<ReviewFormState> {
  const user = await requireUser();
  const level = levelOf(n);
  if (!level) return { error: "That level does not exist." };
  const [row] = await db.select({ p: users.trainingProgress }).from(users).where(eq(users.id, user.id));
  const progress = (row?.p ?? {}) as TrainingProgress;
  if (!isUnlocked(progress, n)) return { error: "Finish the level before this one first." };

  const { missing, comments } = checkReview(readPayload(form));
  if (missing.length) return { missing };
  const text = comments.map((c) => c.body).join("\n");
  const words = text.split(/\s+/).filter(Boolean).length;
  const found = findIn(level, text);

  const key = String(n) as "1";
  const next = { ...progress, [key]: Math.max(progress[key] ?? 0, found.length) };
  await db
    .update(users)
    .set({ trainingProgress: next, ...(n === 3 ? { trainingDoneAt: new Date() } : {}) })
    .where(eq(users.id, user.id));
  redirect(`/training/${n}?found=${found.join(",") || "none"}&words=${words}`);
}
