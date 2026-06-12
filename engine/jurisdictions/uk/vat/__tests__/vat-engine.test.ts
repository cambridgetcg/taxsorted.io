import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import {
  isValidVrn,
  normalizeVrn,
  vrnError,
  formatVrn,
  computeReturnFromTransactions,
  computeFlatRateReturn,
  deriveTotals,
  round2,
  vatDueDate,
  daysUntilDue,
  dueStatus,
  summarizeReturn,
  prepareVatReturn,
  effectiveFlatRate,
  compareSchemes,
  ratesFor,
  pick,
  REGISTRATION_TABLE,
  type Transaction,
} from "../index";

describe("VRN checksum (offline validation)", () => {
  it("accepts a real valid VRN (mod-97)", () => {
    // GB 980 7806 84: 9·8+8·7+0·6+7·5+8·4+0·3+6·2 = 207; 207+84 = 291 = 3×97
    expect(isValidVrn("GB980780684")).toBe(true);
    expect(isValidVrn("980780684")).toBe(true);
    expect(isValidVrn("GB 980 7806 84")).toBe(true);
  });

  it("accepts an algorithmically-correct synthetic VRN", () => {
    // base 1234567 → S=112, check 82 makes 194 = 2×97
    expect(isValidVrn("123456782")).toBe(true);
  });

  it("rejects a wrong checksum", () => {
    expect(isValidVrn("123456789")).toBe(false);
  });

  it("rejects wrong length / non-numeric", () => {
    expect(isValidVrn("12345")).toBe(false);
    expect(isValidVrn("ABCDEFGHI")).toBe(false);
  });

  it("normalizes and formats", () => {
    expect(normalizeVrn("gb 980-780-684")).toBe("980780684");
    expect(formatVrn("980780684")).toBe("GB 980 7806 84");
  });

  it("explains errors clearly", () => {
    expect(vrnError("GB980780684")).toBeNull();
    expect(vrnError("")).toMatch(/enter/i);
    expect(vrnError("12345")).toMatch(/9 digits/i);
    expect(vrnError("123456789")).toMatch(/checksum|typo/i);
  });
});

describe("computeReturnFromTransactions (transactions → 9 boxes)", () => {
  it("reproduces the spec's worked example exactly", () => {
    const txns: Transaction[] = [
      { kind: "sale", net: 5000, rate: "standard" },
      { kind: "purchase", net: 2500, rate: "standard" },
    ];
    const r = computeReturnFromTransactions(txns, { periodKey: "24A1" });
    expect(r.vatDueSales).toBe(1000); // box 1
    expect(r.vatDueAcquisitions).toBe(0); // box 2
    expect(r.totalVatDue).toBe(1000); // box 3
    expect(r.vatReclaimedCurrPeriod).toBe(500); // box 4
    expect(r.netVatDue).toBe(500); // box 5
    expect(r.totalValueSalesExVAT).toBe(5000); // box 6
    expect(r.totalValuePurchasesExVAT).toBe(2500); // box 7
    expect(r.totalValueGoodsSuppliedExVAT).toBe(0); // box 8
    expect(r.totalAcquisitionsExVAT).toBe(0); // box 9
    expect(r.finalised).toBe(false);
  });

  it("rounds VAT to pence and net values to whole pounds", () => {
    const r = computeReturnFromTransactions(
      [{ kind: "sale", net: 33.33, rate: "standard" }],
      { periodKey: "24A1" },
    );
    expect(r.vatDueSales).toBe(6.67); // 33.33 × 0.20 = 6.666 → 6.67
    expect(r.totalValueSalesExVAT).toBe(33); // whole pounds
  });

  it("handles reduced and zero rates", () => {
    const r = computeReturnFromTransactions(
      [
        { kind: "sale", net: 100, rate: "reduced" }, // 5% → 5
        { kind: "sale", net: 100, rate: "zero" }, // 0
      ],
      { periodKey: "24A1" },
    );
    expect(r.vatDueSales).toBe(5);
    expect(r.totalValueSalesExVAT).toBe(200);
  });

  it("produces a repayment position when input VAT exceeds output VAT", () => {
    const r = computeReturnFromTransactions(
      [
        { kind: "sale", net: 1000, rate: "standard" }, // output 200
        { kind: "purchase", net: 2000, rate: "standard" }, // input 400
      ],
      { periodKey: "24A1" },
    );
    expect(r.totalVatDue).toBe(200);
    expect(r.vatReclaimedCurrPeriod).toBe(400);
    expect(r.netVatDue).toBe(200); // |200 − 400|
  });

  it("derives totals per HMRC arithmetic", () => {
    expect(deriveTotals(1000, 0, 500)).toEqual({ box3: 1000, box5: 500 });
    expect(deriveTotals(200, 0, 400)).toEqual({ box3: 200, box5: 200 });
    expect(round2(6.666)).toBe(6.67);
  });

  it("flat rate scheme: flat % of gross turnover, no input reclaim", () => {
    const r = computeFlatRateReturn({
      periodKey: "24A1",
      grossTurnover: 12000,
      flatRate: 0.145, // 14.5%
      salesNet: 10000,
    });
    expect(r.vatDueSales).toBe(1740); // 12000 × 0.145
    expect(r.vatReclaimedCurrPeriod).toBe(0);
    expect(r.netVatDue).toBe(1740);
  });
});

