"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withBooksActivity } from "@/lib/books-navigation";
import { readTaxYearProgress, TAX_YEAR_PERIOD, type TaxYearProgress } from "@/lib/tax-year-progress";
import type { AudienceId } from "@/lib/tax-services";

type SupportedAudience = Extract<AudienceId, "individuals" | "sole-traders" | "landlords">;
type Activity = "self-employment" | "uk-property";
type NextAction = { id: string; title: string; detail: string; href: string };

function activityFor(audience: SupportedAudience): Activity | null {
  return audience === "sole-traders" ? "self-employment" : audience === "landlords" ? "uk-property" : null;
}

function nextActions(snapshot: TaxYearProgress, audience: SupportedAudience): NextAction[] {
  const actions: NextAction[] = [];
  const activity = activityFor(audience);
  const booksLink = (path: string) => withBooksActivity(path, activity ?? undefined);
  if (activity) {
    const books = snapshot.books;
    if (books.status === "legacy") {
      actions.push({ id: "books-legacy", title: "Open your existing Books", detail: "Review the earlier saved format in Money records. This overview has left it untouched.", href: booksLink("/books/workspace") });
    } else if (books.status === "invalid" || books.status === "unavailable") {
      actions.push({ id: "books-unavailable", title: "Open Money records", detail: "Check the saved Books there. An unreadable source is not an empty set of records.", href: booksLink("/books/workspace") });
    } else if (books.status === "missing") {
      actions.push({ id: "books-start", title: "Start or restore your Books", detail: "Add income and expenses, import a CSV, or restore a Books backup you already have.", href: booksLink("/books/workspace") });
    } else if (books.status === "saved") {
      const counts = books.activities[activity];
      if (counts.records === 0) actions.push({ id: "books-year", title: `Add records for ${TAX_YEAR_PERIOD.label}`, detail: "Open Money records to add or import records for this period. Other years are not included in this count.", href: booksLink("/books/workspace/money") });
      if (counts.needsReview > 0) actions.push({ id: "books-review", title: "Check your money records", detail: `${counts.needsReview} saved ${counts.needsReview === 1 ? "item is" : "items are"} waiting for review in this activity and period.`, href: booksLink("/books/workspace/money#money-inbox-heading") });
      if (counts.unconfirmedBusinesses > 0) actions.push({ id: "books-scope", title: "Confirm your business grouping", detail: "Check that the records in each group belong to one separate business.", href: booksLink("/books/workspace/business#ledger-scope-heading") });
      if (counts.records > 0 && counts.needsReview === 0 && counts.unconfirmedBusinesses === 0) actions.push({ id: "books-open", title: "Review your saved records", detail: "Review the records behind these counts. No waiting items does not establish that every transaction is present.", href: booksLink("/books/workspace/money") });
    }
  }

  const passport = snapshot.passport;
  if (passport.status === "missing") {
    actions.push({ id: "passport-start", title: "Start your Tax Passport", detail: "Note your income sources and what you still need to find out.", href: "/passport#passport-income-title" });
  } else if (passport.status === "invalid" || passport.status === "unavailable") {
    actions.push({ id: "passport-unavailable", title: "Open your Tax Passport", detail: "Check the saved Passport there. This overview has not changed or replaced it.", href: "/passport" });
  } else if (passport.status === "saved") {
    if (passport.sourceQuestions.unanswered > 0 || passport.sourceQuestions.explicitlyUnknown > 0) actions.push({ id: "passport-sources", title: "Review your income-source answers", detail: `${passport.sourceQuestions.unanswered} unanswered; ${passport.sourceQuestions.explicitlyUnknown} marked “Not sure”. Keep uncertainty visible until you can check it.`, href: "/passport#passport-income-title" });
    if (passport.evidence.missing > 0 || passport.evidence.notChecked > 0) actions.push({ id: "passport-evidence", title: "Review your evidence notes", detail: "Your saved labels include missing or unchecked evidence. No documents have been inspected here.", href: "/passport#passport-evidence-title" });
    if (passport.sourceQuestions.unanswered === 0 && passport.sourceQuestions.explicitlyUnknown === 0 && passport.evidence.missing === 0 && passport.evidence.notChecked === 0) actions.push({ id: "passport-open", title: "Review your Tax Passport", detail: "Check that its saved facts still fit your situation. They are not tied to this tax year.", href: "/passport" });
  }
  return actions.slice(0, 3);
}

