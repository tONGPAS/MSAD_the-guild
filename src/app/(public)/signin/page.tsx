import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "./form";
import { Pip } from "@/components/pip";
import { PIP } from "@/lib/pip-lines";

export const metadata: Metadata = { title: "Sign in" };

//SC-02
export default function SignInPage() {
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold">Sign in</h1>
      <p className="mb-6 text-muted">Peer code review for the CPE Department.</p>
      <Pip lines={[...PIP.signin]} pose="wave" size={72} className="mb-6" />
      <SignInForm />
      <p className="mt-6 text-sm text-muted">
        Have an invitation code? <Link href="/register" className="font-bold text-brand underline">Create your account</Link>
      </p>
    </>
  );
}
