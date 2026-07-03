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