function Counts({ values }: { values: readonly (readonly [string, number])[] }) {
  return <dl className="mt-4 grid grid-cols-2 gap-4">
    {values.map(([label, value]) => <div key={label}>
      <dt className="text-sm leading-5 text-ink-soft">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-semibold text-ink">{value}</dd>
    </div>)}
  </dl>;
}

function BooksProgress({ snapshot, activity }: { snapshot: TaxYearProgress; activity: Activity }) {
  const books = snapshot.books;
  const name = activity === "uk-property" ? "Your property records" : "Your sole-trader records";
  return <section aria-labelledby="tax-year-books-heading" className="rounded-2xl border border-line bg-surface p-5">
    <p className="section-label">Books · {TAX_YEAR_PERIOD.label}</p>
    <h3 id="tax-year-books-heading" className="mt-2 text-lg font-semibold text-ink">{name}</h3>
    <p className="mt-2 text-sm leading-6 text-ink-soft">Records dated 6 April 2026 to 5 April 2027, for this activity only.</p>
    {books.status === "saved" ? <>
      <Counts values={[
        ["Records saved", books.activities[activity].records],
        ["Records to check", books.activities[activity].needsReview],
        ["Businesses to confirm", books.activities[activity].unconfirmedBusinesses],
      ]} />
      <p className="mt-4 text-sm leading-6 text-ink-soft">{books.activities[activity].checked} marked checked; {books.activities[activity].excluded} excluded. These are saved review labels, not a check of tax treatment. Money records opens all saved dates and businesses.</p>
    </> : <p className="mt-4 rounded-xl bg-paper p-3 text-sm leading-6 text-ink">
      {books.status === "missing" ? "No saved Books were found on this device. You can start records or restore a backup. This does not mean you had no income."
        : books.status === "legacy" ? "Earlier Books were found. Open Money records to review that saved format; this overview has not changed it or counted it as empty."
          : books.status === "invalid" ? "The saved Books format could not be read. The saved data is untouched; no record count is shown."
            : "Books storage is unavailable for this read. No record count is shown. You can try refreshing or open Money records."}
    </p>}
  </section>;
}

