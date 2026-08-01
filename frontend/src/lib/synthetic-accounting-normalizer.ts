import { canonicalAccountingJson } from "@taxsorted/engine/accounting-sync";
import type { SourceType } from "@taxsorted/engine/uk/itsa";
import {
  providerRecordIdentityKey,
  type ImportCandidate,
  type NormalizedProviderRecordVersion,
  type ProviderRecordIdentity,
  type RawProviderRecordVersion,
} from "@/lib/local-books";

export const SYNTHETIC_ACCOUNTING_MAPPER_VERSION =
  "taxsorted.synthetic-bank-transaction/1" as const;

interface SyntheticBankTransaction {
  id: string;
  type: "bank-transaction";
  revision: string;
  updatedAt: string;
  date: string;
  direction: "inflow" | "outflow";
  amountMinor: number;
  currency: "GBP";
  description: string;
  status: "reconciled" | "unreconciled";
}

export interface SyntheticNormalizationContext {
  organisationId: string;
  organisationName: string;
  observedAt: string;
  activity: SourceType;
}

export interface NormalizedSyntheticPage {
  rawVersions: RawProviderRecordVersion[];
  normalizedVersions: NormalizedProviderRecordVersion[];
  candidates: ImportCandidate[];
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function asSyntheticTransaction(value: unknown): SyntheticBankTransaction {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The made-up provider returned a record TaxSorted could not read.");
  }
  const record = value as Partial<SyntheticBankTransaction>;
  if (
    !record.id ||
    record.type !== "bank-transaction" ||
    !record.revision ||
    !record.updatedAt ||
    !Number.isFinite(Date.parse(record.updatedAt)) ||
    !record.date ||
    !isIsoDate(record.date) ||
    !["inflow", "outflow"].includes(record.direction ?? "") ||
    !Number.isSafeInteger(record.amountMinor) ||
    (record.amountMinor ?? 0) <= 0 ||
    record.currency !== "GBP" ||
    typeof record.description !== "string" ||
    !["reconciled", "unreconciled"].includes(record.status ?? "")
  ) {
    throw new Error("The made-up provider returned an invalid bank transaction.");
  }
  return record as SyntheticBankTransaction;
}

export async function accountingValueDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalAccountingJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")}`;
}

export async function accountingPageDigest(records: readonly unknown[]): Promise<string> {
  return accountingValueDigest(records);
}

function suggestedCategory(transaction: SyntheticBankTransaction, activity: SourceType): {
  category: string;
  basis: string;
} {
  if (activity === "uk-property") {
    if (transaction.direction === "inflow") {
      return {
        category: "periodAmount",
        basis: "Money came in and the made-up description says it was property income.",
      };
    }
    if (/train|travel/iu.test(transaction.description)) {
      return {
        category: "travelCosts",
        basis: "The made-up description contains a travel word.",
      };
    }
    return {
      category: "other",
      basis: "No narrower property category was clear, so TaxSorted used the broad expense category.",
    };
  }
  if (transaction.direction === "inflow") {
    return {
      category: "turnover",
      basis: "Money came in and the made-up description says it was a business receipt.",
    };
  }
  if (/train|travel/iu.test(transaction.description)) {
    return {
      category: "carVanTravelExpenses",
      basis: "The made-up description contains a travel word.",
    };
  }
  if (/software|subscription/iu.test(transaction.description)) {
    return {
      category: "adminCosts",
      basis: "The made-up description points to an everyday software or office cost.",
    };
  }
  return {
    category: "otherExpenses",
    basis: "No narrower category was clear, so TaxSorted used the broad expense category.",
  };
}

export async function normalizeSyntheticAccountingPage(
  values: readonly unknown[],
  context: SyntheticNormalizationContext
): Promise<NormalizedSyntheticPage> {
  if (!context.organisationId || !context.organisationName) {
    throw new Error("Choose one made-up provider organisation before normalising records.");
  }
  if (!Number.isFinite(Date.parse(context.observedAt))) {
    throw new Error("The provider observation time is invalid.");
  }

  const rawVersions: RawProviderRecordVersion[] = [];
  const normalizedVersions: NormalizedProviderRecordVersion[] = [];
  const candidates: ImportCandidate[] = [];

  for (const value of values) {
    const transaction = asSyntheticTransaction(value);
    const identity: ProviderRecordIdentity = {
      provider: "synthetic",
      environment: "sandbox",
      organisationId: context.organisationId,
      objectType: transaction.type,
      objectId: transaction.id,
    };
    const payloadDigest = await accountingValueDigest(transaction);
    const rawVersionId = JSON.stringify([
      "raw-provider-version",
      providerRecordIdentityKey(identity),
      payloadDigest,
    ]);
    const rawVersion: RawProviderRecordVersion = {
      id: rawVersionId,
      identity,
      payloadDigest,
      providerRevision: transaction.revision,
      sourceUpdatedAt: transaction.updatedAt,
      observedAt: context.observedAt,
      deleted: false,
      payload: structuredClone(transaction),
    };
    rawVersions.push(rawVersion);

    const direction = transaction.direction === "inflow" ? "in" : "out";
    const kind = direction === "in" ? "income" : "expense";
    const suggestion = suggestedCategory(transaction, context.activity);
    const limitations = [
      "This is made-up provider data, not a Xero, HMRC or customer record.",
      "A bank description cannot prove business purpose or tax treatment.",
      ...(transaction.status === "unreconciled"
        ? ["The made-up provider marks this bank transaction as unreconciled."]
        : []),
    ];
    const normalizedFacts = {
      schema: SYNTHETIC_ACCOUNTING_MAPPER_VERSION,
      identity,
      revision: transaction.revision,
      date: transaction.date,
      amountPence: transaction.amountMinor,
      direction,
      kind,
      category: suggestion.category,
      activity: context.activity,
      description: transaction.description,
      status: transaction.status,
    };
    const contentDigest = await accountingValueDigest(normalizedFacts);
    const normalizedVersionId = JSON.stringify([
      "normalized-provider-version",
      rawVersionId,
      SYNTHETIC_ACCOUNTING_MAPPER_VERSION,
      contentDigest,
    ]);
    normalizedVersions.push({
      id: normalizedVersionId,
      rawVersionId,
      mapperVersion: SYNTHETIC_ACCOUNTING_MAPPER_VERSION,
      kind: "bank-observation",
      occurredOn: transaction.date,
      amountPence: transaction.amountMinor,
      currency: transaction.currency,
      direction,
      description: transaction.description,
      suggestedCategory: suggestion.category,
      suggestedKind: kind,
      activity: context.activity,
      candidateContentDigest: contentDigest,
      limitations,
      candidateExternalId: transaction.id,
    });
    candidates.push({
      record: {
        date: transaction.date,
        amount: transaction.amountMinor,
        kind,
        category: suggestion.category,
        source: context.activity,
        description: transaction.description,
      },
      origin: {
        kind: "accounting-provider",
        provider: {
          provider: "synthetic",
          environment: "sandbox",
          organisationId: context.organisationId,
          objectType: transaction.type,
        },
        accountScope: `synthetic:${context.organisationId}`,
        externalId: transaction.id,
        label: `${context.organisationName} · made-up provider`,
        sourceRevision: transaction.revision,
      },
      contentDigest,
      suggestion: {
        basis: suggestion.basis,
        limitation: limitations.join(" "),
      },
      ...(transaction.status === "unreconciled"
        ? {
            reviewNote:
              "The made-up provider marks this transaction as unreconciled. In a real connector, fix or confirm that in the accounting software, then sync again.",
          }
        : {}),
    });
  }

  return { rawVersions, normalizedVersions, candidates };
}
