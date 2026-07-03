// i18n: deferred to M2 — plain English for launch

/**
 * Today as ISO yyyy-mm-dd in the reader's OWN timezone. The tempting
 * one-liner — `new Date().toISOString().slice(0, 10)` — is the UTC day:
 * during British Summer Time, between 00:00 and 01:00 local it still says
 * *yesterday*, and on a quarter-boundary day that reads as the wrong
 * quarter entirely. Everything in this app that asks "what day is it for
 * this person" (quarter pickers, record-date defaults) must use this
 * local-parts version instead.
 */
export function todayIsoLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