function PassportProgress({ snapshot }: { snapshot: TaxYearProgress }) {
  const passport = snapshot.passport;
  return <section aria-labelledby="tax-year-passport-heading" className="rounded-2xl border border-line bg-surface p-5">
    <p className="section-label">Tax Passport · Saved facts</p>
    <h3 id="tax-year-passport-heading" className="mt-2 text-lg font-semibold text-ink">Your income sources and evidence notes</h3>
    <p className="mt-2 text-sm leading-6 text-ink-soft">Passport facts are not tied to a tax year. Review whether they still apply to your situation.</p>
    {passport.status === "saved" ? <>
      <p className="mt-2 text-sm text-ink-soft">Last saved <time dateTime={passport.savedAt}>{new Date(passport.savedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time>.</p>
      <Counts values={[
        ["Unanswered income-source questions", passport.sourceQuestions.unanswered],
        ["Income sources marked “Not sure”", passport.sourceQuestions.explicitlyUnknown],
        ["Evidence marked missing", passport.evidence.missing],
        ["Evidence not checked", passport.evidence.notChecked],
      ]} />
      <p className="mt-4 text-sm leading-6 text-ink-soft">Evidence counts are based on your saved income-source answers and evidence labels. Documents have not been uploaded, inspected or verified by this overview.</p>
    </> : <p className="mt-4 rounded-xl bg-paper p-3 text-sm leading-6 text-ink">
      {passport.status === "missing" ? "No saved Tax Passport was found on this device. Unanswered facts are not assumed to be zero."
        : passport.status === "invalid" ? "The saved Passport format could not be read. It is untouched; no answer or evidence counts are shown."
          : "Passport storage is unavailable for this read. You can try refreshing or open your Tax Passport."}
    </p>}
  </section>;
}

export function TaxYearProgressPanel({ audience }: { audience: AudienceId }) {
  if (audience !== "individuals" && audience !== "sole-traders" && audience !== "landlords") return null;
  // Requiring the choice again also prevents an old audience's pending read from
  // displaying counts or actions in a newly selected audience's panel.
  return <SavedProgress key={audience} audience={audience} />;
}

function SavedProgress({ audience }: { audience: SupportedAudience }) {
  const [shown, setShown] = useState(false);
  const [reading, setReading] = useState(false);
  const [snapshot, setSnapshot] = useState<TaxYearProgress | null>(null);
  const [failure, setFailure] = useState(false);
  const request = useRef(0);
  const showButton = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const focusAfterHide = useRef(false);
  const activity = activityFor(audience);

  useEffect(() => () => { request.current += 1; }, []);
  useEffect(() => {
    if (!shown && focusAfterHide.current) { showButton.current?.focus(); focusAfterHide.current = false; }
    else if (snapshot || failure) status.current?.focus();
  }, [shown, snapshot, failure]);

  async function refresh() {
    if (reading) return;
    const current = ++request.current;
    setShown(true);
    setReading(true);
    setSnapshot(null);
    setFailure(false);
    try {
      const next = await readTaxYearProgress();
      if (request.current === current) setSnapshot(next);
    } catch {
      if (request.current === current) setFailure(true);
    } finally {
      if (request.current === current) setReading(false);
    }
  }

  function hide() {
    request.current += 1;
    focusAfterHide.current = true;
    setShown(false);
    setReading(false);
    setSnapshot(null);
    setFailure(false);
  }

  const actions = snapshot ? nextActions(snapshot, audience) : [];
  return <section aria-labelledby="tax-year-progress-heading" className="mt-9 rounded-[2rem] border border-line bg-paper p-5 sm:p-7">
    <p className="section-label">On this device</p>
    <h2 id="tax-year-progress-heading" className="mt-3 font-display text-2xl font-semibold text-ink">Your saved progress</h2>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">Show a read-only overview of Books and Tax Passport saved on this device. No information is uploaded, copied between tools or saved by this overview. Your choice lasts for this visit; you can hide it at any time.</p>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">Books counts cover {TAX_YEAR_PERIOD.label} only. Passport facts are not year-specific. {audience === "individuals" ? "For individuals, this view shows Passport progress; business and property counts appear under those situations." : "You will see counts for your selected activity alongside your saved Passport."}</p>
    <div className="mt-5 flex flex-wrap gap-3">
      {!shown ? <Button ref={showButton} type="button" onClick={() => void refresh()}>Show my saved progress</Button> : <>
        <Button type="button" variant="outline" disabled={reading} onClick={() => void refresh()}>Refresh saved progress</Button>
        <Button type="button" variant="ghost" onClick={hide}>Hide saved progress</Button>
      </>}
    </div>
    {reading ? <p role="status" className="mt-4 text-sm text-ink-soft">Reading saved progress on this device…</p> : null}
    {failure ? <p ref={status} tabIndex={-1} role="status" className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm text-ink">Saved progress could not be read. Nothing has been changed. Try refreshing, or hide this overview.</p> : null}
    {snapshot ? <>
      <p ref={status} tabIndex={-1} role="status" className="mt-4 text-sm text-ink-soft">Snapshot read {new Date(snapshot.readAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}. Refresh to see later saved changes.</p>
      <section aria-labelledby="tax-year-next-actions" className="mt-6">
        <h3 id="tax-year-next-actions" className="text-lg font-semibold text-ink">Choose a next step</h3>
        <ol className="mt-3 grid gap-3 md:grid-cols-3">
          {actions.map(action => <li key={action.id}>
            <Link href={action.href} aria-labelledby={`tax-year-action-${action.id}`} className="flex h-full min-h-32 flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent hover:bg-accent-soft">
              <span id={`tax-year-action-${action.id}`} className="font-semibold text-accent">{action.title}</span>
              <span className="mt-2 text-sm leading-6 text-ink-soft">{action.detail}</span>
              <ArrowRight aria-hidden="true" className="mt-3 size-4 text-accent" />
            </Link>
          </li>)}
        </ol>
      </section>
      <div className={`mt-5 grid gap-4 ${activity ? "lg:grid-cols-2" : ""}`}>
        {activity ? <BooksProgress snapshot={snapshot} activity={activity} /> : null}
        <PassportProgress snapshot={snapshot} />
      </div>
      <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-ink-soft">These counts do not establish complete records, correct tax treatment or readiness to file. Evidence is not inspected here. Your personal checklist stays as you set it; this overview checks no boxes and sends nothing to HMRC.</p>
    </> : null}
  </section>;
}
