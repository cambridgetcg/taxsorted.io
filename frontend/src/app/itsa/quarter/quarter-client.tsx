"use client";

// i18n: deferred to M2 — plain English for launch

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { quarterForDate, type LedgerRecord, type TaxYear } from "@taxsorted/engine/uk/itsa";
import { createRecordsStore, type RecordsStore } from "@/lib/records";
import { SOURCES } from "@/lib/sources";
import { api } from "@/lib/api";
import { EducationNotice } from "@/components/prep/education-notice";
import { QuarterCard } from "@/components/prep/quarter-card";
import { SubmitFlow } from "@/components/prep/submit-flow";
import { EstimateCard } from "@/components/prep/estimate-card";
import { todayIsoLocal } from "@/lib/local-date";
import { useMounted } from "@/lib/use-mounted";

// MTD ITSA is mandatory from 2026-27 onward, so this page is pinned to that
// year until a real tax-year picker exists (same convention as records-client.tsx).
const TAX_YEAR: TaxYear = "2026-27";

export default function QuarterClient() {
  // One store for the lifetime of this page; the browser's IndexedDB by
  // default, or a Map if a test ever renders this component directly.
  const store = useMemo<RecordsStore>(() => createRecordsStore(), []);
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [election, setElection] = useState<"standard" | "calendar">("standard");
  // null = "not yet manually chosen" — the picker falls back to whichever
  // quarter today actually falls in (else Q4). Once the reader clicks a Q
  // button that choice sticks, even across an election toggle: an election
  // change only moves that same quarter's boundaries, it shouldn't also
  // yank the reader back to "today".
  const [pickedQuarterIndex, setPickedQuarterIndex] = useState<1 | 2 | 3 | 4 | null>(null);
  const mounted = useMounted();

  // Whether there's a real ITSA connection to submit through — same
  // `connections.itsa` source of truth the HMRC panel reads (never the
  // legacy any-rail `connected`). Unlike the panel, this page never CREATES
  // an entity just from being visited — that stays the dashboard's job;
  // finding none just means the submit flow stays locked.
  const [entityId, setEntityId] = useState<string | null>(null);
  const [connectedItsa, setConnectedItsa] = useState(false);

  useEffect(() => {
    let cancelled = false;
    store.list().then((all) => {
      if (!cancelled) {
        setRecords(all);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  useEffect(() => {
    let cancelled = false;

    async function loadConnection() {
      try {
        const { entities } = await api.listEntities();
        if (cancelled) return;
        const picked = entities.find((e) => e.nino) ?? null;
        setEntityId(picked?.id ?? null);
        setConnectedItsa(picked?.connections.itsa ?? false);
      } catch {
        if (cancelled) return;
        setEntityId(null);
        setConnectedItsa(false);
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm text-accent hover:text-accent-deep">
        ← Back to TaxSorted
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Quarterly figures & estimate</h1>
      <p className="mt-3 text-ink-soft">
        Your cumulative Q figures, ready to copy into any MTD software — and a cited estimate of
        what you might owe.
      </p>

      <div className="mt-6">
        <EducationNotice />
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-white p-4 text-sm text-ink-soft sm:p-5">
        <p>
          These are exactly the cumulative figures MTD software sends. Connect to HMRC&apos;s
          sandbox on your dashboard to practice a real submission below — production filing stays
          gated on HMRC recognition, which we&apos;re walking in the open.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {SOURCES.map((s) => (
          <div key={s.value} className="space-y-4">
            <QuarterCard
              records={loaded ? records : []}
              source={s.value}
              taxYear={TAX_YEAR}
              quarterIndex={quarterIndex}
              election={election}
              onQuarterChange={setPickedQuarterIndex}
              onElectionChange={setElection}
            />
            <SubmitFlow
              entityId={entityId}
              connectedItsa={connectedItsa}
              records={loaded ? records : []}
              source={s.value}
              taxYear={TAX_YEAR}
              quarterIndex={quarterIndex}
              election={election}
            />
          </div>
        ))}
      </div>

      <div className="mt-8">
        <EstimateCard records={loaded ? records : []} taxYear={TAX_YEAR} election={election} />
      </div>
    </div>
  );
}
