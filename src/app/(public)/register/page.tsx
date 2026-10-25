import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./form";

export const metadata: Metadata = { title: "Create account" };

//SC-01
export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { code } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-3xl font-bold">Create your account</h1>
      <p className="mb-6 text-muted">You need the invitation code a faculty member gave you. Codes work once and expire after 7 days.</p>
      <RegisterForm code={typeof code === "string" ? code : ""} />
      <p className="mt-6 text-sm text-muted">
        Already registered? <Link href="/signin" className="font-bold text-brand underline">Sign in</Link>
      </p>
    </>
  );
}
