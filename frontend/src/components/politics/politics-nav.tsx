"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Each door has a distinct plain meaning — no two labels
// should sound like the same thing to a first-time reader.
const doors = [
  { href: "/uk/politics", label: "Start" },
  { href: "/uk/politics/system", label: "How power works" },
  { href: "/uk/politics/decisions", label: "Change a decision" },
  { href: "/uk/politics/stand", label: "Stand for office" },
  { href: "/uk/politics/integrity", label: "Police & public money" },
  { href: "/uk/politics/people", label: "Your MP" },
  { href: "/uk/politics/funding", label: "Party donations" },
  { href: "/uk/politics/api", label: "For developers" },
  { href: "/uk/politics/method", label: "Our rules" },
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
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-base font-medium transition-colors ${active ? "border-accent bg-accent text-white" : "border-line bg-white text-ink hover:border-accent hover:bg-accent-soft"}`}
          >
            {door.label}
          </Link>
        );
      })}
    </nav>
  );
}
