export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center">
      <div className="w-full max-w-md">
        <p className="mb-6 font-display text-2xl font-bold text-brand">The Guild</p>
        {children}
      </div>
    </main>
  );
}
