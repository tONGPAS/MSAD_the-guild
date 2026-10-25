import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { acceptConsent, signOut } from "@/modules/auth/actions";
import { requireUser } from "@/modules/auth/session";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Privacy notice" };

//FR-07, CON-03 (RA 10173). Wording should be confirmed with the instructor before the pilot.
export default async function ConsentPage() {
  const user = await requireUser({ allowNoConsent: true });
  if (user.consented) redirect("/");
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="mb-6 font-display text-2xl font-bold text-brand">The Guild</p>
      <h1 className="mb-4 text-3xl font-bold">Privacy notice</h1>
      <div className="panel space-y-3 p-6">
        <p>Hi {user.name}. Before you continue, here is what The Guild stores about you and why, in line with the Data Privacy Act of 2012 (RA 10173).</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>What we collect:</strong> your name, e-mail address, the code you submit, the reviews you write and receive, and your experience points.</li>
          <li><strong>Who sees it:</strong> your code and review text are visible only to you, your assigned reviewer or submitter, and CPE faculty. Other students see only your rank, XP, streak, and badges.</li>
          <li><strong>Reports:</strong> exports and dashboard totals replace student names with codes.</li>
          <li><strong>How long:</strong> account data and submitted code are deleted or anonymized 30 days after the pilot ends.</li>
          <li><strong>Graded work:</strong> only submit code that is not graded or confidential.</li>
        </ul>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <form action={acceptConsent}>
          <SubmitButton pending="Saving...">I agree, continue</SubmitButton>
        </form>
        <form action={signOut}>
          <button type="submit" className="btn-ghost">Sign out instead</button>
        </form>
      </div>
    </main>
  );
}
