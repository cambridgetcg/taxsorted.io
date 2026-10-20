import type { SVGProps } from "react";

export interface TaxSortedMarkProps extends SVGProps<SVGSVGElement> {
  /** "regular" from 24px; "small" is the separate 16-grid drawing for 16-23px. */
  size?: "regular" | "small";
}

/**
 * The TaxSorted mark, "The Common Reader": a reader over an open book.
 * Pages and binding take currentColor. The reader reads --ts-mark-reader and
 * falls back to currentColor, so the mark is one colour wherever the page has
 * not set that variable on :root. Never set it on a component: the
 * forced-colours override on :root must win.
 *
 * Decorative by default: put it inside a link or heading that already names
 * TaxSorted. This file owns the mark's geometry; docs/design/brand/render-brand.py
 * checks the native master against it before exporting anything.
 */
export function TaxSortedMark({ size = "regular", ...props }: TaxSortedMarkProps) {
  if (size === "small") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" {...props}>
        <path
          fill="currentColor"
          d="M7 8.5L3 7V10.5L7 12ZM9 8.5L13 7V10.5L9 12ZM7 13L2 11.125V12.625L7 14.5ZM9 13L14 11.125V12.625L9 14.5Z"
        />
        <circle style={{ fill: "var(--ts-mark-reader, currentColor)" }} cx="8" cy="4" r="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M15 16.197A22 22 0 0 0 5.25 13.286Q4 13.25 4 14.5L4 20.25Q4 21.5 5.25 21.536A22 22 0 0 1 15 24.447ZM17 16.197A22 22 0 0 1 26.75 13.286Q28 13.25 28 14.5L28 20.25Q28 21.5 26.75 21.536A22 22 0 0 0 17 24.447ZM15 26.447A22 22 0 0 0 4 23.5L2.5 23.5L2.5 25.25Q2.5 26 3.25 26L4 26A22 22 0 0 1 15 28.947ZM17 26.447A22 22 0 0 1 28 23.5L29.5 23.5L29.5 25.25Q29.5 26 28.75 26L28 26A22 22 0 0 0 17 28.947Z"
      />
      <circle style={{ fill: "var(--ts-mark-reader, currentColor)" }} cx="16" cy="7" r="4.25" />
    </svg>
  );
}
