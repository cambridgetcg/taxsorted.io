import type { VATReturnData } from "@taxsorted/engine/uk/vat";

export type VatDraftPosition = "payable" | "repayment" | "nil";

export interface VatDraftBox {
  box: number;
  label: string;
  value: number;
}

export interface VatDraftPresentation {
  position: VatDraftPosition;
  headline: string;
  detail: string;
  boxes: VatDraftBox[];
}

const BOX_LABELS: Record<number, string> = {
  1: "VAT due on sales",
  2: "VAT due on acquisitions",
  3: "Total VAT due",
  4: "VAT reclaimed in this period",
  5: "Net VAT",
  6: "Total sales excluding VAT",
  7: "Total purchases excluding VAT",
  8: "Goods supplied under Northern Ireland and EU rules",
  9: "Acquisitions under Northern Ireland and EU rules",
};

const gbp = (value: number): string =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);

/** Draft-only wording kept local so the filing engine's semantics do not move. */
export function presentVatDraft(data: VATReturnData): VatDraftPresentation {
  const position: VatDraftPosition =
    data.netVatDue === 0
      ? "nil"
      : data.totalVatDue >= data.vatReclaimedCurrPeriod
        ? "payable"
        : "repayment";

  const boxes: VatDraftBox[] = [
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

  if (position === "nil") {
    return {
      position,
      headline: "Estimated balance: £0.00",
      detail: "The VAT due and reclaim figures entered in this draft cancel out.",
      boxes,
    };
  }

  if (position === "payable") {
    return {
      position,
      headline: `Estimated VAT to pay: ${gbp(data.netVatDue)}`,
      detail: `${gbp(data.totalVatDue)} total VAT due minus ${gbp(data.vatReclaimedCurrPeriod)} entered as reclaimable VAT.`,
      boxes,
    };
  }

  return {
    position,
    headline: `Estimated VAT repayment: ${gbp(data.netVatDue)}`,
    detail: `${gbp(data.vatReclaimedCurrPeriod)} entered as reclaimable VAT minus ${gbp(data.totalVatDue)} total VAT due.`,
    boxes,
  };
}

export function formatDraftBoxValue(box: number, value: number): string {
  const decimals = box <= 5 ? 2 : 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
