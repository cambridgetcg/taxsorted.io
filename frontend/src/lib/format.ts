// i18n: deferred to M2 — plain English for launch

/** Pence (integer minor units) formatted as full GBP, e.g. 1143200 -> "£11,432.00" */
export function gbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pence / 100);
}

/**
 * Pence formatted as GBP, dropping the pence when the amount is a whole
 * pound: 1143200 -> "£11,432"; 245660 -> "£2,456.60".
 */
export function gbpCompact(pence: number): string {
  const isWhole = pence % 100 === 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(pence / 100);
}

const UK_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * ISO 'YYYY-MM-DD' -> '7 August 2026'. Built from a fixed month-name table
 * rather than toLocaleDateString/Intl so the output can never drift with a
 * runtime's locale data — same string in a test, a build server and a
 * reader's browser, regardless of where any of them think they are.
 */
export function formatUkDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${UK_MONTHS[m - 1]} ${y}`;
}
