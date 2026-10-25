"use server";

import { randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { INVITE_TTL_DAYS, LIMITS, LOCKOUT_MINUTES, MAX_FAILED_LOGINS } from "@/lib/rules";
import { assignWaitingQuests } from "@/modules/quests/service";
import { createSession, destroySession, endAllSessions, requireUser } from "./session";

export type FormState = { error?: string; ok?: string; fields?: Record<string, string> };

const email = z.string().trim().toLowerCase().email("Enter a valid e-mail address.").max(254);
const password = z.string().min(8, "Password must be at least 8 characters.").max(72);

//Hash compared when the e-mail is unknown so response time does not reveal which accounts exist
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), 10);
const GENERIC_FAIL = "E-mail address or password is incorrect.";

//FR-02, NFR-03, AC-02
export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1) }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: GENERIC_FAIL };
  const { email: addr, password: pw } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, addr)).limit(1);
  if (!user) {
    await bcrypt.compare(pw, DUMMY_HASH);
    return { error: GENERIC_FAIL, fields: { email: addr } };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return { error: `Too many failed attempts. This account is locked for ${mins} more minute(s).` };
  }

  const ok = await bcrypt.compare(pw, user.passwordHash);
  if (!ok || user.status !== "ACTIVE") {
    //Atomic increment so two parallel attempts cannot both read the same count
    const [after] = await db
      .update(users)
      .set({ failedLogins: sql`${users.failedLogins} + 1` })
      .where(eq(users.id, user.id))
      .returning({ failed: users.failedLogins });
    await audit(db, user.id, "SIGN_IN_FAILED");
    if (after.failed >= MAX_FAILED_LOGINS) {
      await db
        .update(users)
        .set({ failedLogins: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000) })
        .where(eq(users.id, user.id));
      await audit(db, user.id, "ACCOUNT_LOCKED");
      return { error: `Too many failed attempts. This account is locked for ${LOCKOUT_MINUTES} minutes.` };
    }
    return { error: GENERIC_FAIL, fields: { email: addr } };
  }

  await db.update(users).set({ failedLogins: 0, lockedUntil: null }).where(eq(users.id, user.id));
  await createSession(user.id);
  await audit(db, user.id, "SIGN_IN");
  redirect(user.consentAt ? "/" : "/consent");
}

//FR-01, BRL-01, AC-01
export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      code: z.string().trim().toUpperCase().min(1, "Enter your invitation code.").max(32),
      name: z.string().trim().min(1, "Enter your name.").max(LIMITS.name),
      email,
      password,
    })
    .safeParse({
      code: form.get("code"),
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    });
  const fields = { code: String(form.get("code") ?? ""), name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const d = parsed.data;
  const passwordHash = await bcrypt.hash(d.password, 10);

  const result = await db.transaction(async (tx) => {
    //FOR UPDATE locks the invitation row so the same code cannot register two accounts at once
    const [inv] = await tx.select().from(invitations).where(eq(invitations.code, d.code)).for("update").limit(1);
    if (!inv) return { error: "That invitation code does not exist." };
    if (inv.usedAt) return { error: "That invitation code was already used. Ask Faculty for a new one." };
    if (inv.expiresAt < new Date()) return { error: "That invitation code has expired. Ask Faculty for a new one." };
    if (inv.email !== d.email) return { error: "Use the e-mail address the invitation was issued to." };

    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, d.email)).limit(1);
    if (existing) return { error: "An account with this e-mail already exists. Sign in instead." };

    const [user] = await tx
      .insert(users)
      .values({ name: d.name, email: d.email, passwordHash, role: inv.role })
      .returning({ id: users.id });
    await tx.update(invitations).set({ usedAt: new Date() }).where(eq(invitations.id, inv.id));
    await audit(tx, user.id, "REGISTER", `invitation:${inv.id}`);
    return { userId: user.id };
  });

  if ("error" in result) return { error: result.error, fields };
  await createSession(result.userId);
  redirect("/consent");
}

//FR-07
export async function acceptConsent() {
  const user = await requireUser({ allowNoConsent: true });
  await db.update(users).set({ consentAt: new Date() }).where(and(eq(users.id, user.id), sql`${users.consentAt} is null`));
  await audit(db, user.id, "CONSENT");
  //A new Student joins the reviewer pool, so quests stuck in Pending can be assigned now
  if (user.role === "STUDENT") await assignWaitingQuests();
  redirect("/");
}

export async function signOut() {
  const user = await requireUser({ allowNoConsent: true });
  await audit(db, user.id, "SIGN_OUT");
  await destroySession();
  redirect("/signin");
}

//Readable code without look-alike characters (no 0/O, 1/I)
function newInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += alphabet[randomInt(alphabet.length)];
  return `GUILD-${s.slice(0, 5)}-${s.slice(5)}`;
}

//FR-04, UC-02
export async function createInvite(_: FormState, form: FormData): Promise<FormState> {
  const faculty = await requireUser({ role: "FACULTY" });
  const parsed = z
    .object({ email, role: z.enum(["STUDENT", "FACULTY"]) })
    .safeParse({ email: form.get("email"), role: form.get("role") ?? "STUDENT" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing) return { error: "That e-mail address already has an account. No code was issued." };

  const code = newInviteCode();
  const [inv] = await db
    .insert(invitations)
    .values({
      code,
      email: parsed.data.email,
      role: parsed.data.role,
      issuedBy: faculty.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
    })
    .returning({ id: invitations.id });
  await audit(db, faculty.id, "INVITE_CREATED", `invitation:${inv.id}`);
  revalidatePath("/faculty/users");
  return { ok: code };
}

//FR-05
export async function setAccountActive(userId: string, active: boolean) {
  const faculty = await requireUser({ role: "FACULTY" });
  if (userId === faculty.id) return;
  await db.transaction(async (tx) => {
    await tx.update(users).set({ status: active ? "ACTIVE" : "INACTIVE" }).where(eq(users.id, userId));
    if (!active) await endAllSessions(tx, userId);
    await audit(tx, faculty.id, active ? "ACCOUNT_REACTIVATED" : "ACCOUNT_DEACTIVATED", `user:${userId}`);
  });
  revalidatePath("/faculty/users");
}
