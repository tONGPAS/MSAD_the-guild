"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/modules/auth/actions";
import { SubmitButton } from "@/components/submit-button";

export function SignInForm() {
  const [state, action] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className="panel space-y-4 p-6">
      {state.error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-danger">{state.error}</p>}
      <div>
        <label htmlFor="email" className="field-label">E-mail address</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} className="field" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      <SubmitButton pending="Signing in..." className="btn-primary w-full">Sign in</SubmitButton>
    </form>
  );
}
