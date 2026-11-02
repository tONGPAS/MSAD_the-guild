"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; count?: number };

//Tabs like a game menu: the current screen is lifted onto the page colour
export function NavTabs({ items }: { items: NavItem[] }) {
  const path = usePathname();
  //Longest matching prefix wins, so /quests/new lights "New quest", not "My quests"
  const active = items
    .filter((n) => path === n.href || path.startsWith(n.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1">
      {items.map((n) => {
        const on = n.href === active;
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? "page" : undefined}
            className={`relative -mb-[3px] rounded-t-lg border-x-2 border-t-2 px-3 py-2 text-sm font-bold sm:text-base ${
              on ? "border-gold-bright bg-canvas text-ink" : "border-transparent text-white/85 hover:bg-white/10 hover:text-white"
            }`}
          >
            {n.label}
            {!!n.count && (
              <span className="font-pixel ml-1.5 inline-block min-w-6 rounded-full bg-gold-bright px-1.5 text-center text-sm text-[#2b1d00]" aria-label={`${n.count} waiting`}>
                {n.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