describe("VAT deadlines (1 month + 7 days)", () => {
  it("matches HMRC examples for month-end periods", () => {
    expect(format(vatDueDate("2024-03-31"), "yyyy-MM-dd")).toBe("2024-05-07");
    expect(format(vatDueDate("2024-06-30"), "yyyy-MM-dd")).toBe("2024-08-07");
    expect(format(vatDueDate("2024-12-31"), "yyyy-MM-dd")).toBe("2025-02-07");
  });

  it("counts days and flags status", () => {
    expect(daysUntilDue("2024-05-07", "2024-05-01")).toBe(6);
    expect(dueStatus("2024-05-07", { today: "2024-05-01" })).toBe("due-soon");
    expect(dueStatus("2024-05-07", { today: "2024-06-01" })).toBe("overdue");
    expect(dueStatus("2024-05-07", { today: "2024-01-01" })).toBe("upcoming");
  });
});

describe("summarizeReturn (say the message)", () => {
  const base = computeReturnFromTransactions(
    [
      { kind: "sale", net: 5000, rate: "standard" },
      { kind: "purchase", net: 2500, rate: "standard" },
    ],
    { periodKey: "24A1" },
  );

  it("states a payable position in plain language", () => {
    const s = summarizeReturn(base, "2024-03-31", "2024-04-10");
    expect(s.position).toBe("payable");
    expect(s.amount).toBe(500);
    expect(s.headline).toContain("You owe HMRC");
    expect(s.headline).toContain("£500.00");
    expect(s.dueDate).toBe("2024-05-07");
    expect(s.daysRemaining).toBe(27);
    expect(s.boxes).toHaveLength(9);
  });

  it("states a repayment position", () => {
    const repay = computeReturnFromTransactions(
      [
        { kind: "sale", net: 1000, rate: "standard" },
        { kind: "purchase", net: 2000, rate: "standard" },
      ],
      { periodKey: "24A1" },
    );
    const s = summarizeReturn(repay);
    expect(s.position).toBe("repayment");
    expect(s.headline).toContain("HMRC owes you");
  });

  it("states a nil position", () => {
    const nil = computeReturnFromTransactions([], { periodKey: "24A1" });
    const s = summarizeReturn(nil);
    expect(s.position).toBe("nil");
    expect(s.headline).toMatch(/nothing to pay/i);
  });
});

describe("prepareVatReturn (one call, both worlds)", () => {
  const txns: Transaction[] = [
    { kind: "sale", net: 5000, rate: "standard" },
    { kind: "purchase", net: 2500, rate: "standard" },
  ];

  it("computes, summarizes, and validates a finalised return", () => {
    const { data, summary, validation } = prepareVatReturn(txns, {
      periodKey: "24A1",
      periodEnd: "2024-03-31",
      finalised: true,
      today: "2024-04-01",
    });
    expect(data.netVatDue).toBe(500);
    expect(summary.position).toBe("payable");
    expect(summary.dueDate).toBe("2024-05-07");
    expect(validation.valid).toBe(true);
  });

  it("flags an unfinalised return as invalid for submission", () => {
    const { validation } = prepareVatReturn(txns, { periodKey: "24A1", finalised: false });
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.field === "finalised")).toBe(true);
  });
});

