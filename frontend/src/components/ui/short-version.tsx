import * as React from "react";
import { cn } from "@/lib/utils";

export interface ShortVersionProps {
  /** The bullets — pass plain <li> children, 2 to 4 of them. */
  children: React.ReactNode;
  className?: string;
}

/**
 * "The short version" box for the top of long pages: 2-4 bullets a slow
 * reader gets in 30 seconds. Renders a bordered accent-soft section with
 * an h2 heading and a bulleted list at text-base.
 */
export function ShortVersion({ children, className }: ShortVersionProps) {
  return (
    <section
      aria-label="The short version"
      className={cn("rounded-lg border border-line bg-accent-soft p-4 sm:p-5", className)}
    >
      <h2 className="text-lg font-semibold text-ink">The short version</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-ink">
        {children}
      </ul>
    </section>
  );
}
