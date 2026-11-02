"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/modules/auth/session";
import { checkReview, readPayload, type ReviewFormState } from "@/modules/reviews/rubric";
import { findBugs } from "./training";

//FR-46: finishing or skipping both count, so the tour never reappears on its own
export async function finishTour() {
  const user = await requireUser();
  await db.update(users).set({ tourDoneAt: new Date() }).where(eq(users.id, user.id));
}

//Practice review: same checks as a real one, then Pip grades which planted bugs were mentioned.
//Nothing is stored except the completion time; no XP (BRL-01 stays about real reviews).
export async function submitTraining(_: ReviewFormState, form: FormData): Promise<ReviewFormState> {
  const user = await requireUser();
  const { missing, comments } = checkReview(readPayload(form));
  if (missing.length) return { missing };
  const text = comments.map((c) => c.body).join("\n");
  const words = text.split(/\s+/).filter(Boolean).length;
  const found = findBugs(text);
  await db.update(users).set({ trainingDoneAt: new Date() }).where(eq(users.id, user.id));
  redirect(`/training?found=${found.join(",") || "none"}&words=${words}`);
}
