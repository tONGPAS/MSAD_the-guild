import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold">You don&apos;t have access to that page</h1>
      <p className="mb-6 text-muted">That page belongs to a different role. Nothing on it was shown to you.</p>
      <Link href="/" className="btn-primary">Go to your home page</Link>
    </main>
  );
}
