import { PASSPORT_EVIDENCE_DEFINITIONS, PASSPORT_INCOME_SOURCE_IDS } from "@taxsorted/engine/uk/passport";
import { createWorkspaceSession } from "@/lib/workspace-storage";
import {
  BOOKS_LEGACY_STORAGE_KEY,
  BOOKS_MIGRATION_CLOSED_KEY,
  BOOKS_STORAGE_KEY,
} from "@/lib/books-storage";
import {
  isLocalBooksState,
  LEGACY_LOCAL_BOOKS_SCHEMA,
  type LocalBooksState,
} from "@/lib/local-books";
import { validateLocalBooksState } from "@/lib/local-books-validation";
import { assertPassportDraft, effectivePassportEvidenceState, PASSPORT_STORAGE_KEY } from "@/lib/passport-store";
import {
  assertPreparationDraft,
  derivePreparationReview,
  type PreparationPurpose,
  type PreparationYear,
} from "@/lib/return-preparation";
import { preparationStorageKey } from "@/lib/return-preparation-store";

/** This period applies to Books only, independently of Passport and preparation. */
export const TAX_YEAR_PERIOD = Object.freeze({
  id: "2026-27",
  label: "2026–27",
  start: "2026-04-06",
  end: "2027-04-05",
} as const);

export interface BooksActivityProgress {
  records: number;
  /** Saved reviewState=ready; this does not establish filing readiness. */
  checked: number;
  needsReview: number;
  excluded: number;
  /** Distinct ledgers represented by at least one record in this period. */
  businesses: number;
  /** Only ledgers with at least one non-excluded record in this period. */
  unconfirmedBusinesses: number;
}

export type BooksProgress =
  | {
      status: "saved";
      activities: Record<"self-employment" | "uk-property", BooksActivityProgress>;
    }
  | { status: "missing" | "legacy" | "invalid" | "unavailable" };

/** Counts reflect the overall saved draft, not a particular tax year. */
export type PassportProgress =
  | {
      status: "saved";
      savedAt: string;
      sourceQuestions: { total: number; unanswered: number; explicitlyUnknown: number };
      evidence: { held: number; missing: number; notChecked: number; notExpected: number };
      /** Presence only; does not assert that a check is current or complete. */
      hasMtdCheck: boolean;
    }
  | { status: "missing" | "invalid" | "unavailable" };

/** Only the explicitly selected year's saved draft contributes to these counts. */
export type PreparationProgress =
  | {
      year: PreparationYear;
      status: "saved";
      savedAt: string;
      purpose: PreparationPurpose;
      circumstances: { unanswered: number; explicitlyUnknown: number };
      /** Active Yes circumstances only; counts categories, not documents. */
      evidence: { missing: number; collected: number; reviewed: number; unresolved: number };
      employment: {
        active: boolean;
        total: number;
        reviewed: number;
        unresolved: number;
        inactive: number;
        /** Active P45/other records whose figures cannot be reviewed here. */
        unsupported: number;
      };
      /** Count of overlap notices, including notices about inactive records. */
      overlapWarnings: number;
    }
  | { year: PreparationYear; status: "missing" | "invalid" | "unavailable" };

export interface TaxYearProgress {
  period: typeof TAX_YEAR_PERIOD;
  readAt: string;
  books: BooksProgress;
  passport: PassportProgress;
  preparation: PreparationProgress;
}

function emptyActivity(): BooksActivityProgress {
  return { records: 0, checked: 0, needsReview: 0, excluded: 0, businesses: 0, unconfirmedBusinesses: 0 };
}

function countBooks(state: LocalBooksState): BooksProgress {
  const activities = { "self-employment": emptyActivity(), "uk-property": emptyActivity() };
  const ledgers = new Map(state.ledgers.map(ledger => [ledger.id, ledger]));
  const represented = new Set<string>();
  const needingConfirmation = new Set<string>();
  for (const event of state.events) {
    if (event.occurredOn < TAX_YEAR_PERIOD.start || event.occurredOn > TAX_YEAR_PERIOD.end) continue;
    // The shared deep validator has established every event's ledger and date.
    const ledger = ledgers.get(event.ledgerId)!;
    const counts = activities[ledger.activity];
    counts.records += 1;
    if (event.reviewState === "ready") counts.checked += 1;
    else if (event.reviewState === "excluded") counts.excluded += 1;
    else counts.needsReview += 1;
    if (!represented.has(ledger.id)) {
      represented.add(ledger.id);
      counts.businesses += 1;
    }
    if (event.reviewState !== "excluded" && ledger.scopeState !== "confirmed" && !needingConfirmation.has(ledger.id)) {
      needingConfirmation.add(ledger.id);
      counts.unconfirmedBusinesses += 1;
    }
  }
  return { status: "saved", activities };
}

