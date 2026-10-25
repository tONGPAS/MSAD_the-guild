import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db, type DB } from "@/db";
import { notifications } from "@/db/schema";

//SR-04, EI-08: notifications are stored rows shown in-app, nothing is sent out
export async function notify(tx: DB, userId: string, message: string, relatedQuestId?: string) {
  await tx.insert(notifications).values({ userId, message, relatedQuestId });
}

export async function unreadCount(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export async function listNotifications(userId: string, limit = 50) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
