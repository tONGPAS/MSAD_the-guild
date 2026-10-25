"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pending, className = "btn-primary" }: { children: React.ReactNode; pending: string; className?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" disabled={busy} className={className}>
      {busy ? pending : children}
    </button>
  );
}