function booksProgress(current: unknown, legacy: unknown, migrationClosed: unknown): BooksProgress {
  try {
    if (migrationClosed !== undefined && typeof migrationClosed !== "boolean") return { status: "invalid" };
    // An explicit restore retires the old baseline; it must not resurrect here.
    const activeLegacy = migrationClosed === true ? undefined : legacy;
    if (activeLegacy !== undefined && !Array.isArray(activeLegacy)) return { status: "invalid" };
    if (Array.isArray(activeLegacy) && activeLegacy.some(record =>
      !record || typeof record !== "object" || typeof record.id !== "string" || !record.id
    )) return { status: "invalid" };

    if (current === undefined) return { status: activeLegacy === undefined ? "missing" : "legacy" };
    if (!isLocalBooksState(current)) {
      // Recognise the previous envelope without converting or writing it.
      if (
        current && typeof current === "object" && "schema" in current
        && current.schema === LEGACY_LOCAL_BOOKS_SCHEMA
        && "storeRevision" in current && Number.isSafeInteger(current.storeRevision)
        && (current.storeRevision as number) >= 0
        && ["ledgers", "events", "history", "imports"].every(key =>
          key in current && Array.isArray((current as Record<string, unknown>)[key])
        )
      ) return { status: "legacy" };
      return { status: "invalid" };
    }
    validateLocalBooksState(current);
    const existingIds = new Set(current.events.map(event => event.id));
    if (Array.isArray(activeLegacy) && activeLegacy.some(record => !existingIds.has(record.id))) {
      // An older tab can append after migration. Let Books reconcile it before
      // displaying counts; even an out-of-period addition can alter scope state.
      return { status: "legacy" };
    }
    return countBooks(current);
  } catch {
    // Validation errors may include private source details. Never return them.
    return { status: "invalid" };
  }
}

function passportProgress(value: unknown): PassportProgress {
  if (value === undefined || value === null) return { status: "missing" };
  try {
    assertPassportDraft(value);
    const evidence = { held: 0, missing: 0, notChecked: 0, notExpected: 0 };
    for (const definition of PASSPORT_EVIDENCE_DEFINITIONS) {
      // Match Passport's displayed evidence status, including source-map
      // exclusions. This records assertions; it does not inspect evidence.
      const state = effectivePassportEvidenceState(value, definition);
      if (state === "held") evidence.held += 1;
      else if (state === "missing") evidence.missing += 1;
      else if (state === "not-checked") evidence.notChecked += 1;
      else evidence.notExpected += 1;
    }
    return {
      status: "saved",
      savedAt: value.updatedAt,
      sourceQuestions: {
        total: PASSPORT_INCOME_SOURCE_IDS.length,
        unanswered: PASSPORT_INCOME_SOURCE_IDS.length - value.answeredIncomeSourceIds.length,
        explicitlyUnknown: value.answeredIncomeSourceIds.filter(id => value.incomeSources[id] === "unknown").length,
      },
      evidence,
      hasMtdCheck: value.mtdIncomeTaxPosition !== null,
    };
  } catch {
    return { status: "invalid" };
  }
}

function preparationProgress(value: unknown, year: PreparationYear): PreparationProgress {
  if (value === undefined) return { year, status: "missing" };
  try {
    assertPreparationDraft(value);
    // Match the preparation store: an unsaved draft or a value filed under a
    // different year must not become apparent saved progress.
    if (value.year !== year || value.revision < 1) return { year, status: "invalid" };
    const review = derivePreparationReview(value);
    const evidence = { missing: 0, collected: 0, reviewed: 0, unresolved: 0 };
    for (const item of review.checklist) {
      if (value.circumstances[item.id] !== "yes") continue;
      if (item.status in evidence) evidence[item.status as keyof typeof evidence] += 1;
    }
    return {
      year,
      status: "saved",
      savedAt: value.updatedAt,
      purpose: value.purpose,
      circumstances: { unanswered: review.unanswered.length, explicitlyUnknown: review.uncertain.length },
      evidence,
      employment: {
        active: review.employment.active,
        total: review.employment.total,
        reviewed: review.employment.reviewed,
        unresolved: review.employment.unresolved,
        inactive: review.employment.inactive,
        unsupported: review.employment.active ? value.employmentSources.filter(source => source.documentType !== "P60").length : 0,
      },
      overlapWarnings: review.warnings.length,
    };
  } catch {
    // Validation/review details can contain source data; only the status leaves.
    return { year, status: "invalid" };
  }
}

/**
 * Call only after the visitor asks to read saved local progress. One shared
 * readonly transaction; no store instances, migration, saved tax-data writes,
 * snapshot persistence, subscriptions or network. idb-keyval may initialise an
 * empty database/object store on a fresh profile. Only minimised status leaves
 * this function; source values and identifiers are not retained by a cache.
 */
export async function readTaxYearProgress(year: PreparationYear = "2025-26"): Promise<TaxYearProgress> {
  // Validate before opening a transaction, including calls from untyped input.
  const preparationKey = preparationStorageKey(year);
  let values: unknown[];
  try {
    values = await createWorkspaceSession().readMany([
      BOOKS_STORAGE_KEY,
      BOOKS_LEGACY_STORAGE_KEY,
      BOOKS_MIGRATION_CLOSED_KEY,
      PASSPORT_STORAGE_KEY,
      preparationKey,
    ]);
  } catch {
    return {
      period: TAX_YEAR_PERIOD,
      readAt: new Date().toISOString(),
      books: { status: "unavailable" },
      passport: { status: "unavailable" },
      preparation: { year, status: "unavailable" },
    };
  }
  return {
    period: TAX_YEAR_PERIOD,
    readAt: new Date().toISOString(),
    books: booksProgress(values[0], values[1], values[2]),
    passport: passportProgress(values[3]),
    preparation: preparationProgress(values[4], year),
  };
}
