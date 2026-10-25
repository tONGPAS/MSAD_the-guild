"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { quests, statusLogs } from "@/db/schema";
import { audit } from "@/lib/audit";
import { LIMITS } from "@/lib/rules";
import { requireUser } from "@/modules/auth/session";
import { awardXp } from "@/modules/progression/service";
import { fetchPrMeta, isPullRequestUrl } from "./github";
import { assignPending } from "./service";
import { removeAttachment, uploadAttachment } from "./storage";

export type QuestFormState = { error?: string; fields?: Record<string, string> };

const questInput = z
  .object({
    title: z.string().trim().min(1, "Give your quest a title.").max(LIMITS.title, "Title is limited to 120 characters."),
    link: z.string().trim().max(LIMITS.link).optional(),
    snippet: z.string().max(LIMITS.snippet, "Snippets are limited to 10,000 characters.").optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"], { message: "Pick a difficulty." }),
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

  let refNo: number;
  try {
    //NFR-08: quest, history, assignment, notification, and XP commit together or not at all
    refNo = await db.transaction(async (tx) => {
      const [q] = await tx
        .insert(quests)
        .values({
          title: d.title,
          link: d.link || null,
          snippet: d.snippet?.trim() ? d.snippet : null,
          difficulty: d.difficulty,
          prTitle: meta?.title ?? null,
          prSize: meta?.size ?? null,
          attachmentRef,
          submitterId: user.id,
        })
        .returning({ id: quests.id, refNo: quests.refNo, title: quests.title, submitterId: quests.submitterId });
      await tx.insert(statusLogs).values({ questId: q.id, fromStatus: null, toStatus: "PENDING", changedBy: user.id });
      await audit(tx, user.id, "STATUS_CHANGE", `quest:${q.id} created`);
      await assignPending(tx, q);
      await awardXp(tx, user.id, "SUBMIT_QUEST", q.id);
      return q.refNo;
    });
  } catch (e) {
    if (attachmentRef) await removeAttachment(attachmentRef);
    console.error("createQuest failed", e);
    return { error: "Your quest could not be saved. Nothing was submitted, please try again.", fields: raw };
  }

  redirect(`/quests/${refNo}?submitted=1`);
}
