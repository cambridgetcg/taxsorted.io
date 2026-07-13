"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  PoliticsApiError,
  politicsApi,
  type ActivityItem,
  type BiographyEntry,
  type PersonDetailResponse,
  type PersonSummary,
  type PeopleResponse,
  type PublicContact,
} from "@/lib/politics-api";

const PAGE_SIZE = 20;

function cleanColour(colour: string | null | undefined): string {
  if (!colour) return "#8b9188";
  const value = colour.startsWith("#") ? colour : `#${colour}`;
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#8b9188";
}

// Party colours vary from near-black to bright yellow. Pick dark or white
// initials by perceived brightness so the letters stay readable on any of them.
function initialsColourFor(background: string): string {
  const r = parseInt(background.slice(1, 3), 16);
  const g = parseInt(background.slice(3, 5), 16);
  const b = parseInt(background.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 145 ? "#1c1f1c" : "#ffffff";
}

function initials(name: string): string {
  return name
    .replace(/^(Mr|Mrs|Ms|Miss|Sir|Dame|Lord|Baroness|Dr)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function displayDate(value: string | null | undefined): string {
  if (!value) return "Present";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function range(entry: BiographyEntry): string {
  if (!entry.startDate && !entry.endDate) return "";
  return `${displayDate(entry.startDate)} — ${displayDate(entry.endDate)}`;
}

function readableError(error: unknown): string {
  if (error instanceof PoliticsApiError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The official source took too long to answer. Try again in a moment.";
  }
  return "The public record could not be loaded. Try again in a moment.";
}

export function PeopleDirectory() {
  const [typedQuery, setTypedQuery] = useState("");
  const [query, setQuery] = useState("");
  const [house, setHouse] = useState<"commons" | "lords" | "all">("commons");
  const [skip, setSkip] = useState(0);
  const [result, setResult] = useState<PeopleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PersonDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = Number(new URLSearchParams(window.location.search).get("person"));
    if (!Number.isInteger(fromUrl) || fromUrl <= 0) return;
    const timer = window.setTimeout(() => setSelectedId(fromUrl), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      setResult(null);
      politicsApi
        .people({ q: query, house, skip, take: PAGE_SIZE })
        .then((response) => {
          if (active) setResult(response);
        })
        .catch((caught) => {
          if (active) setError(readableError(caught));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [house, query, skip]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setDetailLoading(true);
      setDetailError(null);
      politicsApi
        .person(selectedId)
        .then((response) => {
          if (active) setDetail(response);
        })
        .catch((caught) => {
          if (active) setDetailError(readableError(caught));
        })
        .finally(() => {
          if (active) setDetailLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (detail) document.getElementById("person-record-heading")?.focus();
  }, [detail]);

  const lastShown = result ? Math.min(result.skip + result.people.length, result.total) : 0;

  function search(event: FormEvent) {
    event.preventDefault();
    setSkip(0);
    setQuery(typedQuery.trim());
  }

  function selectPerson(person: PersonSummary) {
    setSelectedId(person.id);
    setDetail(null);
    const url = new URL(window.location.href);
    url.searchParams.set("person", String(person.id));
    window.history.replaceState({}, "", url);
    window.setTimeout(() => document.getElementById("person-record")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  function closePerson() {
    setSelectedId(null);
    setDetail(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("person");
    window.history.replaceState({}, "", url);
  }

  return (
    <section className="mt-8" aria-labelledby="directory-title">
      <div className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="directory-title" className="text-2xl font-semibold text-ink">People & offices</h2>
            <p className="mt-1 text-base text-ink-soft">Reads the official UK Parliament members list once the data is switched on.</p>
          </div>
          <a
            href="/uk/politics/method"
            className="inline-flex min-h-11 items-center text-base font-medium text-accent underline decoration-line underline-offset-4"
          >
            What is safe to publish?
          </a>
        </div>

        <form onSubmit={search} className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]">
          <label>
            <span className="sr-only">Name</span>
            <input
              value={typedQuery}
              onChange={(event) => setTypedQuery(event.target.value)}
              maxLength={100}
              placeholder="Search a name"
              className="h-12 w-full rounded-xl border border-line bg-white px-4 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label>
            <span className="sr-only">House</span>
            <select
              value={house}
              onChange={(event) => {
                setHouse(event.target.value as typeof house);
                setSkip(0);
              }}
              className="h-12 w-full rounded-xl border border-line bg-white px-4 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <option value="commons">House of Commons</option>
              <option value="lords">House of Lords</option>
              <option value="all">Both Houses</option>
            </select>
          </label>
          <button type="submit" className="h-12 rounded-xl bg-accent px-6 font-semibold text-white hover:bg-accent-deep">
            Search
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.18fr)]">
        <div>
          <div aria-live="polite" className="mb-3 min-h-6 text-sm text-ink-soft">
            {loading ? "Reading the official register…" : null}
            {!loading && result?.total === 0 ? "0 current people" : null}
            {!loading && result && result.total > 0 ? `${result.total.toLocaleString("en-GB")} current people · showing ${result.skip + 1}–${lastShown}` : null}
          </div>

          {error ? (
            <p role="alert" className="rounded-2xl border border-line bg-white p-5 text-sm text-ink">{error}</p>
          ) : null}

          {!loading && !error && result?.people.length === 0 ? (
            <p className="rounded-2xl border border-line bg-white p-5 text-sm text-ink">No current member matches that search.</p>
          ) : null}

          <div className="grid gap-3">
            {result?.people.map((person) => (
              <button
                type="button"
                key={person.id}
                onClick={() => selectPerson(person)}
                aria-pressed={selectedId === person.id}
                className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors ${selectedId === person.id ? "border-accent ring-2 ring-accent/15" : "border-line hover:border-accent"}`}
              >
                <span className="flex gap-4">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: cleanColour(person.party?.colour),
                      color: initialsColourFor(cleanColour(person.party?.colour)),
                    }}
                    aria-hidden="true"
                  >
                    {initials(person.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{person.name}</span>
                    <span className="mt-1 block text-sm text-ink-soft">
                      {[person.party?.name, person.seat?.name ?? person.house].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-accent" aria-hidden="true">→</span>
                </span>
              </button>
            ))}
          </div>

          {result && result.total > PAGE_SIZE ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={skip === 0}
                onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-base font-medium text-ink disabled:opacity-40"
              >
                <span aria-hidden="true">←</span>&nbsp;Previous
              </button>
              <button
                type="button"
                disabled={lastShown >= result.total}
                onClick={() => setSkip(skip + PAGE_SIZE)}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-base font-medium text-ink disabled:opacity-40"
              >
                Next&nbsp;<span aria-hidden="true">→</span>
              </button>
            </div>
          ) : null}

          {result ? (
            <p className="mt-4 text-sm text-ink-soft">
              Retrieved {displayDate(result.source.retrievedAt)} ·{" "}
              <a href={result.source.url} className="text-accent underline">{result.source.name}</a>
            </p>
          ) : null}
        </div>

        <div id="person-record" className="min-w-0 scroll-mt-6">
          {!selectedId ? <DirectoryGuide /> : null}
          {selectedId && detailLoading ? (
            <div className="rounded-3xl border border-line bg-white p-8 text-ink-soft" aria-live="polite">
              Joining the public record…
            </div>
          ) : null}
          {selectedId && detailError ? (
            <div className="rounded-3xl border border-line bg-white p-8">
              <p role="alert" className="text-ink">{detailError}</p>
              <button type="button" onClick={closePerson} className="mt-4 inline-flex min-h-11 items-center text-base font-medium text-accent">Close record</button>
            </div>
          ) : null}
          {detail ? <PersonRecord detail={detail} onClose={closePerson} /> : null}
        </div>
      </div>
    </section>
  );
}

function DirectoryGuide() {
  return (
    <aside className="rounded-3xl border border-line bg-white p-6 shadow-sm lg:sticky lg:top-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Open a record</p>
      <h2 className="mt-3 text-3xl font-semibold text-ink">Only what the official record shows.</h2>
      <p className="mt-4 text-ink-soft">
        Pick a person to see their official record. Every section links back to Parliament.
        Missing data stays missing — we never fill gaps with guesses.
      </p>
      <ul className="mt-5 space-y-3 text-base text-ink-soft">
        <li><span aria-hidden="true">✓</span> Current role, party and represented place</li>
        <li><span aria-hidden="true">✓</span> Published office contact routes</li>
        <li><span aria-hidden="true">✓</span> Declared interests, with address lines removed</li>
        <li><span aria-hidden="true">✓</span> Public staff listing and recent work in Parliament</li>
        <li><span aria-hidden="true">—</span> No home details, portraits or guessed contacts</li>
      </ul>
    </aside>
  );
}

function PersonRecord({ detail, onClose }: { detail: PersonDetailResponse; onClose: () => void }) {
  const { person } = detail;
  const roles = useMemo(
    () => [
      ...detail.roles.government.map((role) => ({ ...role, family: "Government" })),
      ...detail.roles.opposition.map((role) => ({ ...role, family: "Opposition" })),
      ...detail.roles.other.map((role) => ({ ...role, family: "Other public role" })),
      ...detail.roles.committees.map((role) => ({ ...role, family: "Committee" })),
    ],
    [detail.roles],
  );

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
      <header className="border-b border-line p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">{person.house} · official record</p>
            <h2
              id="person-record-heading"
              tabIndex={-1}
              className="mt-2 text-3xl font-bold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:text-4xl"
            >
              {person.name}
            </h2>
            <p className="mt-2 text-ink-soft">
              {[person.party?.name, person.seat?.name].filter(Boolean).join(" · ") || person.fullTitle}
            </p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-base text-ink-soft">
            Close
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={person.profileUrl} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
            Parliament profile ↗
          </a>
          {person.membershipStartDate ? (
            <span className="rounded-full bg-paper px-4 py-2 text-sm text-ink-soft">
              Member since {displayDate(person.membershipStartDate)}
            </span>
          ) : null}
        </div>
      </header>

      <RecordSection title="Public office contacts" count={detail.contacts.length}>
        {detail.contacts.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {detail.contacts.map((contact, index) => <ContactCard key={`${contact.type}-${index}`} contact={contact} />)}
          </div>
        ) : <EmptyLine text="Parliament lists no professional contact route for this record." />}
        <p className="mt-4 text-sm text-ink-soft">Private, home, personal and residential contact types are removed by TaxSorted.</p>
      </RecordSection>

      <RecordSection title="Public roles" count={roles.length}>
        {roles.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {roles.map((role, index) => (
              <li key={`${role.family}-${role.id}-${index}`} className="rounded-2xl bg-paper p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">{role.family}</p>
                <p className="mt-1 font-medium text-ink">{role.name}</p>
                <p className="mt-1 text-xs text-ink-soft">{range(role)}</p>
              </li>
            ))}
          </ul>
        ) : <EmptyLine text="No additional Parliamentary post is listed." />}
      </RecordSection>

      <RecordSection title="Formal office power" count={detail.formalPower.assessmentIds.length}>
        <p className="rounded-2xl bg-accent-soft p-4 text-sm text-ink">
          This rates published powers of each office, not {person.name}&apos;s character,
          performance or private influence. Separate offices are never added together.
        </p>
        {detail.formalPower.assessmentIds.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.formalPower.assessmentIds.map((assessmentId) => (
              <span key={assessmentId} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm text-ink">
                {officeAssessmentLabel(assessmentId)}
              </span>
            ))}
          </div>
        ) : <EmptyLine text="No office assessment has completed the provisional calibration for this record." />}
        {detail.formalPower.unassessedCurrentRoles.length ? (
          <p className="mt-4 text-sm text-ink-soft">
            Not yet assessed for this method version: {detail.formalPower.unassessedCurrentRoles.join(" · ")}.
          </p>
        ) : null}
        {detail.formalPower.gap ? <p className="mt-2 text-sm text-ink-soft">{detail.formalPower.gap}</p> : null}
        <a href="/uk/politics/system#formal-power" className="mt-4 inline-block text-sm font-semibold text-accent underline underline-offset-4">
          Open the scores, evidence and legal limits →
        </a>
      </RecordSection>

      <RecordSection title="Declared interests" count={detail.interests.length}>
        {detail.interests.length ? (
          <div className="space-y-3">
            {detail.interests.map((interest) => (
              <details key={`${interest.parentId}-${interest.id}`} className="rounded-2xl border border-line p-4">
                <summary className="cursor-pointer font-medium text-ink">{interest.category.name}</summary>
                <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{interest.text}</p>
                <p className="mt-3 text-xs text-ink-soft">
                  {interest.updatedAt ? `Updated ${displayDate(interest.updatedAt)} · ` : ""}
                  <a href={interest.sourceUrl} className="text-accent underline">official register</a>
                </p>
              </details>
            ))}
          </div>
        ) : <EmptyLine text="No current interest entries were returned by the official API." />}
        <p className="mt-4 text-base text-ink-soft">Donor, payer, destination, location and address lines are not shown here. Interest categories about family members, spouses or civil partners are left out. Open the official record for its full statutory context.</p>
      </RecordSection>

      <RecordSection title="Publicly listed staff" count={detail.staff.length}>
        {detail.staff.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {detail.staff.map((staff, index) => (
              <li key={`${staff.name}-${index}`} className="rounded-2xl bg-paper p-4">
                <p className="font-medium text-ink">{staff.name}</p>
                {staff.title ? <p className="mt-1 text-sm text-ink-soft">{staff.title}</p> : null}
                {staff.details ? <p className="mt-1 text-xs text-ink-soft">{staff.details}</p> : null}
              </li>
            ))}
          </ul>
        ) : <EmptyLine text="No staff names are listed in the official member record." />}
      </RecordSection>

      <RecordSection title="Recent work in Parliament" count={detail.activity.length}>
        {detail.activity.length ? (
          <ol className="space-y-3">
            {detail.activity.map((activity, index) => <ActivityRow key={`${activity.title}-${activity.date}-${index}`} activity={activity} />)}
          </ol>
        ) : <EmptyLine text="No recent contribution summary was returned." />}
      </RecordSection>

      {detail.election ? (
        <RecordSection title="Latest election" count={null}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Result" value={detail.election.result ?? "Not stated"} />
            <Stat label="Majority" value={detail.election.majority?.toLocaleString("en-GB") ?? "Not stated"} />
            <Stat label="Turnout" value={electionTurnout(detail.election.turnout, detail.election.electorate)} />
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            {[detail.election.title, detail.election.date ? displayDate(detail.election.date) : null].filter(Boolean).join(" · ")}
          </p>
        </RecordSection>
      ) : null}

      <footer className="border-t border-line bg-paper p-5 text-sm text-ink-soft sm:px-8">
        Retrieved {displayDate(detail.source.retrievedAt)} from{" "}
        <a href={detail.source.url} className="text-accent underline">{detail.source.name}</a>. An official record shows what was published; it does not by itself prove motive, influence or wrongdoing.
      </footer>
    </article>
  );
}

function RecordSection({ title, count, children }: { title: string; count: number | null; children: React.ReactNode }) {
  return (
    <section className="border-b border-line p-6 last:border-b-0 sm:p-8">
      <h3 className="mb-4 text-xl font-semibold text-ink">
        {title}{count !== null ? <span className="ml-2 font-mono text-sm font-normal text-ink-soft">{count}</span> : null}
      </h3>
      {children}
    </section>
  );
}

function ContactCard({ contact }: { contact: PublicContact }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{contact.type}</p>
      {contact.address.length ? <p className="mt-2 text-sm text-ink-soft">{contact.address.join(", ")}</p> : null}
      <div className="mt-3 grid gap-1 text-sm">
        {contact.email ? <a href={`mailto:${contact.email}`} className="break-all text-accent underline">{contact.email}</a> : null}
        {contact.phone ? <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="text-accent underline">{contact.phone}</a> : null}
        {contact.website ? <a href={contact.website} className="break-all text-accent underline">Website ↗</a> : null}
      </div>
      {contact.notes ? <p className="mt-3 text-xs text-ink-soft">{contact.notes}</p> : null}
    </div>
  );
}

function ActivityRow({ activity }: { activity: ActivityItem }) {
  const counts = [
    activity.speechCount ? `${activity.speechCount} speech${activity.speechCount === 1 ? "" : "es"}` : null,
    activity.questionCount ? `${activity.questionCount} question${activity.questionCount === 1 ? "" : "s"}` : null,
    activity.supplementaryQuestionCount ? `${activity.supplementaryQuestionCount} supplementary question${activity.supplementaryQuestionCount === 1 ? "" : "s"}` : null,
    activity.interventionCount ? `${activity.interventionCount} intervention${activity.interventionCount === 1 ? "" : "s"}` : null,
    activity.answerCount ? `${activity.answerCount} answer${activity.answerCount === 1 ? "" : "s"}` : null,
    activity.pointsOfOrderCount ? `${activity.pointsOfOrderCount} point${activity.pointsOfOrderCount === 1 ? "" : "s"} of order` : null,
    activity.statementsCount ? `${activity.statementsCount} statement${activity.statementsCount === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return (
    <li className="rounded-2xl border border-line p-4">
      {activity.url ? <a href={activity.url} className="font-medium text-ink underline decoration-line underline-offset-4">{activity.title}</a> : <p className="font-medium text-ink">{activity.title}</p>}
      <p className="mt-1 text-xs text-ink-soft">
        {[displayDate(activity.date), activity.section ?? activity.house, counts.join(" · ")].filter(Boolean).join(" · ")}
      </p>
    </li>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-2xl bg-paper p-4 text-sm text-ink-soft">{text}</p>;
}

function officeAssessmentLabel(assessmentId: string): string {
  if (assessmentId === "uk:office:member-of-parliament") return "Member of Parliament assessment";
  if (assessmentId === "uk:office:prime-minister") return "Prime Minister assessment";
  return assessmentId;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function electionTurnout(turnout: number | null, electorate: number | null): string {
  if (turnout === null) return "Not stated";
  const count = turnout.toLocaleString("en-GB");
  if (!electorate) return `${count} ballots cast`;
  return `${((turnout / electorate) * 100).toFixed(1)}% (${count})`;
}
