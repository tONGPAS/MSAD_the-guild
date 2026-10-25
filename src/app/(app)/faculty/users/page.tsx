import type { Metadata } from "next";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { setAccountActive } from "@/modules/auth/actions";
import { requireUser } from "@/modules/auth/session";
import { SubmitButton } from "@/components/submit-button";
import { ago } from "@/lib/time";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Members" };

//SC-11, UC-02, FR-04, FR-05
export default async function MembersPage() {
  const me = await requireUser({ role: "FACULTY" });
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const [members, invites] = await Promise.all([
    db.select().from(users).orderBy(users.role, users.name),
    db.select({ inv: invitations, issuer: users.name }).from(invitations).innerJoin(users, eq(users.id, invitations.issuedBy)).orderBy(desc(invitations.createdAt)).limit(30),
  ]);
  const now = new Date();

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-1 text-3xl font-bold">Members</h1>
        <p className="mb-4 text-muted">Only people with an invitation code can join. Each code works once, for one e-mail address, for 7 days.</p>
        <InviteForm origin={origin} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Recent invitations</h2>
        {invites.length === 0 ? (
          <p className="panel p-6 text-muted">No invitations yet.</p>
        ) : (
          <ul className="panel divide-y divide-line text-sm">
            {invites.map(({ inv, issuer }) => {
              const state = inv.usedAt ? "Used" : inv.expiresAt < now ? "Expired" : "Waiting";
              return (
                <li key={inv.id} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
                  <span className="min-w-48 flex-1 font-bold">{inv.email}</span>
                  <span className="text-muted">{inv.role === "FACULTY" ? "Faculty" : "Student"}</span>
                  <span className="font-mono">{state === "Waiting" ? inv.code : ""}</span>
                  <span className={state === "Waiting" ? "text-warn" : "text-muted"}>{state}</span>
                  <span className="text-muted">by {issuer}, {ago(inv.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Accounts</h2>
        <ul className="panel divide-y divide-line">
          {members.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="min-w-48 flex-1">
                <span className="block font-bold">{u.name}{u.id === me.id && " (you)"}</span>
                <span className="block text-sm text-muted">{u.email}</span>
              </span>
              <span className="text-sm text-muted">{u.role === "FACULTY" ? "Faculty" : `Student, ${u.xpTotal} XP`}</span>
              <span className={`text-sm font-bold ${u.status === "ACTIVE" ? "text-ok" : "text-danger"}`}>{u.status === "ACTIVE" ? "Active" : "Inactive"}</span>
              {u.id !== me.id && (
                <form action={setAccountActive.bind(null, u.id, u.status !== "ACTIVE")}>
                  <SubmitButton pending="Saving..." className="btn-ghost text-sm">{u.status === "ACTIVE" ? "Deactivate" : "Reactivate"}</SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
