import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SYNTHETIC_DATASET,
  SYNTHETIC_ORGANISATION_ID,
  syntheticAccountingProvider,
} from "../accounting-synthetic.js";

afterEach(() => vi.unstubAllGlobals());

describe("synthetic accounting provider", () => {
  it("offers one warmly named, unmistakably made-up GB/GBP organisation", async () => {
    const organisations = await syntheticAccountingProvider.listOrganisations("auth-1");
    expect(organisations).toEqual([
      {
        id: SYNTHETIC_ORGANISATION_ID,
        name: "Mina's Card Studio (made-up)",
        countryCode: "GB",
        baseCurrency: "GBP",
        datasets: [SYNTHETIC_DATASET],
        synthetic: true,
      },
    ]);
  });

  it("paginates deterministically without any network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const first = await syntheticAccountingProvider.pullPage({
      authorisationId: "auth-1",
      organisationId: SYNTHETIC_ORGANISATION_ID,
      dataset: SYNTHETIC_DATASET,
      cursor: null,
    });
    const replay = await syntheticAccountingProvider.pullPage({
      authorisationId: "auth-1",
      organisationId: SYNTHETIC_ORGANISATION_ID,
      dataset: SYNTHETIC_DATASET,
      cursor: null,
    });
    const final = await syntheticAccountingProvider.pullPage({
      authorisationId: "auth-1",
      organisationId: SYNTHETIC_ORGANISATION_ID,
      dataset: SYNTHETIC_DATASET,
      cursor: first.nextCursor,
    });

    expect(first).toEqual(replay);
    expect(first.records).toHaveLength(2);
    expect(first).toMatchObject({ currentCursor: null, nextCursor: "2", isFinal: false });
    expect(final.records).toHaveLength(1);
    expect(final).toMatchObject({
      currentCursor: "2",
      nextCursor: "3",
      isFinal: true,
      coverageMarker: "synthetic-bank-transactions-v1",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an empty final page from the completed cursor for a fresh incremental check", async () => {
    const page = await syntheticAccountingProvider.pullPage({
      authorisationId: "auth-1",
      organisationId: SYNTHETIC_ORGANISATION_ID,
      dataset: SYNTHETIC_DATASET,
      cursor: "3",
    });

    expect(page).toEqual({
      records: [],
      currentCursor: "3",
      nextCursor: "3",
      isFinal: true,
      coverageMarker: "synthetic-bank-transactions-v1",
    });
  });

  it("rejects unknown organisations, datasets and out-of-range cursors", async () => {
    await expect(
      syntheticAccountingProvider.pullPage({
        authorisationId: "auth-1",
        organisationId: "someone-real",
        dataset: SYNTHETIC_DATASET,
        cursor: null,
      }),
    ).rejects.toThrow("unknown synthetic organisation");
    await expect(
      syntheticAccountingProvider.pullPage({
        authorisationId: "auth-1",
        organisationId: SYNTHETIC_ORGANISATION_ID,
        dataset: "invoices",
        cursor: null,
      }),
    ).rejects.toThrow("unknown synthetic dataset");
    await expect(
      syntheticAccountingProvider.pullPage({
        authorisationId: "auth-1",
        organisationId: SYNTHETIC_ORGANISATION_ID,
        dataset: SYNTHETIC_DATASET,
        cursor: "4",
      }),
    ).rejects.toThrow("invalid synthetic cursor");
  });
});