describe("EU / NI-protocol reverse charge (no Box 4 double-count)", () => {
  it("a reclaimable acquisition nets to zero — Box 2 and Box 4 once each", () => {
    const r = computeReturnFromTransactions(
      [{ kind: "purchase", net: 1000, rate: "standard", eu: true }],
      { periodKey: "24A1" },
    );
    expect(r.vatDueAcquisitions).toBe(200); // Box 2
    expect(r.vatReclaimedCurrPeriod).toBe(200); // Box 4 — once, not 400
    expect(r.totalAcquisitionsExVAT).toBe(1000); // Box 9
    expect(r.netVatDue).toBe(0); // reverse charge nets to zero
  });

  it("a non-reclaimable acquisition leaves the VAT due without reclaim", () => {
    const r = computeReturnFromTransactions(
      [{ kind: "purchase", net: 1000, rate: "standard", eu: true, reclaimable: false }],
      { periodKey: "24A1" },
    );
    expect(r.vatDueAcquisitions).toBe(200);
    expect(r.vatReclaimedCurrPeriod).toBe(0);
    expect(r.netVatDue).toBe(200);
  });
});

describe("boxes 6-9 round DOWN (HMRC 'knock off the pence')", () => {
  it("truncates pence on net-value boxes", () => {
    const r = computeReturnFromTransactions(
      [{ kind: "sale", net: 5000.99, rate: "standard" }],
      { periodKey: "24A1" },
    );
    expect(r.totalValueSalesExVAT).toBe(5000); // floor, not 5001
  });
});

describe("VRN: government (GD) and health (HA) forms", () => {
  it("accepts GD000-499 and HA500-999 by pattern (no checksum)", () => {
    expect(isValidVrn("GBGD001")).toBe(true);
    expect(isValidVrn("GBHA599")).toBe(true);
  });
  it("rejects out-of-range GD/HA", () => {
    expect(isValidVrn("GBGD500")).toBe(false);
    expect(isValidVrn("GBHA499")).toBe(false);
  });
});

describe("effectiveFlatRate (limited-cost trader + first-year discount)", () => {
  it("forces 16.5% for a limited-cost trader", () => {
    const r = effectiveFlatRate({ sectorRate: 0.145, grossFrsTurnover: 12000, relevantGoodsSpend: 0 });
    expect(r.limitedCost).toBe(true);
    expect(r.rate).toBe(0.165);
  });
  it("applies the 1% first-year discount → 15.5% in year one", () => {
    const r = effectiveFlatRate({
      sectorRate: 0.145, grossFrsTurnover: 12000, relevantGoodsSpend: 0,
      registrationDate: "2024-01-01", periodEnd: "2024-03-31",
    });
    expect(r.firstYearDiscount).toBe(true);
    expect(r.rate).toBe(0.155);
  });
  it("uses the sector rate when not limited-cost", () => {
    const r = effectiveFlatRate({ sectorRate: 0.11, grossFrsTurnover: 12000, relevantGoodsSpend: 1200 });
    expect(r.limitedCost).toBe(false);
    expect(r.rate).toBe(0.11);
  });
});

describe("effective-dated config", () => {
  it("returns the VAT rates in force", () => {
    expect(ratesFor("2024-06-30").standard).toBe(0.2);
  });
  it("picks the threshold row in force for the period", () => {
    expect(pick(REGISTRATION_TABLE, "2024-06-30").registerOver).toBe(90000);
    expect(pick(REGISTRATION_TABLE, "2020-01-01").registerOver).toBe(85000);
  });
});

describe("scheme optimiser (found money)", () => {
  it("catches the limited-cost-trader trap — recommend standard", () => {
    const txns: Transaction[] = [
      { kind: "sale", net: 10000, rate: "standard" },
      { kind: "purchase", net: 500, rate: "standard" }, // services → not relevant goods
    ];
    const c = compareSchemes(txns, { periodKey: "24A1", sectorRate: 0.145 });
    expect(c.flatRate.limitedCost).toBe(true);
    expect(c.flatRate.effectiveRate).toBe(0.165);
    expect(c.standard.cost).toBe(1900); // 2000 − 100
    expect(c.flatRate.cost).toBe(1980); // 12000 × 0.165
    expect(c.recommendation).toBe("standard");
  });

  it("recommends Flat Rate when it genuinely saves money", () => {
    const txns: Transaction[] = [
      { kind: "sale", net: 10000, rate: "standard" },
      { kind: "purchase", net: 1000, rate: "standard", goods: true },
    ];
    const c = compareSchemes(txns, { periodKey: "24A1", sectorRate: 0.11 });
    expect(c.flatRate.limitedCost).toBe(false);
    expect(c.standard.cost).toBe(1800); // 2000 − 200
    expect(c.flatRate.cost).toBe(1320); // 12000 × 0.11
    expect(c.recommendation).toBe("flatRate");
    expect(c.savingPerPeriod).toBe(480);
    expect(c.savingPerYear).toBe(1920);
  });
});
