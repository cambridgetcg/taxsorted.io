import { describe, expect, it } from "vitest";
import {
  SYNTHETIC_ACCOUNTING_MAPPER_VERSION,
  accountingPageDigest,
  normalizeSyntheticAccountingPage,
} from "../synthetic-accounting-normalizer";

const RECORDS = [
  {
    id: "synthetic-bank-001",
    type: "bank-transaction",
    revision: "1",
    updatedAt: "2026-04-07T09:00:00.000Z",
    date: "2026-04-06",
    direction: "inflow",
    amountMinor: 125_000,
    currency: "GBP",
    description: "Synthetic design work receipt",
    status: "reconciled",
  },
  {
    id: "synthetic-bank-003",
    type: "bank-transaction",
    revision: "2",
    updatedAt: "2026-04-10T14:15:00.000Z",
    date: "2026-04-10",
    direction: "outflow",
    amountMinor: 8_750,
    currency: "GBP",
    description: "Synthetic train travel",
    status: "unreconciled",
  },
] as const;

const CONTEXT = {
  organisationId: "synthetic-uk-sole-trader",
  organisationName: "Mina's Card Studio (made-up)",
  observedAt: "2026-08-01T12:00:00.000Z",
  activity: "self-employment" as const,
};

describe("synthetic accounting normalizer", () => {
  it("keeps immutable raw versions and produces review candidates with provider-namespaced IDs", async () => {
    const normalized = await normalizeSyntheticAccountingPage(RECORDS, CONTEXT);

    expect(normalized.rawVersions).toHaveLength(2);
    expect(normalized.rawVersions[0]).toMatchObject({
      identity: {
        provider: "synthetic",
        environment: "sandbox",
        organisationId: "synthetic-uk-sole-trader",
        objectType: "bank-transaction",
        objectId: "synthetic-bank-001",
      },
      providerRevision: "1",
      deleted: false,
      payload: RECORDS[0],
    });
    expect(normalized.rawVersions[0].payloadDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(normalized.normalizedVersions[0]).toMatchObject({
      mapperVersion: SYNTHETIC_ACCOUNTING_MAPPER_VERSION,
      kind: "bank-observation",
      amountPence: 125_000,
      direction: "in",
      candidateExternalId: "synthetic-bank-001",
    });
    expect(normalized.candidates).toEqual([
      expect.objectContaining({
        record: expect.objectContaining({
          amount: 125_000,
          kind: "income",
          category: "turnover",
        }),
        origin: expect.objectContaining({
          kind: "accounting-provider",
          externalId: "synthetic-bank-001",
          sourceRevision: "1",
          provider: expect.objectContaining({
            provider: "synthetic",
            organisationId: "synthetic-uk-sole-trader",
          }),
        }),
      }),
      expect.objectContaining({
        record: expect.objectContaining({
          amount: 8_750,
          kind: "expense",
          category: "carVanTravelExpenses",
        }),
        reviewNote: expect.stringMatching(/unreconciled/i),
      }),
    ]);
  });

  it("uses the same deterministic page digest regardless of object key insertion order", async () => {
    const reordered = RECORDS.map((record) =>
      Object.fromEntries(Object.entries(record).reverse())
    );
    expect(await accountingPageDigest(RECORDS)).toBe(await accountingPageDigest(reordered));
  });

  it("uses valid UK property categories when the chosen activity is property", async () => {
    const normalized = await normalizeSyntheticAccountingPage(RECORDS, {
      ...CONTEXT,
      activity: "uk-property",
    });

    expect(normalized.candidates.map((candidate) => candidate.record)).toEqual([
      expect.objectContaining({
        source: "uk-property",
        kind: "income",
        category: "periodAmount",
      }),
      expect.objectContaining({
        source: "uk-property",
        kind: "expense",
        category: "travelCosts",
      }),
    ]);
  });

  it("fails closed on an unsupported currency or malformed record", async () => {
    await expect(
      normalizeSyntheticAccountingPage([{ ...RECORDS[0], currency: "EUR" }], CONTEXT)
    ).rejects.toThrow(/invalid bank transaction/i);
  });
});
