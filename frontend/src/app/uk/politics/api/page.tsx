import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import { PoliticsNav } from "@/components/politics/politics-nav";

export const metadata: Metadata = {
  title: "UK politics public data API — TaxSorted",
  description:
    "A read-only, source-linked API for non-personal UK political systems and separately gated current-person and declared-record lookups.",
};

const base = "https://api.taxsorted.io/v1/politics/uk";
const catalogue = `${base}/datasets`;

const curlExample = `curl -fsS \\
  '${catalogue}' \\
  -o taxsorted-politics-catalogue.json`;

const javascriptExample = `const response = await fetch(
  "${catalogue}"
);

if (!response.ok) throw new Error(\`TaxSorted returned \${response.status}\`);

const { publication, datasets } = await response.json();
console.log(publication.status);
console.log(datasets.map(({ id, availability }) => ({ id, availability })));`;

const mirrorExample = `curl -fsS \\
  --etag-save taxsorted.etag \\
  --etag-compare taxsorted.etag \\
  '${catalogue}' \\
  -o taxsorted-politics-catalogue.json`;

// Endpoint reference, grouped so a reader can scan six plain headings
// instead of one 47-row wall. Facts (gates, exclusions, caveats) stay.
const endpointGroups: Array<{
  heading: string;
  intro: string;
  endpoints: Array<{ method: string; path: string; does: string }>;
}> = [
  {
    heading: "Start here",
    intro: "Find out what exists and what is open right now.",
    endpoints: [
      { method: "GET", path: "", does: "The front door: access terms and links to everything else." },
      { method: "GET", path: "/manifest", does: "A stable alias of the catalogue, for scripts and mirrors." },
      { method: "GET", path: "/datasets", does: "Every dataset: coverage, counts, fields, licences, sources, downloads." },
      { method: "GET", path: "/datasets/schema", does: "The machine-readable shape of the catalogue." },
      { method: "GET", path: "/datasets/rights", does: "Where TaxSorted's licence ends and each source's rights begin." },
      { method: "GET", path: "/datasets/admissions", does: "After API deployment: each dataset's purpose, limits, risks and pending human decision." },
      { method: "GET", path: "/datasets/enforcement-governance", does: "After human approval: one whole dataset as self-describing JSON." },
      { method: "GET", path: "/datasets/enforcement-governance/schema", does: "The record-level shape of one dataset; swap in another dataset ID." },
      { method: "GET", path: "/datasets/enforcement-governance/download?format=csv", does: "After human approval: the complete JSON, CSV or NDJSON file." },
    ],
  },
  {
    heading: "The political system",
    intro: "Non-personal maps of how UK politics works.",
    endpoints: [
      { method: "GET", path: "/system", does: "After human approval: the full non-personal map — elections, offices, money, enforcement, history." },
      { method: "GET", path: "/elections/process", does: "Each election step, who is responsible, and the public records." },
      { method: "GET", path: "/power/method", does: "How office power is scored: six dimensions, office not person." },
      { method: "GET", path: "/power/offices", does: "Draft office scores with evidence. No sorting, no leaderboard." },
      { method: "GET", path: "/power/offices/uk:office:prime-minister", does: "One office's assessment and every official source behind it." },
      { method: "GET", path: "/budgets/accountability", does: "Who answers for public money, plus a status-labelled spending snapshot." },
      { method: "GET", path: "/law/watch", does: "Proposed laws, kept clearly separate from law in force." },
      { method: "GET", path: "/history/method", does: "How changed rules and history are recorded, with dates and limits." },
    ],
  },
  {
    heading: "Money records",
    intro: "Rules and records about political money — each says what it does not prove.",
    endpoints: [
      { method: "GET", path: "/funding/rules", does: "Campaign-money rules by date. Not the donation register." },
      { method: "GET", path: "/funding/public", does: "Public support schemes for parties, kept separate from private donations." },
      { method: "GET", path: "/funding/donations?from=2026-01-01&to=2026-03-31&take=20", does: "Verified-company donations. Closed until written reuse terms and the separate privacy review are confirmed." },
      { method: "GET", path: "/relationships/schema", does: "The joining rules: exact identifiers, correction states, no assumed cause." },
      { method: "GET", path: "/relationships/datasets", does: "Honest live, review-gated or licence-gated status of each source." },
      { method: "GET", path: "/relationships/contracts?from=2026-06-01&to=2026-06-30&take=10", does: "Contract awards with identifiers, values and dates. Contact details removed." },
      { method: "GET", path: "/relationships/ministerial-benefits?month=2026-05&department=Home%20Office&type=all", does: "Gated monthly ministerial gifts; counterparties stay exactly as published, never name-joined." },
      { method: "GET", path: "/relationships/method", does: "What each money record proves — and what it does not." },
    ],
  },
  {
    heading: "Police & enforcement",
    intro: "Institutions, powers and pay — never personal dossiers or operations.",
    endpoints: [
      { method: "GET", path: "/enforcement/institutions", does: "The UK-wide map of police, prosecution and oversight bodies." },
      { method: "GET", path: "/enforcement/governance", does: "Who answers to whom: strategy, appointments, inspection, complaints, prosecution." },
      { method: "GET", path: "/enforcement/ranks", does: "Rank families by jurisdiction. Not a named roster." },
      { method: "GET", path: "/enforcement/pay-benefits", does: "Official pay, allowance and pension sources, kept separate and dated." },
      { method: "GET", path: "/enforcement/workforce", does: "Workforce totals only, keeping official suppression. No individual characteristics." },
      { method: "GET", path: "/enforcement/funding", does: "Official police-funding sources; each money measure stays distinct." },
      { method: "GET", path: "/enforcement/vacancies", does: "Official recruitment routes only. We collect no applicant data." },
      { method: "GET", path: "/enforcement/activities", does: "Public work: meetings, minutes, reports, speeches. Never tactics or deployments." },
      { method: "GET", path: "/enforcement/private-security", does: "The private-security regulator (SIA) boundary. Never a bulk worker directory." },
      { method: "GET", path: "/enforcement/forces", does: "Live force names from data.police.uk, with stated gaps." },
      { method: "GET", path: "/enforcement/power/method", does: "How enforcement-office power is scored: seven dimensions." },
      { method: "GET", path: "/enforcement/power/offices", does: "Draft enforcement-office power cards. No person score, no leaderboard." },
      { method: "GET", path: "/enforcement/communication-method", does: "A word-counting method for official texts. Psychological labels are banned." },
      { method: "GET", path: "/enforcement/method", does: "Allegation, investigation, finding, sanction and appeal stay separate." },
    ],
  },
  {
    heading: "People & parties",
    intro: "Current members of Parliament, from official records only.",
    endpoints: [
      { method: "GET", path: "/people?house=commons&q=Abbott&take=20", does: "Search current MPs and peers by name, house and party." },
      { method: "GET", path: "/people/5131", does: "One member's sourced record. Gated fields are not fetched while closed." },
      { method: "GET", path: "/parties?house=commons", does: "Active Parliamentary parties." },
      { method: "GET", path: "/roles?kind=government", does: "Current government and opposition posts and their holders." },
    ],
  },
  {
    heading: "Trust & corrections",
    intro: "How to check us, and how corrections work.",
    endpoints: [
      { method: "GET", path: "/integrity", does: "The scope, the evidence rule and each publication gate's state." },
      { method: "GET", path: "/integrity/sources", does: "Official sources with reuse terms and personal-data status." },
      { method: "GET", path: "/integrity/corrections", does: "How corrections work. Public intake is honestly not live yet." },
      { method: "GET", path: "/sources", does: "Coverage, sources, licences and known gaps." },
    ],
  },
];

