import { describe, it, expect } from "vitest";
import type { LedgerRecord } from "@taxsorted/engine/uk/itsa";
import { deriveFigures } from "../derive-figures";

// All dates fall inside Q1 2026-27 standard (2026-04-06 .. 2026-07-05).
const TAX_YEAR = "2026-27" as const;
const ELECTION = "standard" as const;

function record(overrides: Partial<LedgerRecord> & Pick<LedgerRecord, "id" | "amount" | "kind" | "category" | "source">): LedgerRecord {
  return { date: "2026-05-01", ...overrides };
}

describe("deriveFigures", () => {
  it("splits self-employment income and expenses into a floored trading profit", () => {
    const records: LedgerRecord[] = [
      record({ id: "a", amount: 100000, kind: "income", category: "turnover", source: "self-employment" }),
      record({ id: "b", amount: 4000, kind: "income", category: "other", source: "self-employment" }),
      record({ id: "c", amount: 30000, kind: "expense", category: "adminCosts", source: "self-employment" }),
      record({ id: "d", amount: 2000, kind: "expense", category: "advertisingCosts", source: "self-employment" }),
    ];

    const figures = deriveFigures(records, TAX_YEAR, ELECTION, 1);

    // income 104000 - expenses 32000 = 72000
    expect(figures.tradingProfit).toBe(72000);
    expect(figures.tradingProfitRaw).toBe(72000);
    expect(figures.propertyIncome).toBe(0);
    expect(figures.propertyExpenses).toBe(0);
    expect(figures.residentialFinanceCosts).toBe(0);
    expect(figures.recordCount).toBe(4);
  });

  it("resolves a dual-list key (professionalFees) against the property source, not self-employment", () => {
    // professionalFees exists as an expense category in BOTH self-employment and
    // uk-property lists — categoryByKey must be called with the record's own
    // source, never a bare lookup that could silently resolve to the wrong list.
    const records: LedgerRecord[] = [
      record({ id: "a", amount: 50000, kind: "income", category: "periodAmount", source: "uk-property" }),
      record({ id: "b", amount: 5000, kind: "expense", category: "professionalFees", source: "uk-property" }),
    ];

    const figures = deriveFigures(records, TAX_YEAR, ELECTION, 1);

    expect(figures.propertyIncome).toBe(50000);
    expect(figures.propertyExpenses).toBe(5000);
    expect(figures.residentialFinanceCosts).toBe(0);
    expect(figures.tradingProfit).toBe(0);
  });

  it("routes residentialFinancialCost to residentialFinanceCosts, not propertyExpenses", () => {
    const records: LedgerRecord[] = [
      record({ id: "a", amount: 60000, kind: "income", category: "periodAmount", source: "uk-property" }),
      record({ id: "b", amount: 15000, kind: "expense", category: "residentialFinancialCost", source: "uk-property" }),
    ];

    const figures = deriveFigures(records, TAX_YEAR, ELECTION, 1);

    expect(figures.residentialFinanceCosts).toBe(15000);
    expect(figures.propertyExpenses).toBe(0);
  });

  it("excludes residentialFinancialCostsCarriedForward from both property expenses and residential finance costs", () => {
    const records: LedgerRecord[] = [
      record({ id: "a", amount: 60000, kind: "income", category: "periodAmount", source: "uk-property" }),
      record({
        id: "b",
        amount: 9000,
        kind: "expense",
        category: "residentialFinancialCostsCarriedForward",
        source: "uk-property",
      }),
    ];

    const figures = deriveFigures(records, TAX_YEAR, ELECTION, 1);

    expect(figures.propertyExpenses).toBe(0);
    expect(figures.residentialFinanceCosts).toBe(0);
    expect(figures.propertyIncome).toBe(60000);
  });

  it("floors a self-employment loss at 0 for tradingProfit but keeps the raw negative figure", () => {
    const records: LedgerRecord[] = [
      record({ id: "a", amount: 10000, kind: "income", category: "turnover", source: "self-employment" }),
      record({ id: "b", amount: 30000, kind: "expense", category: "costOfGoods", source: "self-employment" }),
    ];

    const figures = deriveFigures(records, TAX_YEAR, ELECTION, 1);

    expect(figures.tradingProfit).toBe(0);
    expect(figures.tradingProfitRaw).toBe(-20000);
  });

  it("returns all zeros for no records", () => {
    const figures = deriveFigures([], TAX_YEAR, ELECTION, 1);

    expect(figures).toEqual({
      tradingProfit: 0,
      tradingProfitRaw: 0,
      propertyIncome: 0,
      propertyExpenses: 0,
      residentialFinanceCosts: 0,
      recordCount: 0,
    });
  });

  it("sums all four property income categories into propertyIncome", () => {
    const records: LedgerRecord[] = [
      record({ id: "a", amount: 10000, kind: "income", category: "periodAmount", source: "uk-property" }),
      record({ id: "b", amount: 2000, kind: "income", category: "otherIncome", source: "uk-property" }),
      record({ id: "c", amount: 3000, kind: "income", category: "premiumsOfLeaseGrant", source: "uk-property" }),
      record({ id: "d", amount: 4000, kind: "income", category: "reversePremiums", source: "uk-property" }),
    ];

    const figures = deriveFigures(records, TAX_YEAR, ELECTION, 1);

    expect(figures.propertyIncome).toBe(19000);
    expect(figures.propertyExpenses).toBe(0);
    expect(figures.residentialFinanceCosts).toBe(0);
    expect(figures.recordCount).toBe(4);
  });
});
