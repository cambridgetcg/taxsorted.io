"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const doors = [
  { href: "/uk/politics", label: "Overview" },
  { href: "/uk/politics/system", label: "System" },
  { href: "/uk/politics/integrity", label: "Money & power" },
  { href: "/uk/politics/people", label: "People & offices" },
  { href: "/uk/politics/funding", label: "Funding" },
  { href: "/uk/politics/api", label: "Data API" },
  { href: "/uk/politics/method", label: "Method" },
];

export function PoliticsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="UK politics" className="flex flex-wrap gap-2">
      {doors.map((door) => {
        const active = door.href === "/uk/politics"
          ? pathname === door.href
          : pathname.startsWith(door.href);
        return (
          <Link
            key={door.href}
            href={door.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${active ? "border-accent bg-accent text-white" : "border-line bg-white text-ink hover:border-accent hover:bg-accent-soft"}`}
          >
            {door.label}
          </Link>
        );
      })}
    </nav>
  );
}
