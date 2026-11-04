"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quests, statusLogs } from "@/db/schema";
import { audit } from "@/lib/audit";
import { isStale, LIMITS, SUBMIT_XP_DAILY_CAP } from "@/lib/rules";
import { requireUser } from "@/modules/auth/session";
import { awardXp, submissionsPaidToday } from "@/modules/progression/service";
import { fetchPrMeta, isPullRequestUrl } from "./github";
import { assignPending, moveReviewer } from "./service";
import { removeAttachment, uploadAttachment } from "./storage";

export type QuestFormState = { error?: string; fields?: Record<string, string> };

const questInput = z
  .object({
    title: z.string().trim().min(1, "Give your quest a title.").max(LIMITS.title, "Title is limited to 120 characters."),
    link: z.string().trim().max(LIMITS.link).optional(),
    snippet: z.string().max(LIMITS.snippet, "Snippets are limited to 10,000 characters.").optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"], { message: "Pick a difficulty." }),
    language: z.enum(["c", "cpp"], { message: "Pick C or C++. The Guild only reviews those two during the pilot." }),
    context: z
      .string()
      .trim()
      .min(LIMITS.contextMin, "Say in a sentence what this code should do, so your reviewer knows what to check.")
      .max(LIMITS.context, "Keep the context under 500 characters."),
    notes: z.string().trim().max(LIMITS.notes, "Keep your notes under 1,000 characters.").optional(),
    confirm: z.literal("on", { message: "Confirm that this code is not graded or confidential." }),
  })
  .refine((v) => (v.link ?? "") !== "" || (v.snippet ?? "").trim() !== "", {
    message: "Add a GitHub pull request link or paste a code snippet.",
  })
  .refine((v) => !v.link || isPullRequestUrl(v.link), {
    message: "The link must be a GitHub pull request, like https://github.com/owner/repo/pull/12",
  });

//FR-08 to FR-14, FR-27, UC-03
export async function createQuest(_: QuestFormState, form: FormData): Promise<QuestFormState> {
  const user = await requireUser({ role: "STUDENT" });
  const raw = {
    title: String(form.get("title") ?? ""),
    link: String(form.get("link") ?? ""),
    snippet: String(form.get("snippet") ?? ""),
    difficulty: String(form.get("difficulty") ?? ""),
    language: String(form.get("language") ?? ""),
    context: String(form.get("context") ?? ""),
    notes: String(form.get("notes") ?? ""),
  };
  const parsed = questInput.safeParse({ ...raw, confirm: form.get("confirm") ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: raw };
  const d = parsed.data;

  //Network work happens before the transaction so a slow GitHub never holds database locks
  const meta = d.link ? await fetchPrMeta(d.link) : null;

  let attachmentRef: string | null = null;
  const file = form.get("attachment");
  if (file instanceof File && file.size > 0) {
    const up = await uploadAttachment(file);
    if ("error" in up) return { error: up.error, fields: raw };
    attachmentRef = up.ref;
  }

  let result: { refNo: number; paid: boolean };
  try {
    //NFR-08: quest, history, assignment, notification, and XP commit together or not at all
    result = await db.transaction(async (tx) => {
      const [q] = await tx
        .insert(quests)
        .values({
          title: d.title,
          link: d.link || null,
          snippet: d.snippet?.trim() ? d.snippet : null,
          difficulty: d.difficulty,
          language: d.language,
          context: d.context,
          notes: d.notes ? d.notes : null,
          prTitle: meta?.title ?? null,
          prSize: meta?.size ?? null,
          attachmentRef,
          submitterId: user.id,
        })
        .returning({ id: quests.id, refNo: quests.refNo, title: quests.title, submitterId: quests.submitterId });
      await tx.insert(statusLogs).values({ questId: q.id, fromStatus: null, toStatus: "PENDING", changedBy: user.id });
      await audit(tx, user.id, "STATUS_CHANGE", `quest:${q.id} created`);
      await assignPending(tx, q);
      //assignPending holds the assignment lock until commit, so two quests sent at
      //once are counted one after the other and cannot both slip under the cap
      const paid = (await submissionsPaidToday(tx, user.id)) < SUBMIT_XP_DAILY_CAP;
      if (paid) await awardXp(tx, user.id, "SUBMIT_QUEST", q.id);
      return { refNo: q.refNo, paid };
    });
  } catch (e) {
    if (attachmentRef) await removeAttachment(attachmentRef);
    console.error("createQuest failed", e);
    return { error: "Your quest could not be saved. Nothing was submitted, please try again.", fields: raw };
  }

  //The header shows XP, and layouts are reused between pages, so redraw it
  revalidatePath("/", "layout");
  redirect(`/quests/${result.refNo}?submitted=${result.paid ? "1" : "nox"}`);
}

//FR-34: any Student except the submitter and the current reviewer may take over a Stale quest
export async function claimQuest(questId: string) {
  const user = await requireUser({ role: "STUDENT" });
  const refNo = await db.transaction(async (tx) => {
    const [q] = await tx.select().from(quests).where(eq(quests.id, questId)).for("update").limit(1);
    if (!q || !isStale(q.status, q.assignedAt)) return null;
    if (q.submitterId === user.id || q.reviewerId === user.id) return null;
    await moveReviewer(tx, q, user.id, "CLAIMED");
    return q.refNo;
  });
  if (refNo === null) {
    revalidatePath("/board");
    redirect("/board?claim=gone");
  }
  redirect(`/quests/${refNo}/review`);
}
