"use client";

import { useActionState } from "react";
import { requestMentor, type MentorFormState } from "@/modules/mentor/actions";
import { SubmitButton } from "@/components/submit-button";

//FR-35: kept folded so it reads as an option, not a step every student must take
export function MentorRequestForm({ questId }: { questId: string }) {
  const [state, action] = useActionState<MentorFormState, FormData>(requestMentor.bind(null, questId), {});
  return (
    <details className="panel p-4">
      <summary className="cursor-pointer font-bold">Need a faculty mentor to look at this?</summary>
      <form action={action} className="mt-3 space-y-3">
        <p className="text-sm text-muted">Use this when the peer review was unclear, you disagree with it, or nobody is reviewing. All faculty are notified and one picks it up.</p>
        {state.error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-danger">{state.error}</p>}
        <label htmlFor="mentor-reason" className="field-label">What should the mentor look at?</label>
        <textarea id="mentor-reason" name="reason" required maxLength={500} rows={3} placeholder="e.g. The reviewer says my loop is wrong, but my tests pass. Who is right?" className="field" />
        <SubmitButton pending="Sending...">Request mentor review</SubmitButton>
      </form>
    </details>
  );
}
