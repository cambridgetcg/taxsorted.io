"use client";

// i18n: deferred to M2 — plain English for launch

import { useEffect, useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  quarterForDate,
  type LedgerRecord,
  type SourceType,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";
import { createRecordsStore, type RecordsStore } from "@/lib/records";
import {
  projectReadyRecords,
  type LocalBooksState,
  type LocalLedger,
} from "@/lib/local-books";
import { SOURCES } from "@/lib/sources";
import { api, type ApiEntity, type ItsaBusiness } from "@/lib/api";
import { EducationNotice } from "@/components/prep/education-notice";
import { QuarterCard } from "@/components/prep/quarter-card";
import { SubmitFlow } from "@/components/prep/submit-flow";
import { EstimateCard } from "@/components/prep/estimate-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { todayIsoLocal } from "@/lib/local-date";
import { useMounted } from "@/lib/use-mounted";

// MTD ITSA is mandatory from 2026-27 onward, so this page is pinned to that
// year until a real tax-year picker exists (same convention as records-client.tsx).
const TAX_YEAR: TaxYear = "2026-27";

type LoadState<T> =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; value: T };

export default function QuarterClient() {
  // One store for the lifetime of this page; the browser's IndexedDB by
  // default, or a Map if a test ever renders this component directly.
  const store = useMemo<RecordsStore>(() => createRecordsStore(), []);
  const [booksState, setBooksState] = useState<LoadState<LocalBooksState>>({ kind: "loading" });
  const books = booksState.kind === "ready" ? booksState.value : null;
  const records: LedgerRecord[] = useMemo(
    () => (books ? projectReadyRecords(books) : []),
    [books]
  );
  const [election, setElection] = useState<"standard" | "calendar">("standard");
  // null = "not yet manually chosen" — the picker falls back to whichever
  // quarter today actually falls in (else Q4). Once the reader clicks a Q
  // button that choice sticks, even across an election toggle: an election
  // change only moves that same quarter's boundaries, it shouldn't also
  // yank the reader back to "today".
  const [pickedQuarterIndex, setPickedQuarterIndex] = useState<1 | 2 | 3 | 4 | null>(null);
  const mounted = useMounted();

  // A local book belongs to a person only after the reader says so. Entity
  // order is never ownership: even one NINO entity remains unselected until
  // its id is persisted on that ledger. This page never creates entities.
  const [entitiesState, setEntitiesState] = useState<LoadState<ApiEntity[]>>({ kind: "loading" });
  const [linkingLedgerId, setLinkingLedgerId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<{ ledgerId: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let requestNumber = 0;

    const loadBooks = (showLoading: boolean) => {
      const thisRequest = ++requestNumber;
      // An external-tab change locks and removes the old submission view
      // immediately; the last-moment submit check is still the final guard.
      if (showLoading) setBooksState({ kind: "loading" });
      store.state().then(
        (state) => {
          if (!cancelled && thisRequest === requestNumber) {
            setBooksState({ kind: "ready", value: state });
          }
        },
        () => {
          if (!cancelled && thisRequest === requestNumber) {
            setBooksState({
              kind: "error",
              message:
                "We couldn't read your local books. Nothing was changed. Reload this page to try again.",
            });
          }
        }
      );
    };

    loadBooks(false);
    const unsubscribe = store.subscribe(() => loadBooks(true));
    return () => {
      cancelled = true;
      requestNumber += 1;
      unsubscribe();
    };
  }, [store]);

  useEffect(() => {
    let cancelled = false;

    async function loadConnection() {
      try {
        const { entities } = await api.listEntities();
        if (cancelled) return;
        setEntitiesState({
          kind: "ready",
          value: entities.filter((entity) => Boolean(entity.nino)),
        });
      } catch {
        if (cancelled) return;
        setEntitiesState({
          kind: "error",
          message:
            "We couldn't load your TaxSorted people. Sending is locked, and your local books are unchanged. Reload this page to try again.",
        });
      }
    }

    loadConnection();
    return () => {
      cancelled = true;
    };
  }, []);

  // "Today's quarter" can only be known client-side — computed straight in
  // render (not stored via an effect) and gated on useMounted() so the
  // server-rendered shell and the first client paint always agree on the
  // deterministic Q4 fallback; the real default lands the render after.
  const autoQuarterIndex = mounted ? (quarterForDate(todayIsoLocal(), TAX_YEAR, election)?.index ?? 4) : 4;
  const quarterIndex = pickedQuarterIndex ?? autoQuarterIndex;
  const hasMultipleLedgersForOneActivity =
    books !== null &&
    SOURCES.some(
      (source) =>
        books.ledgers.filter((ledger) => ledger.activity === source.value).length > 1
    );

  async function linkLedger(
    ledger: LocalLedger,
    entityId: string,
    hmrcBusinessId?: string
  ) {
    if (entitiesState.kind !== "ready") return;
    const entity = entitiesState.value.find((candidate) => candidate.id === entityId) ?? null;
    setLinkingLedgerId(ledger.id);
    setLinkError(null);
    try {
      await store.linkLedgerToEntity(
        ledger.id,
        entity
          ? { entityId: entity.id, entityName: entity.name, hmrcBusinessId }
          : null
      );
      const next = await store.state();
      setBooksState({ kind: "ready", value: next });
    } catch {
      setLinkError({
        ledgerId: ledger.id,
        message: "That link wasn't saved. Nothing was sent. Try again.",
      });
    } finally {
      setLinkingLedgerId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/tools", label: "Do my tax" },
          { href: "/itsa", label: "Income Tax" },
        ]}
        current="Quarterly figures"
      />

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Quarterly figures & estimate</h1>
      <p className="mt-3 text-base text-ink-soft">
        Your running totals for each quarter of Income Tax Self Assessment (ITSA), built from
        reviewed digital records — plus a cited estimate of what you might owe.
      </p>

      <div className="mt-6">
        <EducationNotice />
      </div>

      {booksState.kind === "loading" && (
        <p className="mt-6 text-base text-ink-soft" role="status">
          Loading your local books…
        </p>
      )}

      {booksState.kind === "error" && (
        <Alert className="mt-6">
          <AlertTitle>Your books are not available just now</AlertTitle>
          <AlertDescription>{booksState.message}</AlertDescription>
        </Alert>
      )}

      {booksState.kind === "ready" && entitiesState.kind === "loading" && (
        <p className="mt-6 text-base text-ink-soft" role="status">
          Loading the TaxSorted people you can link…
        </p>
      )}

      {booksState.kind === "ready" && entitiesState.kind === "error" && (
        <Alert className="mt-6">
          <AlertTitle>Your TaxSorted people are not available just now</AlertTitle>
          <AlertDescription>{entitiesState.message}</AlertDescription>
        </Alert>
      )}

      {booksState.kind === "ready" && (
        <>
          <div className="mt-6 rounded-2xl border border-line bg-white p-4 text-base text-ink-soft sm:p-5">
            <p>
              These are TaxSorted&apos;s prepared category totals. You can practise sending them to
              HMRC&apos;s test system (the &ldquo;sandbox&rdquo;) below — connect on your dashboard
              first. Real filing stays off until TaxSorted completes HMRC recognition; we&apos;ll
              say so here.
            </p>
            <p className="mt-2">
              If another product will file them, use a compatible structured CSV or API transfer.
              Copying or retyping totals is not a digital link.
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {SOURCES.map((source) => {
              const sourceLedgers = booksState.value.ledgers.filter(
                (ledger) => ledger.activity === source.value
              );
              const ledger = sourceLedgers.length === 1 ? sourceLedgers[0] : null;
              const sourceRecords = ledger
                ? projectReadyRecords(booksState.value, ledger.id)
                : [];

              return (
                <div key={source.value} className="space-y-4">
                  {sourceLedgers.length > 1 ? (
                    <Alert>
                      <AlertTitle>{source.label} totals are kept separate</AlertTitle>
                      <AlertDescription>
                        This page does not yet show separate quarter cards for more than one
                        {" "}{source.label.toLowerCase()} book. It will not combine them into one total.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <QuarterCard
                      records={sourceRecords}
                      source={source.value}
                      taxYear={TAX_YEAR}
                      quarterIndex={quarterIndex}
                      election={election}
                      onQuarterChange={setPickedQuarterIndex}
                      onElectionChange={setElection}
                    />
                  )}

                  <LedgerSubmissionSection
                    key={`${source.value}:${ledger?.ownerEntityId ?? "unlinked"}`}
                    source={source}
                    ledgers={sourceLedgers}
                    books={booksState.value}
                    store={store}
                    entitiesState={entitiesState}
                    linkingLedgerId={linkingLedgerId}
                    error={ledger && linkError?.ledgerId === ledger.id ? linkError.message : null}
                    onLink={linkLedger}
                    taxYear={TAX_YEAR}
                    quarterIndex={quarterIndex}
                    election={election}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            {hasMultipleLedgersForOneActivity ? (
              <Alert>
                <AlertTitle>Your estimate is paused</AlertTitle>
                <AlertDescription>
                  TaxSorted will not combine separate businesses into one estimate. Separate-book
                  estimates are not available on this page yet.
                </AlertDescription>
              </Alert>
            ) : (
              <EstimateCard records={records} taxYear={TAX_YEAR} election={election} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LedgerSubmissionSection({
  source,
  ledgers,
  books,
  store,
  entitiesState,
  linkingLedgerId,
  error,
  onLink,
  taxYear,
  quarterIndex,
  election,
}: {
  source: { value: SourceType; label: string };
  ledgers: LocalLedger[];
  books: LocalBooksState;
  store: RecordsStore;
  entitiesState: LoadState<ApiEntity[]>;
  linkingLedgerId: string | null;
  error: string | null;
  onLink: (ledger: LocalLedger, entityId: string, hmrcBusinessId?: string) => Promise<void>;
  taxYear: TaxYear;
  quarterIndex: 1 | 2 | 3 | 4;
  election: "standard" | "calendar";
}) {
  const ledger = ledgers.length === 1 ? ledgers[0] : null;
  const entities = entitiesState.kind === "ready" ? entitiesState.value : [];
  const linkedEntity = ledger?.ownerEntityId
    ? (entities.find((entity) => entity.id === ledger.ownerEntityId) ?? null)
    : null;
  const linkedEntityId = linkedEntity?.id ?? null;
  const linkedEntityConnected = linkedEntity?.connections.itsa ?? false;
  const ledgerActivity = ledger?.activity ?? null;
  const [businessesState, setBusinessesState] = useState<LoadState<ItsaBusiness[]>>({
    kind: "loading",
  });

  useEffect(() => {
    if (!linkedEntityId || !linkedEntityConnected || !ledgerActivity) return;
    let cancelled = false;

    async function loadBusinesses() {
      setBusinessesState({ kind: "loading" });
      try {
        const { businesses } = await api.businesses(linkedEntityId as string);
        if (cancelled) return;
        setBusinessesState({
          kind: "ready",
          value: businesses.filter((business) => business.typeOfBusiness === ledgerActivity),
        });
      } catch {
        if (cancelled) return;
        setBusinessesState({
          kind: "error",
          message:
            "We couldn't load the matching HMRC businesses. Sending is locked and nothing was changed. Reload this page to try again.",
        });
      }
    }

    loadBusinesses();
    return () => {
      cancelled = true;
    };
  }, [ledgerActivity, linkedEntityConnected, linkedEntityId]);

  if (ledgers.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
          <h2 className="font-semibold text-ink">Link this {source.label.toLowerCase()} book</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Add a record first. TaxSorted will make the local book that you can link.
          </p>
        </div>
        <SubmissionLockedCard sourceLabel={source.label} />
      </>
    );
  }

  if (ledgers.length > 1) {
    return (
      <>
        <Alert>
          <AlertTitle>Choose one separate book before sending</AlertTitle>
          <AlertDescription>
            You have more than one {source.label.toLowerCase()} book. This page cannot safely
            combine them or guess which one belongs to a TaxSorted person.
          </AlertDescription>
        </Alert>
        <SubmissionLockedCard sourceLabel={source.label} />
      </>
    );
  }

  // Narrowed by the early returns above.
  const oneLedger = ledger as LocalLedger;
  const savedLinkMissing = Boolean(
    oneLedger.ownerEntityId && !linkedEntity && entitiesState.kind === "ready"
  );
  const businesses = businessesState.kind === "ready" ? businessesState.value : [];
  const linkedBusiness = oneLedger.hmrcBusinessId
    ? (businesses.find((business) => business.businessId === oneLedger.hmrcBusinessId) ?? null)
    : null;
  const savedBusinessMissing = Boolean(
    oneLedger.hmrcBusinessId && businessesState.kind === "ready" && !linkedBusiness
  );
  const ledgerRecords = projectReadyRecords(books, oneLedger.id);

  return (
    <>
      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <h2 className="font-semibold text-ink">Link this {source.label.toLowerCase()} book</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Choose the TaxSorted person and HMRC business these records belong to. TaxSorted will
          never choose either one for you, even when there is only one option.
        </p>

        {entitiesState.kind === "loading" && (
          <p className="mt-3 text-sm text-ink-soft" role="status">
            Loading your TaxSorted people…
          </p>
        )}

        {entitiesState.kind === "error" && (
          <p className="mt-3 text-sm text-ink-soft">
            TaxSorted people are unavailable, so sending stays locked.
          </p>
        )}

        {entitiesState.kind === "ready" && entities.length === 0 && (
          <p className="mt-3 text-sm text-ink-soft">
            No TaxSorted person has a National Insurance number yet. Add one on your dashboard,
            then come back to link this book.
          </p>
        )}

        {entitiesState.kind === "ready" && entities.length > 0 && (
          <div className="mt-4 max-w-xl">
            <label
              className="block text-sm font-medium text-ink"
              htmlFor={`entity-link-${oneLedger.id}`}
            >
              1. TaxSorted person
            </label>
            <select
              id={`entity-link-${oneLedger.id}`}
              className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-base text-ink"
              value={linkedEntity?.id ?? ""}
              disabled={linkingLedgerId === oneLedger.id}
              onChange={(event) => void onLink(oneLedger, event.target.value)}
            >
              <option value="">Not linked — choose a person</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name} — {entity.connections.itsa ? "HMRC connected" : "not connected to HMRC"}
                </option>
              ))}
            </select>
          </div>
        )}

        {savedLinkMissing && (
          <p className="mt-3 text-sm text-ink-soft">
            The saved person ({oneLedger.ownerEntityName ?? "name unavailable"}) is no longer
            available. Choose another person before sending.
          </p>
        )}

        {linkedEntity && !linkedEntityConnected && (
          <p className="mt-3 text-sm text-ink-soft">
            {linkedEntity.name} is not connected to HMRC for Income Tax. Connect it on your
            dashboard before choosing its HMRC business.
          </p>
        )}

        {linkedEntity && linkedEntityConnected && businessesState.kind === "loading" && (
          <p className="mt-3 text-sm text-ink-soft" role="status">
            Loading matching HMRC businesses…
          </p>
        )}

        {linkedEntity && linkedEntityConnected && businessesState.kind === "error" && (
          <Alert className="mt-3" variant="destructive">
            <AlertTitle>HMRC businesses are not available just now</AlertTitle>
            <AlertDescription>{businessesState.message}</AlertDescription>
          </Alert>
        )}

        {linkedEntity &&
          linkedEntityConnected &&
          businessesState.kind === "ready" &&
          businesses.length === 0 && (
            <p className="mt-3 text-sm text-ink-soft">
              HMRC returned no {source.label.toLowerCase()} business for {linkedEntity.name}, so
              there is nothing safe to link or send.
            </p>
          )}

        {linkedEntity &&
          linkedEntityConnected &&
          businessesState.kind === "ready" &&
          businesses.length > 0 && (
            <div className="mt-4 max-w-xl">
              <label
                className="block text-sm font-medium text-ink"
                htmlFor={`hmrc-business-link-${oneLedger.id}`}
              >
                2. HMRC business
              </label>
              <select
                id={`hmrc-business-link-${oneLedger.id}`}
                className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-base text-ink"
                value={linkedBusiness?.businessId ?? ""}
                disabled={linkingLedgerId === oneLedger.id}
                onChange={(event) =>
                  void onLink(oneLedger, linkedEntity.id, event.target.value || undefined)
                }
              >
                <option value="">Not linked — choose an HMRC business</option>
                {businesses.map((business) => (
                  <option key={business.businessId} value={business.businessId}>
                    {business.tradingName ?? "Unnamed business"} — {business.businessId}
                  </option>
                ))}
              </select>
            </div>
          )}

        {savedBusinessMissing && (
          <p className="mt-3 text-sm text-ink-soft">
            The saved HMRC business is no longer in HMRC&apos;s matching list. Choose another
            business before sending.
          </p>
        )}

        {linkedEntity && linkedBusiness && (
          <p className="mt-3 text-sm text-ink-soft">
            Linked to {linkedEntity.name} and {linkedBusiness.tradingName ?? linkedBusiness.businessId}.
            Changing either link makes TaxSorted ask you to confirm the book&apos;s separate-business
            scope again before sending.
          </p>
        )}

        {linkingLedgerId === oneLedger.id && (
          <p className="mt-2 text-sm text-ink-soft" role="status">
            Saving the link…
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>

      {linkedEntity && linkedBusiness ? (
        <SubmitFlow
          entityId={linkedEntity.id}
          connectedItsa={linkedEntity.connections.itsa}
          hmrcBusinessId={linkedBusiness.businessId}
          records={ledgerRecords}
          source={source.value}
          taxYear={taxYear}
          quarterIndex={quarterIndex}
          election={election}
          ledgerScopeConfirmed={oneLedger.scopeState === "confirmed"}
          storeRevision={books.storeRevision}
          prepareSubmission={async () => {
            const fresh = await store.state();
            const freshLedger = fresh.ledgers.find(
              (candidate) => candidate.id === oneLedger.id
            );
            return {
              records: projectReadyRecords(fresh, oneLedger.id),
              ledgerScopeConfirmed:
                freshLedger?.scopeState === "confirmed" &&
                freshLedger.ownerEntityId === linkedEntity.id &&
                freshLedger.hmrcBusinessId === linkedBusiness.businessId,
              storeRevision: fresh.storeRevision,
            };
          }}
        />
      ) : (
        <SubmissionLockedCard sourceLabel={source.label} />
      )}
    </>
  );
}

function SubmissionLockedCard({ sourceLabel }: { sourceLabel: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          Send {sourceLabel} to HMRC
          <Badge variant="outline">SANDBOX</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-base text-ink-soft">
          Sending is locked until this local book is explicitly linked to both a TaxSorted person
          and the matching HMRC business.
        </p>
      </CardContent>
    </Card>
  );
}
