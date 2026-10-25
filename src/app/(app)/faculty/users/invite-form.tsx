"use client";

import { useActionState, useState } from "react";
import { createInvite, type FormState } from "@/modules/auth/actions";
import { SubmitButton } from "@/components/submit-button";

export function InviteForm({ origin }: { origin: string }) {
  const [state, action] = useActionState<FormState, FormData>(createInvite, {});
  const [copied, setCopied] = useState(false);
  const link = state.ok ? `${origin}/register?code=${state.ok}` : "";

  return (
    <div className="panel space-y-4 p-5">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="inv-email" className="field-label">E-mail address to invite</label>
          <input id="inv-email" name="email" type="email" required className="field" />
        </div>
        <div>
          <label htmlFor="inv-role" className="field-label">Role</label>
          <select id="inv-role" name="role" defaultValue="STUDENT" className="field">
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
          </select>
        </div>
        <SubmitButton pending="Creating code...">Create invitation</SubmitButton>
      </form>
      {state.error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-danger">{state.error}</p>}
      {state.ok && (
        <div role="status" className="rounded-md border border-gold bg-gold-soft p-4">
          <p className="mb-1">Invitation code created. Give this to the student:</p>
          <p className="mb-2 font-mono text-xl font-bold">{state.ok}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly value={link} aria-label="Registration link" className="field font-mono text-sm" />
            <button
              type="button" className="btn-ghost shrink-0"
              onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
