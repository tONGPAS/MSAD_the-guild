import { GuildMark } from "@/components/guild-mark";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <GuildMark size={40} />
          <div>
            <p className="font-display text-2xl font-extrabold leading-none text-brand">The Guild</p>
            <p className="text-sm text-muted">Peer code review, CPE Department, CIT-U</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
