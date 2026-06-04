import { describe, it, expect } from "vitest";
import {
  categorise,
  treatmentOf,
  CATEGORIES,
  ZERO_VS_EXEMPT,
  explainReturn,
  explainScheme,
  summarizeReturn,
  computeReturnFromTransactions,
  compareSchemes,
  type Transaction,
} from "@/lib/vat";

describe("categorise (plain VAT treatment)", () => {
  it("knows the zero-vs-exempt difference (the catch)", () => {
    const books = categorise("books-newspapers");
    const insurance = categorise("insurance");
    expect(books?.treatment).toBe("zero");
    expect(books?.inputVatRecoverable).toBe(true); // zero-rated: CAN reclaim
    expect(insurance?.treatment).toBe("exempt");
    expect(insurance?.inputVatRecoverable).toBe(false); // exempt: CANNOT reclaim
  });

  it("flags outside-scope items as not on the return", () => {
    const wages = categorise("wages-salaries");
    expect(wages?.treatment).toBe("outside-scope");
    expect(wages?.rate).toBeNull();
  });

  it("carries plain explanations and honest caveats", () => {
    expect(treatmentOf("reduced").rate).toBe(0.05);
    expect(treatmentOf("exempt").plain).toMatch(/cannot reclaim/i);
    const food = categorise("food-groceries");
    expect(food?.note).toMatch(/catering|hot/i); // honest about the wrinkle
    expect(ZERO_VS_EXEMPT).toMatch(/reclaim/i);
  });

  it("returns null for an unknown category", () => {
    expect(categorise("does-not-exist")).toBeNull();
    expect(CATEGORIES.length).toBeGreaterThan(10);
  });
});

describe("explainReturn (no jargon, no fear)", () => {
  const summary = summarizeReturn(
    computeReturnFromTransactions(
      [
        { kind: "sale", net: 5000, rate: "standard" },
        { kind: "purchase", net: 2500, rate: "standard" },
      ],
      { periodKey: "24A1" },
    ),
    "2024-03-31",
    "2024-04-10",
  );

  it("explains a payable return in plain words", () => {
    const e = explainReturn(summary);
    expect(e.headline).toContain("You owe HMRC");
    expect(e.whatItMeans).toMatch(/not a tax on your profit/i);
    expect(e.youNeedTo.length).toBeGreaterThan(0);
    expect(e.youCanSkip.length).toBeGreaterThan(0);
    expect(e.howToOptimise.length).toBeGreaterThan(0);
    expect(e.youCanSkip.join(" ")).toMatch(/don't send invoices/i);
  });
});

describe("explainScheme (what to do and why)", () => {
  it("warns plainly about the limited-cost-trader trap", () => {
    const txns: Transaction[] = [
      { kind: "sale", net: 10000, rate: "standard" },
      { kind: "purchase", net: 500, rate: "standard" },
    ];
    const lines = explainScheme(compareSchemes(txns, { periodKey: "24A1", sectorRate: 0.145 }));
    expect(lines.join(" ")).toMatch(/16\.5%|limited cost/i);
  });
});
