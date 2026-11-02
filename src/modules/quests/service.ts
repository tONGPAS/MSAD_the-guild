import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNotNull, lt, ne, notExists, notInArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type DB } from "@/db";
import { mentorRequests, quests, reassignments, statusLogs, users, type Quest, type QuestStatus } from "@/db/schema";
import { audit } from "@/lib/audit";
import { formatRef, isStale, REASSIGN_DAYS } from "@/lib/rules";
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

//Moves an In Review quest to a new reviewer (FR-15 overdue, FR-34 claim).
//The reassignment row is what counts as a missed review for the old reviewer's streak.
export async function moveReviewer(
  tx: DB,
  q: Pick<Quest, "id" | "refNo" | "title" | "reviewerId" | "submitterId">,
  toReviewer: string,
  reason: "OVERDUE" | "CLAIMED",
) {
  if (!q.reviewerId) return;
  const now = new Date();
  await tx.update(quests).set({ reviewerId: toReviewer, assignedAt: now }).where(eq(quests.id, q.id));
  await tx.update(users).set({ lastAssignedAt: now }).where(eq(users.id, toReviewer));
  await tx.insert(reassignments).values({ questId: q.id, fromReviewer: q.reviewerId, toReviewer, reason });
  await audit(tx, reason === "CLAIMED" ? toReviewer : null, reason === "CLAIMED" ? "CLAIM" : "REASSIGN", `quest:${q.id} ${q.reviewerId}->${toReviewer}`);
  const ref = formatRef(q.refNo);
  await notify(
    tx,
    q.reviewerId,
    reason === "CLAIMED"
      ? `${ref} went stale and a classmate claimed it. You no longer need to review it.`
      : `${ref} was reassigned because its review was ${REASSIGN_DAYS} days overdue.`,
    q.id,
  );
  await notify(tx, toReviewer, `New quest to review: ${ref} "${q.title}"`, q.id);
  await notify(tx, q.submitterId, `${ref} has a new reviewer.`, q.id);
}

//FR-15, BRL-08: daily step. Quests with an open mentor request are left alone, a mentor is on it.
export async function reassignOverdue(now = Date.now()) {
  const cutoff = new Date(now - REASSIGN_DAYS * 86_400_000);
  const overdue = await db
    .select({ id: quests.id })
    .from(quests)
    .where(
      and(
        eq(quests.status, "IN_REVIEW"),
        lt(quests.assignedAt, cutoff),
        notExists(
          db
            .select({ one: sql`1` })
            .from(mentorRequests)
            .where(and(eq(mentorRequests.questId, quests.id), ne(mentorRequests.status, "RESOLVED"))),
        ),
      ),
    );
  let moved = 0;
  for (const { id } of overdue) {
    await db.transaction(async (tx) => {
      const [q] = await tx.select().from(quests).where(eq(quests.id, id)).for("update").limit(1);
      //Re-checked under the row lock, so a review saved a moment ago is never taken away
      if (!q || q.status !== "IN_REVIEW" || !q.assignedAt || q.assignedAt >= cutoff || !q.reviewerId) return;
      const next = await pickReviewer(tx, q.submitterId, [q.reviewerId]);
      if (!next) return;
      await moveReviewer(tx, q, next, "OVERDUE");
      moved++;
    });
  }
  return moved;
}

//FR-32: every open quest, without code or names. Stale (FR-33) is worked out live.
export async function questBoard() {
  const now = Date.now();
  const rows = await db
    .select({
      id: quests.id,
      refNo: quests.refNo,
      title: quests.title,
      difficulty: quests.difficulty,
      status: quests.status,
      createdAt: quests.createdAt,
      assignedAt: quests.assignedAt,
      prSize: quests.prSize,
      submitterId: quests.submitterId,
      reviewerId: quests.reviewerId,
    })
    .from(quests)
    .where(inArray(quests.status, ["PENDING", "IN_REVIEW"]))
    .orderBy(asc(quests.createdAt));
  return rows.map((r) => ({ ...r, stale: isStale(r.status, r.assignedAt, now) }));
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

export type QuestFilters = { status?: QuestStatus; difficulty?: "EASY" | "MEDIUM" | "HARD"; q?: string };

//FR-41: every quest, filterable by status, difficulty, and title or person
export async function allQuests(f: QuestFilters = {}) {
  const reviewer = alias(users, "reviewer");
  const term = f.q?.trim() ? `%${f.q.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;
  return db
    .select({ ...questListCols, submitter: users.name })
    .from(quests)
    .innerJoin(users, eq(users.id, quests.submitterId))
    .leftJoin(reviewer, eq(reviewer.id, quests.reviewerId))
    .where(
      and(
        f.status ? eq(quests.status, f.status) : undefined,
        f.difficulty ? eq(quests.difficulty, f.difficulty) : undefined,
        term ? or(ilike(quests.title, term), ilike(users.name, term), ilike(reviewer.name, term)) : undefined,
      ),
    )
    .orderBy(desc(quests.createdAt))
    .limit(300);
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
      mentorRequests: {
        orderBy: (m, { desc }) => [desc(m.createdAt)],
        with: { handler: { columns: { id: true, name: true } } },
      },
      reassignments: {
        orderBy: (r, { asc }) => [asc(r.createdAt)],
        with: { from: { columns: { name: true } }, to: { columns: { name: true } } },
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