export default function PoliticsApiPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/uk/money", label: "Follow the money" },
          { href: "/uk/politics", label: "UK politics" },
        ]}
        current="For developers"
        className="mb-4"
      />
      <PoliticsNav />

      <header className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">No key · no account · no charge</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Read and reuse this data by computer — free.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">
          Datasets marked open can be read, downloaded, mirrored and built upon without an account,
          under the listed licences. The API is read-only and works from any website. Every response
          carries its sources, licences, dates and coverage limits.
        </p>
        <p className="mt-5 overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-sm text-white">
          {base}
        </p>
        <div className="mt-5 flex flex-wrap gap-4 text-base font-semibold">
          <a href="/uk/politics/system" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
            See the human-readable map <span aria-hidden="true">→</span>
          </a>
          <a href="/uk/politics/integrity" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
            See police & public money <span aria-hidden="true">→</span>
          </a>
          <a href={catalogue} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
            Browse the dataset catalogue <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <ShortVersion className="mt-6">
        <li>Everything marked open is free to read — no key, no account.</li>
        <li>Most record downloads are still closed, waiting for a human privacy review.</li>
        <li>Start at the catalogue: it says what is open right now.</li>
      </ShortVersion>

      <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-950">
        <strong>Honest status:</strong>{" "} most record downloads are switched off. Automated checks have
        run, but no human has approved a release yet. Records stay closed until the project&apos;s
        maintainer approves the privacy boundary, reviews the published list of what each dataset
        holds, and a confidential safety-contact route is live. This page describes the API as built;
        the public address may not answer until it is deployed. Once deployed, the catalogue, rights
        statement and dataset schemas stay readable even while records are closed.
      </p>

      <section className="mt-8 grid gap-5 lg:grid-cols-2" aria-labelledby="thirty-seconds">
        <article className="rounded-3xl border border-line bg-ink p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/85">After this API release is deployed</p>
          <h2 id="thirty-seconds" className="mt-2 text-2xl font-semibold">Check what is open, in 30 seconds</h2>
          <pre
            aria-label="30-second curl example"
            className="mt-5 overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-white sm:text-sm"
          ><code>{curlExample}</code></pre>
          <p className="mt-4 text-base text-white/85">
            The catalogue distinguishes <code className="text-white">development-preview</code>,
            <code className="text-white"> publication-review</code>, <code className="text-white">approved-disabled</code>,
            <code className="text-white"> open</code> and <code className="text-white">emergency-stopped</code>.
            Only <code className="text-white">open</code> is an approved hosted release. There is no token or request header to add.
          </p>
        </article>

        <article className="rounded-3xl border border-line bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Plain browser JavaScript</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Look before you download</h2>
          <pre
            aria-label="JavaScript fetch example"
            className="mt-5 overflow-x-auto rounded-2xl bg-paper p-4 text-xs leading-6 text-ink sm:text-sm"
          ><code>{javascriptExample}</code></pre>
          <p className="mt-4 text-base text-ink-soft">
            This example does not assume approval. Fetch a record body only
            when its catalogue entry says <code>availability: open</code>.
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-line bg-white p-6 sm:p-8" aria-labelledby="distribution">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Made to travel</p>
        <h2 id="distribution" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          One catalogue, three useful formats.
        </h2>
        <p className="mt-3 text-base text-ink-soft">
          Once deployed, the catalogue stays readable through review. A dataset&apos;s JSON, CSV and
          NDJSON files become downloadable only after the catalogue marks it <code>open</code>.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            ["JSON", "A self-describing envelope with dataset metadata, records and links. Best for applications and archiving."],
            ["CSV", "One record per row. Arrays and objects stay as exact JSON inside one cell, so no values are guessed or flattened away."],
            ["NDJSON", "One complete JSON record per line. Best for streaming, command-line tools and larger mirrors."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl bg-paper p-5">
              <h3 className="font-mono text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-base text-ink-soft">{body}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-base font-semibold">
          <a href={catalogue} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">Open the catalogue <span aria-hidden="true">↗</span></a>
          <a href={`${base}/datasets/enforcement-governance/download?format=json`} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">After release: example JSON download <span aria-hidden="true">↗</span></a>
          <a href={`${base}/datasets/enforcement-governance/download?format=csv`} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">After release: example CSV download <span aria-hidden="true">↗</span></a>
          <a href={`${base}/datasets/enforcement-governance/download?format=ndjson`} className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">After release: example NDJSON download <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" aria-labelledby="mirror">
        <article className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Polite mirroring</p>
          <h2 id="mirror" className="mt-2 text-2xl font-semibold text-ink">Ask whether it changed first.</h2>
          <p className="mt-3 text-base text-ink-soft">
            The catalogue, and each dataset file once open, has an <code>ETag</code> (a short version
            fingerprint). Send it back as <code> If-None-Match</code>; an unchanged file returns{" "}
            <code>304</code> with no body. ETags differ by format, so keep one beside each JSON, CSV
            or NDJSON mirror.
          </p>
          <pre
            aria-label="ETag mirror example"
            className="mt-5 overflow-x-auto rounded-2xl bg-paper p-4 text-xs leading-6 text-ink sm:text-sm"
          ><code>{mirrorExample}</code></pre>
          <p className="mt-4 text-base text-ink-soft">
            <code>X-Dataset-Version</code>, <code>X-Schema-Version</code>, <code>X-Record-Count</code> and
            <code> X-Checksum-SHA256</code> make unattended checks straightforward.
          </p>
        </article>

        <article className="rounded-3xl border border-line bg-accent-soft p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Keep the meaning</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">IDs and sources are the join.</h2>
          <ul className="mt-4 space-y-3 text-base text-ink-soft">
            <li><strong className="text-ink">Stable IDs:</strong>{" "} dataset and record IDs are permanent identifiers and must not be recycled. A public ledger of removed IDs is still needed to audit that promise across releases.</li>
            <li><strong className="text-ink">Schema versions:</strong>{" "} new optional fields may stay within major version 1; removed fields and required, nullable, type, meaning, primary-key or money-unit changes require a new major.</li>
            <li><strong className="text-ink">Source IDs:</strong>{" "} keep <code>sourceIds</code> where present. Source-ledger records carry their own <code>sourceId</code> and official URL.</li>
            <li><strong className="text-ink">Licences:</strong>{" "} TaxSorted curation and upstream data can have different terms. Read the mixed-rights statement, then the <code>official-sources</code> dataset before redistribution.</li>
          </ul>
          <a
            href={`${base}/datasets/official-sources`}
            className="mt-5 inline-flex min-h-11 items-center text-base font-semibold text-accent underline underline-offset-4"
          >After release: read the source and reuse ledger <span aria-hidden="true">↗</span></a>
          <a
            href={`${base}/datasets/rights`}
            className="ml-5 mt-5 inline-flex min-h-11 items-center text-base font-semibold text-accent underline underline-offset-4"
          >Read the mixed-rights statement <span aria-hidden="true">↗</span></a>
          <a
            href={`${base}/datasets/admissions`}
            className="ml-5 mt-5 inline-flex min-h-11 items-center text-base font-semibold text-accent underline underline-offset-4"
          >After deployment: read the admission ledger <span aria-hidden="true">↗</span></a>
        </article>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-line bg-white" aria-labelledby="doors">
        <div className="border-b border-line px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Reference</p>
          <h2 id="doors" className="mt-1 text-2xl font-semibold text-ink">Main API doors</h2>
        </div>
        {endpointGroups.map((group) => (
          <div key={group.heading}>
            <div className="border-b border-line bg-paper px-6 py-4">
              <h3 className="text-lg font-semibold text-ink">{group.heading}</h3>
              <p className="mt-1 text-base text-ink-soft">{group.intro}</p>
            </div>
            <div className="divide-y divide-line border-b border-line">
              {group.endpoints.map((endpoint) => (
                <article key={endpoint.path} className="grid gap-2 px-6 py-5 md:grid-cols-[4rem_minmax(0,1fr)_minmax(12rem,1fr)] md:gap-4">
                  <p className="font-mono text-xs font-semibold text-accent">{endpoint.method}</p>
                  <a
                    href={`${base}${endpoint.path}`}
                    className="break-all font-mono text-sm text-ink underline decoration-line underline-offset-4 hover:text-accent"
                  >
                    {endpoint.path}
                  </a>
                  <p className="text-base text-ink-soft">{endpoint.does}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3" aria-label="API promises">
        {[
          ["Source-first", "Each dataset names its supporting source IDs; the source ledger resolves them to official URLs."],
          ["Bounded", "Small pages, date limits, upstream timeouts and useful cache headers."],
          ["Deliberately less", "Private contacts and donor address fields are removed, not redistributed."],
        ].map(([title, body]) => (
          <article key={title} className="rounded-3xl border border-line bg-paper p-5">
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-base text-ink-soft">{body}</p>
          </article>
        ))}
      </section>

      <p className="mt-8 rounded-2xl border border-line bg-accent-soft p-4 text-base text-ink">
        <strong>Party donations are not here yet:</strong>{" "} the Electoral Commission&apos;s own search and
        downloads remain the official route today. Our donations door answers with a clear
        &ldquo;unavailable&rdquo; until Political Finance Online&apos;s database-reuse and attribution
        terms are confirmed in writing.
      </p>

      <p className="mt-8 text-base text-ink-soft">
        Parliamentary information is attributed under the Open Parliament Licence v3.0; applicable
        GOV.UK material uses the Open Government Licence v3.0. No licence is assumed for a Political
        Finance Online mirror. Read <a href="/uk/politics/method" className="text-accent underline">our publishing rules</a> before republishing joined data.
      </p>
    </div>
  );
}
