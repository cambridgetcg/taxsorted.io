import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  href: string;
  label: string;
}

export interface BreadcrumbsProps {
  /** Links between Home and the current page, in order. Usually the section hub. */
  items?: BreadcrumbItem[];
  /** The page the reader is on now — plain text, not a link. */
  current: string;
  className?: string;
}

/**
 * "You are here" trail for the top of every deep page:
 * Home → section hub → current page. The current page is marked with
 * aria-current="page" and is not a link. Arrows are decoration only.
 */
export function Breadcrumbs({ items = [], current, className }: BreadcrumbsProps) {
  const links: BreadcrumbItem[] = [{ href: "/", label: "Home" }, ...items];
  return (
    <nav aria-label="You are here" className={cn("text-base text-ink-soft", className)}>
      <ol className="flex flex-wrap items-center gap-x-2">
        {links.map((item) => (
          <li key={item.href} className="flex items-center gap-x-2">
            <Link
              href={item.href}
              className="inline-flex min-h-11 items-center text-accent underline underline-offset-4 hover:text-accent-deep"
            >
              {item.label}
            </Link>
            <span aria-hidden="true">→</span>
          </li>
        ))}
        <li className="flex min-h-11 items-center">
          <span aria-current="page" className="font-medium text-ink">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
