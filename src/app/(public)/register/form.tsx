"use client";

import { useActionState } from "react";
import { register, type FormState } from "@/modules/auth/actions";
import { SubmitButton } from "@/components/submit-button";

export function RegisterForm({ code }: { code: string }) {
  const [state, action] = useActionState<FormState, FormData>(register, {});
  const f = state.fields;
  return (
    <form action={action} className="panel space-y-4 p-6">
      {state.error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-danger">{state.error}</p>}
      <div>
        <label htmlFor="code" className="field-label">Invitation code</label>
        <input id="code" name="code" required defaultValue={f?.code ?? code} placeholder="GUILD-XXXXX-XXXXX" className="field font-mono uppercase" />
      </div>
      <div>
        <label htmlFor="name" className="field-label">Full name</label>
        <input id="name" name="name" required maxLength={100} autoComplete="name" defaultValue={f?.name} className="field" />
      </div>
      <div>
        <label htmlFor="email" className="field-label">E-mail address</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={f?.email} className="field" />
        <p className="mt-1 text-sm text-muted">Use the address your invitation was sent to.</p>
      </div>
      <div>
        <label htmlFor="password" className="field-label">Password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
        <p className="mt-1 text-sm text-muted">At least 8 characters.</p>
      </div>
      <SubmitButton pending="Creating account..." className="btn-primary w-full">Create account</SubmitButton>
    </form>
  );
}
