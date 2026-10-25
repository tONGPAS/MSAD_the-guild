import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, type DB } from "@/db";
import { sessions, users, type Role } from "@/db/schema";
import { SESSION_IDLE_MINUTES } from "@/lib/rules";

const COOKIE = "guild_session";

//Only a hash of the token is stored, so a leaked database cannot be replayed as cookies
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token) });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  jar.delete(COOKIE);
}

//FR-05: deactivation ends every session of the account at once
export async function endAllSessions(tx: DB, userId: string) {
  await tx.delete(sessions).where(eq(sessions.userId, userId));
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  consented: boolean;
  xpTotal: number;
  rank: string;
};

//cache() dedupes this to one database read per request
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, hashToken(token)))
    .limit(1);
  if (!row) return null;

  const idleMs = Date.now() - row.session.lastSeenAt.getTime();
  if (idleMs > SESSION_IDLE_MINUTES * 60_000 || row.user.status !== "ACTIVE") {
    await db.delete(sessions).where(eq(sessions.id, row.session.id));
    return null;
  }

  //Throttled touch keeps the idle clock fresh without a write on every request
  if (idleMs > 60_000) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.session.id));
  }

  const u = row.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    consented: u.consentAt !== null,
    xpTotal: u.xpTotal,
    rank: u.rank,
  };
});

//SEC-01, SEC-04: every page and action calls this before touching data
export async function requireUser(opts: { role?: Role; allowNoConsent?: boolean } = {}) {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  if (!user.consented && !opts.allowNoConsent) redirect("/consent");
  if (opts.role && user.role !== opts.role) redirect("/forbidden");
  return user;
}
