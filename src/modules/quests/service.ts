import "server-only";
import { and, asc, desc, eq, isNotNull, notInArray, sql } from "drizzle-orm";
import { db, type DB } from "@/db";
import { quests, statusLogs, users, type Quest, type QuestStatus } from "@/db/schema";
import { audit } from "@/lib/audit";
import { formatRef } from "@/lib/rules";
import { notify } from "@/modules/notifications/service";
import type { SessionUser } from "@/modules/auth/session";

//BRL-04: the only legal moves of a quest
const ALLOWED: Record<QuestStatus, QuestStatus[]> = {
  PENDING: ["IN_REVIEW"],
  IN_REVIEW: ["COMPLETED", "PENDING"],
  COMPLETED: ["RESOLVED"],
  RESOLVED: [],
};

//FR-26: status change and its history row are written together or not at all
export async function transition(
  tx: DB,
  questId: string,
  from: QuestStatus,
  to: QuestStatus,
  by: string | null,
  extra: Partial<Pick<Quest, "reviewerId" | "assignedAt" | "completedAt" | "resolvedAt">> = {},
) {
  if (!ALLOWED[from].includes(to)) throw new Error(`Illegal quest transition ${from} -> ${to}`);
  //"where status = from" makes a second, racing request update nothing
  const updated = await tx
    .update(quests)
    .set({ status: to, ...extra })
    .where(and(eq(quests.id, questId), eq(quests.status, from)))
    .returning({ id: quests.id });
  if (updated.length === 0) return false;
  await tx.insert(statusLogs).values({ questId, fromStatus: from, toStatus: to, changedBy: by });
  await audit(tx, by, "STATUS_CHANGE", `quest:${questId} ${from}->${to}`);
  return true;
}

//Fixed key for pg_advisory_xact_lock: only one assignment runs at a time, so two
//simultaneous submissions can never both pick the same "next" reviewer
const ASSIGN_LOCK = 4242;

//FR-12, FR-13, BRL-02: round-robin over active Students who are not the submitter.
//The Student whose last assignment is oldest (or who never had one) goes next.
export async function pickReviewer(tx: DB, submitterId: string, exclude: string[] = []) {
  await tx.execute(sql`select pg_advisory_xact_lock(${ASSIGN_LOCK})`);
  const skip = [submitterId, ...exclude];
  const [next] = await tx
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.role, "STUDENT"),
        eq(users.status, "ACTIVE"),
        isNotNull(users.consentAt),
        notInArray(users.id, skip),
      ),
    )
    .orderBy(sql`${users.lastAssignedAt} asc nulls first`, asc(users.createdAt))
    .limit(1);
  return next?.id ?? null;
}

//Assigns a Pending quest; returns the reviewer id, or null if the pool is empty (UC-03 7a)
export async function assignPending(tx: DB, quest: Pick<Quest, "id" | "refNo" | "title" | "submitterId">) {
  const reviewerId = await pickReviewer(tx, quest.submitterId);
  if (!reviewerId) return null;
  const now = new Date();
  const moved = await transition(tx, quest.id, "PENDING", "IN_REVIEW", null, { reviewerId, assignedAt: now });
  if (!moved) return null;
  await tx.update(users).set({ lastAssignedAt: now }).where(eq(users.id, reviewerId));
  await audit(tx, null, "ASSIGNMENT", `quest:${quest.id} reviewer:${reviewerId}`);
  //FR-14
  await notify(tx, reviewerId, `New quest to review: ${formatRef(quest.refNo)} "${quest.title}"`, quest.id);
  return reviewerId;
}

//Quests left Pending because nobody was eligible get a reviewer once someone joins
export async function assignWaitingQuests() {
  const waiting = await db
    .select({ id: quests.id, refNo: quests.refNo, title: quests.title, submitterId: quests.submitterId })
    .from(quests)
    .where(eq(quests.status, "PENDING"))
    .orderBy(asc(quests.createdAt))
    .limit(20);
  for (const q of waiting) {
    await db.transaction(async (tx) => {
      const reviewer = await assignPending(tx, q);
      if (reviewer) await notify(tx, q.submitterId, `${formatRef(q.refNo)} now has a reviewer.`, q.id);
    });
  }
}

const questListCols = {
  id: quests.id,
  refNo: quests.refNo,
  title: quests.title,
  difficulty: quests.difficulty,
  status: quests.status,
  createdAt: quests.createdAt,
  assignedAt: quests.assignedAt,
  prSize: quests.prSize,
};

//FR-16
export async function myQuests(userId: string) {
  return db.select(questListCols).from(quests).where(eq(quests.submitterId, userId)).orderBy(desc(quests.createdAt));
}

//FR-17: open assignments first, then past ones for the reviewer's own record
export async function myAssignments(userId: string) {
  return db
    .select(questListCols)
    .from(quests)
    .where(eq(quests.reviewerId, userId))
    .orderBy(sql`case when ${quests.status} = 'IN_REVIEW' then 0 else 1 end`, asc(quests.assignedAt));
}

//FR-41 (early version for Release 1 testing)
export async function allQuests() {
  return db.select({ ...questListCols, submitter: users.name }).from(quests)
    .innerJoin(users, eq(users.id, quests.submitterId))
    .orderBy(desc(quests.createdAt))
    .limit(200);
}

export async function openAssignmentCount(userId: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(quests)
    .where(and(eq(quests.reviewerId, userId), eq(quests.status, "IN_REVIEW")));
  return r?.n ?? 0;
}

//BRL-10, NFR-13: code and review text only for people taking part, plus Faculty
export async function getQuestForViewer(refNo: number, viewer: SessionUser) {
  const quest = await db.query.quests.findFirst({
    where: eq(quests.refNo, refNo),
    with: {
      submitter: { columns: { id: true, name: true } },
      reviewer: { columns: { id: true, name: true } },
      reviews: {
        orderBy: (r, { asc }) => [asc(r.createdAt)],
        with: {
          reviewer: { columns: { id: true, name: true, role: true } },
          comments: {
            orderBy: (c, { asc }) => [asc(c.createdAt)],
            with: { author: { columns: { id: true, name: true } } },
          },
        },
      },
      statusLogs: {
        orderBy: (s, { asc }) => [asc(s.changedAt)],
        with: { changer: { columns: { name: true } } },
      },
    },
  });
  if (!quest) return null;
  const isSubmitter = quest.submitterId === viewer.id;
  const isReviewer = quest.reviewerId === viewer.id;
  const isFaculty = viewer.role === "FACULTY";
  if (!isSubmitter && !isReviewer && !isFaculty) return null;
  return { quest, isSubmitter, isReviewer, isFaculty };
}

