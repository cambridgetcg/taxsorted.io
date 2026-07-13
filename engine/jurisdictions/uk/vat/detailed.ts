import type { VATReturnData } from "./types";
import {
  formatVatExampleLimit,
  normaliseVatExampleAmount,
  VAT_EXAMPLE_DECIMAL_BOX_MAX,
  VAT_EXAMPLE_NET_BOX_MAX,
  VAT_EXAMPLE_WHOLE_BOX_MAX,
} from "./example-amount";

export type VatExampleDetailedAmountResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/** Parse one field without changing the VAT engine's existing sign rules. */
export function parseVatExampleDetailedAmount(
  raw: string,
  label: string,
  wholePounds: boolean,
): VatExampleDetailedAmountResult {
  const normalised = normaliseVatExampleAmount(raw);
  if (!normalised.ok) {
    return {
      ok: false,
      error: `${label}: use commas only between groups of three digits.`,
    };
  }

  const trimmed = normalised.value;
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
  const maximum = wholePounds
    ? VAT_EXAMPLE_WHOLE_BOX_MAX
    : VAT_EXAMPLE_DECIMAL_BOX_MAX;
  if (value > maximum) {
    return {
      ok: false,
      error: `${label}: this example supports up to ${formatVatExampleLimit(maximum)}.`,
    };
  }

  return {
    ok: true,
    value: wholePounds ? value : Math.round((value + Number.EPSILON) * 100) / 100,
  };
}

export interface VatExampleDetailedTotalError {
  field: "totalVatDue" | "netVatDue";
  error: string;
}

/** Check the two calculated boxes whose limits depend on several inputs. */
export function validateVatExampleDetailedTotals(
  data: Pick<VATReturnData, "totalVatDue" | "netVatDue">,
): VatExampleDetailedTotalError[] {
  const errors: VatExampleDetailedTotalError[] = [];
  if (data.totalVatDue > VAT_EXAMPLE_DECIMAL_BOX_MAX) {
    errors.push({
      field: "totalVatDue",
      error: `Box 3 is above ${formatVatExampleLimit(VAT_EXAMPLE_DECIMAL_BOX_MAX)}. Reduce Box 1 or Box 2.`,
    });
  }
  if (data.netVatDue > VAT_EXAMPLE_NET_BOX_MAX) {
    errors.push({
      field: "netVatDue",
      error: `Box 5 is above ${formatVatExampleLimit(VAT_EXAMPLE_NET_BOX_MAX)}. Reduce the difference between Box 3 and Box 4.`,
    });
  }
  return errors;
}
