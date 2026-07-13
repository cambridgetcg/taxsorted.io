export type VatExampleDetailedAmountResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/**
 * Permit partial typing without turning an incomplete field into zero. A
 * leading minus can be typed so the parser can explain this example's clear
 * non-negative boundary; it is never accepted as a value.
 */
export function isVatExampleDetailedInput(raw: string): boolean {
  return /^-?\d*(?:\.\d{0,2})?$/.test(raw);
}

/** Parse one field without changing the VAT engine's existing sign rules. */
export function parseVatExampleDetailedAmount(
  raw: string,
  label: string,
  wholePounds: boolean,
): VatExampleDetailedAmountResult {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "." || trimmed === "-" || trimmed === "-.") {
    return { ok: false, error: `${label}: enter a number, using 0 when the value is zero.` };
  }
  if (trimmed.startsWith("-")) {
    return {
      ok: false,
      error: `${label}: negative adjustments are outside this example calculator.`,
    };
  }

  if (wholePounds && !/^\d+$/.test(trimmed)) {
    return { ok: false, error: `${label}: enter whole pounds without pence.` };
  }
  if (!wholePounds && !/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(trimmed)) {
    return { ok: false, error: `${label}: use no more than two decimal places.` };
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, error: `${label}: enter a finite number.` };
  }

  return {
    ok: true,
    value: wholePounds ? value : Math.round((value + Number.EPSILON) * 100) / 100,
  };
}
