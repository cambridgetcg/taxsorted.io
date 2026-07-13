/** HMRC VAT API v1 maxima used by the deliberately narrow example calculators. */
export const VAT_EXAMPLE_DECIMAL_BOX_MAX = 9_999_999_999_999.99;
export const VAT_EXAMPLE_NET_BOX_MAX = 99_999_999_999.99;
export const VAT_EXAMPLE_WHOLE_BOX_MAX = 9_999_999_999_999;

const VAT_EXAMPLE_NET_BOX_MAX_PENCE = 9_999_999_999_999;

export type VatExampleNormalisedAmount =
  | { ok: true; value: string }
  | { ok: false; reason: "grouping" };

/** Remove a pasted currency adornment; the UI already renders its own pound sign. */
export function stripVatExamplePoundPrefix(raw: string): string {
  return raw.replace(/^\s*£\s*/, "");
}

/** Accept a pasted pound sign and conventional three-digit comma grouping. */
export function normaliseVatExampleAmount(raw: string): VatExampleNormalisedAmount {
  const value = stripVatExamplePoundPrefix(raw).trim();

  if (!value.includes(",")) return { ok: true, value };
  if (!/^-?\d{1,3}(?:,\d{3})+(?:\.\d*)?$/.test(value)) {
    return { ok: false, reason: "grouping" };
  }

  return { ok: true, value: value.replaceAll(",", "") };
}

export function formatVatExampleLimit(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Cap a net amount so its VAT and the resulting absolute Box 5 difference can
 * both stay within the v1 contract. Inputs are entered to the penny.
 */
export function vatExampleGuidedAmountLimit(rate: number): number {
  if (!Number.isFinite(rate) || rate < 0) {
    throw new RangeError("VAT example rate must be a finite non-negative number");
  }
  if (rate === 0) return VAT_EXAMPLE_WHOLE_BOX_MAX;

  const maximumByNetVat = Math.floor(VAT_EXAMPLE_NET_BOX_MAX_PENCE / rate) / 100;
  return Math.min(VAT_EXAMPLE_WHOLE_BOX_MAX, maximumByNetVat);
}
