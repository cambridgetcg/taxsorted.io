// i18n: deferred to M2 — plain English for launch

export const INVALID_AMOUNT_MESSAGE = "Enter a number, like 40000 or 40,000.50";

/**
 * Pounds as the user typed them -> integer pence, tolerating the ways people
 * really write money: "£40,000", "40 000.50", "40000". Currency signs, commas
 * and spaces are stripped before parsing. A blank field is 'blank' (the
 * caller decides what that means); anything non-blank that still doesn't
 * parse to a finite number >= 0 is 'invalid' and must block submission —
 * silently reading it as zero would produce a confidently wrong result.
 */
export function parsePounds(raw: string): number | "blank" | "invalid" {
  if (raw.trim() === "") return "blank";
  const sanitized = raw.replace(/[£,\s]/g, "");
  if (sanitized === "") return "invalid";
  const n = Number(sanitized);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return Math.round(n * 100);
}

/** Pence for a field already known not to be 'invalid'; blank reads as zero. */
export function penceOf(raw: string): number {
  const parsed = parsePounds(raw);
  return typeof parsed === "number" ? parsed : 0;
}
