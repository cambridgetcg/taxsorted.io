import {
  formatVatExampleLimit,
  normaliseVatExampleAmount,
} from "./example-amount";

export type VatExampleGuidedAmountResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/** Parse one non-negative, two-decimal amount for the narrow rate-specific example. */
export function parseVatExampleGuidedAmount(
  raw: string,
  label: string,
  maximum: number,
): VatExampleGuidedAmountResult {
  const normalised = normaliseVatExampleAmount(raw);
  if (!normalised.ok) {
    return {
      ok: false,
      error: `Use commas in ${label} only between groups of three digits.`,
    };
  }

  const trimmed = normalised.value;
  if (trimmed === "") {
    return { ok: false, error: `Enter ${label}, or enter 0 if there was none.` };
  }
  if (trimmed.startsWith("-")) {
    return { ok: false, error: `${label} cannot be negative in this example.` };
  }
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(trimmed)) {
    return { ok: false, error: `Enter ${label} with no more than two decimal places.` };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, error: `Enter ${label} as a finite number.` };
  }
  if (value > maximum) {
    return {
      ok: false,
      error: `${label} is above this example's limit of ${formatVatExampleLimit(maximum)}.`,
    };
  }

  return { ok: true, value: Math.round((value + Number.EPSILON) * 100) / 100 };
}
