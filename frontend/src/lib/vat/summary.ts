// Say the message. Nine boxes → one clear sentence a human (or an agent) gets instantly.

import { format } from "date-fns";
import type { VATReturnData } from "@/types/vat";
import { daysUntilDue, vatDueDate, type DueStatus, dueStatus } from "./deadlines";

export type VatPosition = "payable" | "repayment" | "nil";

export interface VatBoxLine {
  box: number;
  label: string;
  value: number;
}

export interface VatReturnSummary {
  position: VatPosition;
  /** Box 5 — the amount that moves, always positive. */
  amount: number;
  /** Plain-language headline, e.g. "You owe HMRC £500.00". */
  headline: string;
  /** One line of why. */
  detail: string;
  dueDate?: string;
  daysRemaining?: number;
  status?: DueStatus;
  boxes: VatBoxLine[];
}

const gbp = (n: number): string =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

const BOX_LABELS: Record<number, string> = {
  1: "VAT due on sales",
  2: "VAT due on acquisitions (NI Protocol)",
  3: "Total VAT due",
  4: "VAT reclaimed on purchases",
  5: "Net VAT",
  6: "Total sales (ex VAT)",
  7: "Total purchases (ex VAT)",
  8: "Goods supplied to EU under NI Protocol (ex VAT)",
  9: "Acquisitions from EU under NI Protocol (ex VAT)",
};

/** The 9 boxes as a labelled table, for display. */
export function boxLines(data: VATReturnData): VatBoxLine[] {
  return [
    { box: 1, label: BOX_LABELS[1], value: data.vatDueSales },
    { box: 2, label: BOX_LABELS[2], value: data.vatDueAcquisitions },
    { box: 3, label: BOX_LABELS[3], value: data.totalVatDue },
    { box: 4, label: BOX_LABELS[4], value: data.vatReclaimedCurrPeriod },
    { box: 5, label: BOX_LABELS[5], value: data.netVatDue },
    { box: 6, label: BOX_LABELS[6], value: data.totalValueSalesExVAT },
    { box: 7, label: BOX_LABELS[7], value: data.totalValuePurchasesExVAT },
    { box: 8, label: BOX_LABELS[8], value: data.totalValueGoodsSuppliedExVAT },
    { box: 9, label: BOX_LABELS[9], value: data.totalAcquisitionsExVAT },
  ];
}

/** Turn a finished return into the one sentence that matters, plus a deadline countdown. */
export function summarizeReturn(
  data: VATReturnData,
  periodEnd?: Date | string,
  today: Date | string = new Date(),
): VatReturnSummary {
  const payable = data.totalVatDue >= data.vatReclaimedCurrPeriod;
  const position: VatPosition = data.netVatDue === 0 ? "nil" : payable ? "payable" : "repayment";

  let headline: string;
  let detail: string;
  if (position === "nil") {
    headline = "Nothing to pay this period";
    detail = "Your VAT due and VAT reclaimed cancel out.";
  } else if (position === "payable") {
    headline = `You owe HMRC ${gbp(data.netVatDue)}`;
    detail = `${gbp(data.totalVatDue)} VAT due − ${gbp(data.vatReclaimedCurrPeriod)} reclaimed.`;
  } else {
    headline = `HMRC owes you ${gbp(data.netVatDue)}`;
    detail = `${gbp(data.vatReclaimedCurrPeriod)} reclaimed − ${gbp(data.totalVatDue)} VAT due.`;
  }

  const summary: VatReturnSummary = { position, amount: data.netVatDue, headline, detail, boxes: boxLines(data) };

  if (periodEnd) {
    const due = vatDueDate(periodEnd);
    summary.dueDate = format(due, "yyyy-MM-dd"); // local components — tz-safe (BST won't shift the day)
    summary.daysRemaining = daysUntilDue(due, today);
    summary.status = dueStatus(due, { today });
  }
  return summary;
}
