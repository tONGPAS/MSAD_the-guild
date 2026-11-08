"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, challengeEntries, challenges } from "@/db/schema";
import { requireUser } from "@/modules/auth/session";
import { awardXp } from "@/modules/progression/service";
import { checkReview, readPayload, type ReviewFormState } from "@/modules/reviews/rubric";
import { getChallenge, isActive } from "./service";
import { CHALLENGE_LIMITS as L } from "./templates";

export type ChallengeFormState = { error?: string };

const base = z.object({
  title: z.string().trim().min(3, "Give the challenge a title.").max(80),
  description: z.string().trim().min(10, "Describe the challenge in a sentence or two.").max(1000),
  xpReward: z.coerce.number().int().min(5, "The reward must be at least 5 XP.").max(L.maxXp, `Keep the reward at ${L.maxXp} XP or less so XP stays fair.`),
  days: z.coerce.number().int().min(1, "Run it for at least 1 day.").max(L.maxDays, `Run it for ${L.maxDays} days at most.`),
  language: z.enum(["c", "cpp"]).default("c"),
});
const schema = z.discriminatedUnion("kind", [
  base.extend({
    kind: z.literal("GOAL"),
    scope: z.enum(["PERSONAL", "GUILD"]),
    metric: z.enum(["REVIEWS", "PRAISE", "DEEP_REVIEWS", "FAST_RESOLVES", "HELPFUL", "COINS"], { message: "Pick what the goal counts." }),
    target: z.coerce.number().int().min(1, "The target must be at least 1.").max(L.maxTarget, `Keep the target at ${L.maxTarget} or less.`),
  }),
  base.extend({ kind: z.literal("CODING") }),
  base.extend({
    kind: z.literal("REVIEW"),
    code: z.string().min(10, "Paste the code students will review.").max(10000),
    context: z.string().trim().max(500).optional(),
  }),
]);

//CR-02: a Guild Master publishes a challenge, usually starting from a template
export async function createChallenge(_: ChallengeFormState, form: FormData): Promise<ChallengeFormState> {
  const user = await requireUser({ role: "FACULTY" });
  const raw = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const now = new Date();
  const [ch] = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(challenges)
      .values({
        kind: d.kind,
        scope: d.kind === "GOAL" ? d.scope : "PERSONAL",
        metric: d.kind === "GOAL" ? d.metric : null,
        target: d.kind === "GOAL" ? d.target : null,
        title: d.title,
        description: d.description,
        code: d.kind === "REVIEW" ? d.code : null,
        context: d.kind === "REVIEW" && d.context ? d.context : null,
        language: d.language,
        xpReward: d.xpReward,
        startsAt: now,
        endsAt: new Date(now.getTime() + d.days * 86_400_000),
        templateKey: raw.templateKey ? raw.templateKey.slice(0, 40) : null,
        createdBy: user.id,
      })
      .returning({ id: challenges.id });
    await tx.insert(auditLogs).values({ userId: user.id, action: "CHALLENGE_CREATE", target: rows[0].id });
    return rows;
  });
  revalidatePath("/", "layout");
  redirect(`/faculty/challenges/${ch.id}?created=1`);
}

//Ending early keeps everything already earned; nobody loses XP
export async function endChallenge(id: string) {
  const user = await requireUser({ role: "FACULTY" });
  const ch = await getChallenge(id);
  if (!ch || !isActive(ch)) return;
  await db.transaction(async (tx) => {
    await tx.update(challenges).set({ endsAt: new Date() }).where(eq(challenges.id, id));
    await tx.insert(auditLogs).values({ userId: user.id, action: "CHALLENGE_END", target: id });
  });
  revalidatePath("/", "layout");
}

const REVIEW_CHALLENGE_WORDS = 30;

//A review challenge entry: same rubric as a real review, at least 30 words, once per student
export async function submitChallengeReview(id: string, _: ReviewFormState, form: FormData): Promise<ReviewFormState> {
  const user = await requireUser({ role: "STUDENT" });
  const ch = await getChallenge(id);
  if (!ch || ch.kind !== "REVIEW") return { error: "This challenge does not exist." };
  if (!isActive(ch)) return { error: "This challenge has ended." };
  const { missing, scores, comments } = checkReview(readPayload(form));
  if (missing.length) return { missing };
  const words = comments.map((c) => c.body).join(" ").split(/\s+/).filter(Boolean).length;
  if (words < REVIEW_CHALLENGE_WORDS) return { error: `Write at least ${REVIEW_CHALLENGE_WORDS} words in your comments (you have ${words}). Say why each problem matters.` };

  const ok = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(challengeEntries)
      .values({ challengeId: id, userId: user.id, review: { ...scores, comments }, words, completedAt: new Date() })
      .onConflictDoNothing()
      .returning({ id: challengeEntries.id });
    if (rows.length === 0) return false;
    await awardXp(tx, user.id, "CHALLENGE", id, ch.xpReward);
    return true;
  });
  if (!ok) return { error: "You already took this challenge." };
  revalidatePath("/", "layout");
  redirect(`/challenges/${id}?done=1`);
}
