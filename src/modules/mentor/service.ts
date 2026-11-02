import "server-only";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db, type DB } from "@/db";
import { mentorRequests, quests, users } from "@/db/schema";

const listCols = {
  id: mentorRequests.id,
  reason: mentorRequests.reason,
  status: mentorRequests.status,
  createdAt: mentorRequests.createdAt,
  resolvedAt: mentorRequests.resolvedAt,
  handledBy: mentorRequests.handledBy,
  questId: quests.id,
  refNo: quests.refNo,
  title: quests.title,
  difficulty: quests.difficulty,
  questStatus: quests.status,
  submitter: users.name,
};

const base = () =>
  db.select(listCols).from(mentorRequests).innerJoin(quests, eq(quests.id, mentorRequests.questId)).innerJoin(users, eq(users.id, quests.submitterId));

//FR-37: oldest first, so nobody waits behind newer requests
export async function pendingRequests() {
  return base().where(eq(mentorRequests.status, "PENDING")).orderBy(asc(mentorRequests.createdAt));
}

//FR-38: once picked up, a request belongs to that one Faculty member
export async function myOpenRequests(facultyId: string) {
  return base()
    .where(and(eq(mentorRequests.status, "IN_PROGRESS"), eq(mentorRequests.handledBy, facultyId)))
    .orderBy(asc(mentorRequests.createdAt));
}

export async function myResolvedRequests(facultyId: string, limit = 10) {
  return base()
    .where(and(eq(mentorRequests.status, "RESOLVED"), eq(mentorRequests.handledBy, facultyId)))
    .orderBy(desc(mentorRequests.resolvedAt))
    .limit(limit);
}

export async function pendingCount() {
  const [r] = await db.select({ n: count() }).from(mentorRequests).where(eq(mentorRequests.status, "PENDING"));
  return r?.n ?? 0;
}

export async function getRequest(id: string) {
  return db.query.mentorRequests.findFirst({
    where: eq(mentorRequests.id, id),
    with: { quest: { with: { submitter: { columns: { name: true } } } } },
  });
}

//An open request blocks Resolve, so the submitter cannot close a quest a mentor is about to review
export async function hasOpenMentorRequest(questId: string, tx: DB = db) {
  const [r] = await tx
    .select({ id: mentorRequests.id })
    .from(mentorRequests)
    .where(and(eq(mentorRequests.questId, questId), inArray(mentorRequests.status, ["PENDING", "IN_PROGRESS"])))
    .limit(1);
  return !!r;
}
