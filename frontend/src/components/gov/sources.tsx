import * as React from "react";

// i18n: deferred to M2 — plain English for launch

export interface SourceLink {
  href: string;
  label: string;
}

/**
 * External link that opens in a new tab, with a hidden hint so screen-reader
 * users know before they activate it. Use for every link that leaves the site.
 */
export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={className ?? "font-medium text-accent underline hover:text-accent-deep"}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/**
 * One collected source list for a whole page, folded under a plain "Sources"
 * summary. Replaces the old per-section "Sources:" paragraphs — every link
 * those paragraphs carried lives here, and the small citation marker next to
 * each fact still works exactly as before.
 */
export function PageSources({ links }: { links: SourceLink[] }) {
  return (
    <details className="mt-8 rounded-2xl border border-line bg-white px-5 py-2 sm:px-6">
      <summary className="cursor-pointer py-3 text-base font-semibold text-ink">Sources</summary>
      <p className="mt-1 text-base text-ink-soft">
        Every official page this guide relies on. Links open in a new tab.
      </p>
      <ul className="mt-2 list-disc pb-3 pl-5 text-base text-ink-soft">
        {links.map((l) => (
          <li key={l.href}>
            <ExternalLink
              href={l.href}
              className="inline-flex min-h-11 items-center font-medium text-accent underline hover:text-accent-deep"
            >
              {l.label}
            </ExternalLink>
          </li>
        ))}
      </ul>
    </details>
  );
}
