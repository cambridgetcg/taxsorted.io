// A tiny deterministic accounting provider used to prove the connector
// protocol. It has no OAuth ceremony, token, credential, network call or real
// customer data. Production configuration can never enable it.

import type {
  AccountingProvider,
  ProviderAuthorisationSeed,
  ProviderOrganisation,
  RawProviderPage,
} from "./accounting.js";

export const SYNTHETIC_PROVIDER = "synthetic" as const;
export const SYNTHETIC_DATASET = "bank-transactions" as const;
export const SYNTHETIC_ORGANISATION_ID = "synthetic-uk-sole-trader";

const organisation: ProviderOrganisation = Object.freeze({
  id: SYNTHETIC_ORGANISATION_ID,
  name: "Mina's Card Studio (made-up)",
  countryCode: "GB",
  baseCurrency: "GBP",
  datasets: Object.freeze([SYNTHETIC_DATASET]),
  synthetic: true,
});

const records = Object.freeze([
  Object.freeze({
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
  }),
  Object.freeze({
    id: "synthetic-bank-002",
    type: "bank-transaction",
    revision: "1",
    updatedAt: "2026-04-08T10:30:00.000Z",
    date: "2026-04-08",
    direction: "outflow",
    amountMinor: 2_499,
    currency: "GBP",
    description: "Synthetic software subscription",
    status: "reconciled",
  }),
  Object.freeze({
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
  }),
]);

const PAGE_SIZE = 2;
const COVERAGE_MARKER = "synthetic-bank-transactions-v1";

function cursorOffset(cursor: string | null): number {
  if (cursor === null) return 0;
  if (!/^\d+$/u.test(cursor)) throw new Error("invalid synthetic cursor");
  const offset = Number(cursor);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > records.length) {
    throw new Error("invalid synthetic cursor");
  }
  return offset;
}

export const syntheticAccountingProvider: AccountingProvider = Object.freeze({
  id: SYNTHETIC_PROVIDER,
  environment: "sandbox",

  async beginAuthorisation(userId: string): Promise<ProviderAuthorisationSeed> {
    return {
      providerSubjectId: `synthetic-subject:${userId}`,
      grantedScopes: ["bank-transactions.read"],
    };
  },

  async listOrganisations() {
    return [organisation];
  },

  async pullPage(
    input: Parameters<AccountingProvider["pullPage"]>[0],
  ): Promise<RawProviderPage> {
    if (input.organisationId !== SYNTHETIC_ORGANISATION_ID) {
      throw new Error("unknown synthetic organisation");
    }
    if (input.dataset !== SYNTHETIC_DATASET) {
      throw new Error("unknown synthetic dataset");
    }
    const offset = cursorOffset(input.cursor);
    const pageRecords = records.slice(offset, offset + PAGE_SIZE);
    const nextOffset = offset + pageRecords.length;
    const isFinal = nextOffset >= records.length;
    return {
      records: pageRecords,
      currentCursor: input.cursor,
      // The terminal cursor remains useful as the next incremental run's
      // checkpoint. Asking from that cursor returns a valid empty final page.
      nextCursor: String(nextOffset),
      isFinal,
      coverageMarker: isFinal ? COVERAGE_MARKER : null,
    };
  },
});
