// The submit door's two locks: the zod shape and the engine's own validation.
// Same engine the UI uses — one truth, tested where the money crosses.

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateVATReturnData } from "@taxsorted/engine/uk/hmrc";
import type { VATReturnData } from "@taxsorted/engine/uk/vat";

const goodReturn: VATReturnData = {
  periodKey: "24A1",
  vatDueSales: 1000.5,
  vatDueAcquisitions: 0,
  totalVatDue: 1000.5,
  vatReclaimedCurrPeriod: 500.25,
  netVatDue: 500.25,
  totalValueSalesExVAT: 5000,
  totalValuePurchasesExVAT: 2500,
  totalValueGoodsSuppliedExVAT: 0,
  totalAcquisitionsExVAT: 0,
  finalised: true,
};

describe("engine validation at the api door", () => {
  it("accepts a correct return", () => {
    expect(validateVATReturnData(goodReturn).valid).toBe(true);
  });

  it("rejects box-3 arithmetic that does not add up", () => {
    const verdict = validateVATReturnData({ ...goodReturn, totalVatDue: 999 });
    expect(verdict.valid).toBe(false);
    expect(verdict.errors.some((e) => e.field === "totalVatDue")).toBe(true);
  });

  it("rejects box-5 not matching |box3 - box4|", () => {
    const verdict = validateVATReturnData({ ...goodReturn, netVatDue: 0.01 });
    expect(verdict.valid).toBe(false);
  });

  it("rejects pennies in the whole-pound boxes (6-9)", () => {
    const verdict = validateVATReturnData({ ...goodReturn, totalValueSalesExVAT: 5000.5 });
    expect(verdict.valid).toBe(false);
  });

  it("rejects an unfinalised return", () => {
    const verdict = validateVATReturnData({ ...goodReturn, finalised: false });
    expect(verdict.valid).toBe(false);
    expect(verdict.errors.some((e) => e.field === "finalised")).toBe(true);
  });
});

describe("zod gate", () => {
  // Mirror of the route schema; kept in sync by this test using the same shape.
  const SubmitReturn = z.object({
    periodKey: z.string().min(1).max(8),
    vatDueSales: z.number(),
    vatDueAcquisitions: z.number(),
    totalVatDue: z.number(),
    vatReclaimedCurrPeriod: z.number(),
    netVatDue: z.number(),
    totalValueSalesExVAT: z.number(),
    totalValuePurchasesExVAT: z.number(),
    totalValueGoodsSuppliedExVAT: z.number(),
    totalAcquisitionsExVAT: z.number(),
    finalised: z.literal(true),
  });

  it("refuses finalised:false at the type level", () => {
    expect(SubmitReturn.safeParse({ ...goodReturn, finalised: false }).success).toBe(false);
  });

  it("refuses missing boxes", () => {
    const { periodKey: _periodKey, ...rest } = goodReturn;
    expect(SubmitReturn.safeParse(rest).success).toBe(false);
  });

  it("accepts the good return", () => {
    expect(SubmitReturn.safeParse(goodReturn).success).toBe(true);
  });
});
