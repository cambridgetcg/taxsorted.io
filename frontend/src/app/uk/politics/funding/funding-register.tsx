"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  PoliticsApiError,
  politicsApi,
  type DonationsResponse,
} from "@/lib/politics-api";

const TAKE = 25;
const OFFICIAL_REGISTER = "https://search.electoralcommission.org.uk/";

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function latestReportedQuarter(now = new Date()): { from: string; to: string } {
  const year = now.getUTCFullYear();
  const candidates = [
    [year, 8, 30, year, 6, 1],
    [year, 5, 30, year, 3, 1],
    [year, 2, 31, year, 0, 1],
    [year - 1, 11, 31, year - 1, 9, 1],
  ] as const;
  for (const [endYear, endMonth, endDay, startYear, startMonth, startDay] of candidates) {
    const end = new Date(Date.UTC(endYear, endMonth, endDay));
    const expectedPublication = new Date(end);
    expectedPublication.setUTCDate(expectedPublication.getUTCDate() + 31);
    if (now >= expectedPublication) {
      return { from: iso(new Date(Date.UTC(startYear, startMonth, startDay))), to: iso(end) };
    }
  }
  return { from: `${year - 1}-10-01`, to: `${year - 1}-12-31` };
}

function money(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100);
}

function date(value: string | null): string {
  if (!value) return "Not stated";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
}

export function FundingRegister() {
  const [draftDates, setDraftDates] = useState({ from: "", to: "" });
  const [dates, setDates] = useState({ from: "", to: "" });
  const [recipient, setRecipient] = useState("");
  const [submittedRecipient, setSubmittedRecipient] = useState("");
  const [skip, setSkip] = useState(0);
  const [result, setResult] = useState<DonationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PoliticsApiError | Error | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const initial = latestReportedQuarter();
      setDraftDates(initial);
      setDates(initial);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!dates.from || !dates.to) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      politicsApi
        .donations({ ...dates, recipient: submittedRecipient, skip, take: TAKE })
        .then((response) => {
          if (active) setResult(response);
        })
        .catch((caught) => {
          if (active) {
            setResult(null);
            setError(caught instanceof Error ? caught : new Error("The funding record could not be loaded."));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [dates, skip, submittedRecipient]);

  function search(event: FormEvent) {
    event.preventDefault();
    setSkip(0);
    setDates(draftDates);
    setSubmittedRecipient(recipient.trim());
  }

  const licenceGate = error instanceof PoliticsApiError && error.code === "source_terms_confirmation_needed";

  return (
    <section className="mt-8" aria-labelledby="funding-register-title">
      <div className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <h2 id="funding-register-title" className="text-2xl font-semibold text-ink">Declared party donations</h2>
        <p className="mt-1 text-sm text-ink-soft">One reported quarter at a time. Date windows are capped at 92 days.</p>
        <form onSubmit={search} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_minmax(12rem,1.3fr)_auto]">
          <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            From
            <input
              type="date"
              required
              value={draftDates.from}
              onChange={(event) => setDraftDates((current) => ({ ...current, from: event.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink"
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            To
            <input
              type="date"
              required
              value={draftDates.to}
              onChange={(event) => setDraftDates((current) => ({ ...current, to: event.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink"
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Recipient party (optional)
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              maxLength={100}
              placeholder="e.g. Labour Party"
              className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm normal-case tracking-normal text-ink"
            />
          </label>
          <button type="submit" className="self-end rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-deep">
            Read returns
          </button>
        </form>
      </div>

      {licenceGate ? (
        <div className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Reuse terms first</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">The official register is open. TaxSorted&apos;s mirror is not—yet.</h2>
          <p className="mt-4 max-w-3xl text-ink-soft">
            The Electoral Commission publishes the returns and download files, but Political
            Finance Online does not state blanket database-reuse terms. TaxSorted will not turn a
            public search into a bulk mirror until the Commission confirms those terms and the
            required attribution in writing.
          </p>
          <a
            href={(error as PoliticsApiError).sourceUrl || OFFICIAL_REGISTER}
            className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            Search the official Commission record ↗
          </a>
        </div>
      ) : null}

      {error && !licenceGate ? (
        <p role="alert" className="mt-6 rounded-2xl border border-line bg-white p-5 text-sm text-ink">
          {error.message}
        </p>
      ) : null}

      {loading ? <p className="mt-6 text-sm text-ink-soft" aria-live="polite">Reading the official returns…</p> : null}

      {result ? (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-ink-soft">
              {result.total.toLocaleString("en-GB")} records · showing {result.skip + 1}–{Math.min(result.skip + result.donations.length, result.total)}
            </p>
            <p className="text-xs text-ink-soft">
              <a href={result.source.url} className="text-accent underline">{result.source.name}</a>
            </p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-line bg-white">
            {result.donations.map((donation) => (
              <article key={donation.reference} className="grid gap-3 border-b border-line p-5 last:border-b-0 md:grid-cols-[9rem_minmax(0,1.2fr)_minmax(0,1fr)] md:gap-5">
                <div>
                  <p className="font-mono text-lg font-semibold text-ink">{money(donation.amountPence)}</p>
                  <p className="mt-1 text-xs text-ink-soft">Accepted {date(donation.acceptedDate)}</p>
                </div>
                <div>
                  <p className="font-semibold text-ink">{donation.donorName}</p>
                  <p className="mt-1 text-sm text-ink-soft">{donation.donorType || "Donor type not stated"} → {donation.recipient}</p>
                  {donation.companyNumber ? (
                    <a
                      href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(donation.companyNumber)}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 inline-block font-mono text-xs text-accent underline"
                    >
                      Companies House {donation.companyNumber} ↗
                    </a>
                  ) : null}
                  {donation.nature ? <p className="mt-2 text-sm text-ink-soft">{donation.nature}</p> : null}
                </div>
                <div className="text-xs text-ink-soft">
                  <p>{donation.donationType || "Donation"} · {donation.reportingPeriod || "period not stated"}</p>
                  <p className="mt-1">Reported {date(donation.reportedDate)} · {donation.register || "register not stated"}</p>
                  <a href={result.source.url} className="mt-1 inline-block font-mono text-accent underline">
                    Source {donation.reference} ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 flex justify-between gap-3">
            <button
              type="button"
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - TAKE))}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm text-ink disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={skip + result.donations.length >= result.total}
              onClick={() => setSkip(skip + TAKE)}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm text-ink disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-ink-soft">
        Northern Ireland donations and loans from before 1 July 2017 cannot be published under the
        applicable legislation. Donation records show declared transactions; they do not establish
        a donor&apos;s influence on any decision. A Companies House link confirms the reported company
        identifier only; it does not by itself prove donor permissibility or that the company was
        carrying on business in the UK on the donation date.
      </p>
    </section>
  );
}
