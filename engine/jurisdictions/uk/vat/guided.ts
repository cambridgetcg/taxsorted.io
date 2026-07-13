export type VatExampleGuidedAmountResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/** Parse one non-negative, two-decimal amount for the narrow 20% example. */
export function parseVatExampleGuidedAmount(
  raw: string,
  label: string,
): VatExampleGuidedAmountResult {
  const trimmed = raw.trim();
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

  return { ok: true, value: Math.round((value + Number.EPSILON) * 100) / 100 };
}
