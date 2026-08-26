import { describe, expect, it } from "vitest";
import {
  ACCOUNTING_SOURCES,
  OFFICIAL_FILING_HELP,
  RECORDS_TO_RECEIPT,
} from "../accounting-integrations";

describe("accounting integration catalogue", () => {
  it("has one honest live source and no fake provider connect action", () => {
    const live = ACCOUNTING_SOURCES.filter((source) => source.state === "open-now");
    expect(live.map((source) => source.id)).toEqual(["csv"]);
    expect(live[0]?.action?.href).toBe("/books/workspace/money?start=csv");

    for (const provider of ACCOUNTING_SOURCES.filter((source) => source.id !== "csv")) {
      expect(provider.state).toBe("planned");
      expect(provider.action).toBeUndefined();
      expect(provider.needSoftware?.href).toMatch(/^https:\/\//);
      expect(provider.stateLabel).toMatch(/not live/i);
    }
    expect(ACCOUNTING_SOURCES.map((source) => source.id)).toContain("sage");
  });

  it("keeps reconciliation and HMRC authority as separate filing gates", () => {
    const completeness = RECORDS_TO_RECEIPT.find((step) => step.name === "Check completeness");
    const hmrc = RECORDS_TO_RECEIPT.find((step) => step.name === "Connect one HMRC module");
    const receipt = RECORDS_TO_RECEIPT.find((step) => step.name.includes("receipt"));

    expect(completeness?.state).toBe("next");
    expect(completeness?.proof).toMatch(/signing in to a source never earns a reconciled badge/i);
    expect(hmrc?.state).toBe("sandbox-only");
    expect(hmrc?.proof).toMatch(/disconnecting one tax/i);
    expect(receipt?.proof).toMatch(/payment tracking is not built/i);
  });

  it("names the current source-to-tax gaps instead of implying parity", () => {
    expect(ACCOUNTING_SOURCES.find((source) => source.id === "xero")?.boundary).toMatch(
      /does not expose unreconciled statement lines/i,
    );
    expect(RECORDS_TO_RECEIPT.find((step) => step.number === 4)?.proof).toMatch(
      /does not yet derive a VAT return/i,
    );
    expect(ACCOUNTING_SOURCES.find((source) => source.id === "xero")?.boundary).toMatch(
      /attachments are also outside TaxSorted's first pilot/i,
    );
  });

  it("uses plain public words for provider differences", () => {
    const publicCopy = ACCOUNTING_SOURCES.flatMap((source) => [
      source.plain,
      ...source.keeps,
      source.boundary,
    ]).join(" ");

    expect(publicCopy).not.toMatch(/\btenant\b|provider revisions|\bCDC\b|\bOAuth\b|bounded comparison/i);
    expect(ACCOUNTING_SOURCES.find((source) => source.id === "quickbooks")?.boundary).toMatch(
      /Change Data Capture check looks back 30 days/i,
    );
  });

  it("keeps every cited integration link official, dated and encrypted in transit", () => {
    const links = [
      ...ACCOUNTING_SOURCES.flatMap((source) => source.official),
      ...OFFICIAL_FILING_HELP,
    ];
    expect(links.length).toBeGreaterThanOrEqual(12);
    for (const link of links) {
      expect(link.href).toMatch(/^https:\/\//);
      expect(link.checkedOn).toBe("2026-08-01");
      expect(["GOV.UK", "HMRC", "Xero", "Intuit", "FreeAgent", "Sage"]).toContain(
        link.publisher,
      );
    }
  });
});
