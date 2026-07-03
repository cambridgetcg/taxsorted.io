"use client";

// i18n: deferred to M2 — plain English for launch

import { useId, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CitedSource {
  source: string;
  si?: string;
  note?: string;
  effectiveFrom: string;
}

/**
 * A number that can prove itself. Renders `children` inline with a small
 * ⓘ toggle button; clicking (or activating via keyboard) reveals the
 * source link, SI reference and effective-from date it came from.
 *
 * Deliberately a click-to-reveal disclosure, not a hover tooltip — it has
 * to work the same on a touchscreen as it does with a keyboard.
 */
export function Cited({ cite, children }: { cite: CitedSource; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <span className="inline-flex flex-wrap items-baseline gap-1 align-baseline">
      <span>{children}</span>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Show source for this figure"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded-full text-ink-soft",
          "hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        )}
      >
        <Info aria-hidden className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <span
          id={panelId}
          role="note"
          className="ml-1 block w-full basis-full rounded-lg border border-line bg-accent-soft px-3 py-2 text-xs text-ink-soft"
        >
          <a
            href={cite.source}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent hover:text-accent-deep"
          >
            {cite.source}
          </a>
          {cite.si ? <span className="block">SI: {cite.si}</span> : null}
          <span className="block">Effective from {cite.effectiveFrom}</span>
          {cite.note ? <span className="block">{cite.note}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
