import "server-only";
import type { DB } from "@/db";
import { auditLogs } from "@/db/schema";

//SR-05 action names
export type AuditAction =
  | "SIGN_IN"
  | "SIGN_IN_FAILED"
  | "ACCOUNT_LOCKED"
  | "SIGN_OUT"
  | "REGISTER"
  | "CONSENT"
  | "INVITE_CREATED"
  | "ACCOUNT_DEACTIVATED"
  | "ACCOUNT_REACTIVATED"
  | "ASSIGNMENT"
  | "STATUS_CHANGE"
  | "CLAIM"
  | "EXPORT";

export async function audit(db: DB, userId: string | null, action: AuditAction, target?: string) {
  await db.insert(auditLogs).values({ userId, action, target });
}
