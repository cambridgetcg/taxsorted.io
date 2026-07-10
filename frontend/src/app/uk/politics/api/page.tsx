import type { Metadata } from "next";
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

const endpoints = [
  {
    method: "GET",
    path: "",
    does: "The shortest starting response: access terms and links to the catalogue, manifest, sources and OpenAPI document.",
  },
  {
    method: "GET",
    path: "/manifest",
    does: "A stable alias of the current open-dataset catalogue for discovery and automated mirroring.",
  },
  {
    method: "GET",
    path: "/datasets",
    does: "Every distributable dataset, with coverage, record count, versions, fields, licences, source IDs and download URLs.",
  },
  {
    method: "GET",
    path: "/datasets/schema",
    does: "JSON Schema for the shared TaxSorted catalogue and open-dataset envelope.",
  },
  {
    method: "GET",
    path: "/datasets/rights",
    does: "The machine-readable boundary between TaxSorted's curation licence and source-specific rights.",
  },
  {
    method: "GET",
    path: "/datasets/admissions",
    does: "After API deployment: every dataset's purpose, coverage limit, field contract, rights decision, risks, mitigations and pending human decision.",
  },
  {
    method: "GET",
    path: "/datasets/enforcement-governance",
    does: "After human release approval: one dataset as a self-describing JSON envelope containing metadata, records and links.",
  },
  {
    method: "GET",
    path: "/datasets/enforcement-governance/schema",
    does: "The record-level JSON Schema for one dataset. Replace the stable dataset ID to inspect another.",
  },
  {
    method: "GET",
    path: "/datasets/enforcement-governance/download?format=csv",
    does: "After human release approval: a complete json, csv or ndjson distribution.",
  },
  {
    method: "GET",
    path: "/system",
    does: "After human release approval: the mapped non-personal foundation for elections, office power, political funding, public money, relationships, enforcement, history and law watch.",
  },
  {
    method: "GET",
    path: "/integrity",
    does: "The public-integrity scope, evidence rule, dataset doors, excluded material and named-person publication-gate state.",
  },
  {
    method: "GET",
    path: "/integrity/sources",
    does: "Official finance, corporate, land and law-enforcement sources with jurisdiction, reuse and personal-data status.",
  },
  {
    method: "GET",
    path: "/integrity/corrections",
    does: "The correction, restriction, privacy-objection, urgent-safety and public-tombstone method; public intake is honestly marked not live yet.",
  },
  {
    method: "GET",
    path: "/relationships/schema",
    does: "The typed evidence-event contract: exact-identifier joins, correction states and no automatic causal inference.",
  },
  {
    method: "GET",
    path: "/relationships/datasets",
    does: "Honest live, mapped, review-gated and licence-gated status for finance and corporate-record sources.",
  },
  {
    method: "GET",
    path: "/relationships/contracts?from=2026-06-01&to=2026-06-30&take=10",
    does: "Contracts Finder award releases with organisation identifiers, values and dates; direct contacts, addresses and unsafe supplier names are removed.",
  },
  {
    method: "GET",
    path: "/relationships/ministerial-benefits?month=2026-05&department=Home%20Office&type=all",
    does: "Review-gated monthly ministerial gifts and hospitality. Counterparties remain exactly as published and are never name-joined.",
  },
  {
    method: "GET",
    path: "/enforcement/institutions",
    does: "A first UK-wide institutional map of territorial policing, national enforcement, prosecution and principal oversight.",
  },
  {
    method: "GET",
    path: "/enforcement/governance",
    does: "Typed strategy, appointment, accountability, operational-command, inspection, complaint and prosecution relationships.",
  },
  {
    method: "GET",
    path: "/enforcement/ranks",
    does: "Generic rank families by jurisdiction—not a named roster or live incident command chain.",
  },
  {
    method: "GET",
    path: "/enforcement/pay-benefits",
    does: "Current England and Wales rank ranges plus official pay, allowance, pension and benefits sources, kept separate and effective-dated.",
  },
  {
    method: "GET",
    path: "/enforcement/workforce",
    does: "Aggregate workforce and demographic sources with official suppression and no individual characteristics.",
  },
  {
    method: "GET",
    path: "/enforcement/funding",
    does: "Official police-funding sources; grants, precepts, capital, reserves, budgets and spending remain distinct measures.",
  },
  {
    method: "GET",
    path: "/enforcement/vacancies",
    does: "Official recruitment routes only; TaxSorted never collects applicant data.",
  },
  {
    method: "GET",
    path: "/enforcement/activities",
    does: "Safe institutional activity coverage such as meetings, minutes, reports and speeches; never deployments, tactics or officer logs.",
  },
  {
    method: "GET",
    path: "/enforcement/private-security",
    does: "The SIA, private-security company and individual-licence-check boundary; never a bulk worker directory or a claim of police power.",
  },
  {
    method: "GET",
    path: "/enforcement/forces",
    does: "Live institutional force names from data.police.uk, with stated territorial and source gaps.",
  },
  {
    method: "GET",
    path: "/enforcement/power/method",
    does: "The seven-dimension formal-authority rubric for law-enforcement and accountability offices.",
  },
  {
    method: "GET",
    path: "/enforcement/power/offices",
    does: "Draft formal office-power cards with all dimensions and legal constraints visible; no person score or leaderboard.",
  },
  {
    method: "GET",
    path: "/enforcement/communication-method",
    does: "A method-only specification for deterministic surface features in official texts; personality and psychological labels are prohibited.",
  },
  {
    method: "GET",
    path: "/elections/process",
    does: "The UK Parliamentary election chain, responsible actors, public records and stated territorial gaps.",
  },
  {
    method: "GET",
    path: "/funding/rules",
    does: "Effective-dated candidate, party, non-party and regulated-funding rules. This is rules data, not the gated donation register.",
  },
  {
    method: "GET",
    path: "/funding/public",
    does: "Public democratic-support schemes kept separate from private donations and campaign spending.",
  },
  {
    method: "GET",
    path: "/power/method",
    does: "The six-dimension, office-not-person scoring method, rubric and comparison limits.",
  },
  {
    method: "GET",
    path: "/power/offices",
    does: "Provisional office assessments with evidence, checks and neutral 0–5 dimension scores. No global sort or leaderboard.",
  },
  {
    method: "GET",
    path: "/power/offices/uk:office:prime-minister",
    does: "One namespaced office assessment and every official source used by its visible dimensions.",
  },
  {
    method: "GET",
    path: "/budgets/accountability",
    does: "Public-money responsibility lanes and a status-labelled Main Estimates aggregate snapshot.",
  },
  {
    method: "GET",
    path: "/relationships/method",
    does: "Safe evidence lanes for interests, donations, meetings, lobbying and procurement, including what each record does not prove.",
  },
  {
    method: "GET",
    path: "/enforcement/method",
    does: "Rules for keeping allegations, investigations, findings, sanctions, corrections and appeals distinct.",
  },
  {
    method: "GET",
    path: "/history/method",
    does: "The effective-dated history model, current coverage, privacy boundary and licensed source map.",
  },
  {
    method: "GET",
    path: "/law/watch",
    does: "Proposed political-system legislation, kept explicitly separate from rules currently in force.",
  },
  {
    method: "GET",
    path: "/people?house=commons&q=Abbott&take=20",
    does: "Search every current MP or peer by name, house and party.",
  },
  {
    method: "GET",
    path: "/people/5131",
    does: "One sourced record: offices, roles, activity and election result, with staff and registered interests independently gated and not fetched while closed.",
  },
  { method: "GET", path: "/parties?house=commons", does: "Active Parliamentary parties." },
  {
    method: "GET",
    path: "/roles?kind=government",
    does: "Current government or opposition posts and their holders.",
  },
  {
    method: "GET",
    path: "/funding/donations?from=2026-01-01&to=2026-03-31&take=20",
    does: "Verified-company party donations only, enabled after both written bulk-reuse confirmation and the separate political-finance privacy review.",
  },
  { method: "GET", path: "/sources", does: "Coverage, sources, licences and known gaps." },
];

export default function PoliticsApiPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <PoliticsNav />

      <header className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">No key · no account · no charge</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Public records, ready to pass on.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">
          Datasets marked open can be read, downloaded, mirrored and built upon without an
          account, under the listed licences. The API is read-only, allows requests from any website,
          and carries its sources, licences, dates and coverage limits with the data. Named people and political-finance records
          keep their separate publication reviews; the public system map does not depend on them.
        </p>
        <p className="mt-5 overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-sm text-white">
          {base}
        </p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
          <a href="/uk/politics/system" className="text-accent underline underline-offset-4">
            See the human-readable system map →
          </a>
          <a href="/uk/politics/integrity" className="text-accent underline underline-offset-4">
            Inspect money and enforcement →
          </a>
          <a href={catalogue} className="text-accent underline underline-offset-4">
            Browse the dataset catalogue ↗
          </a>
        </div>
      </header>

      <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Release truth:</strong> the current corpus has agent and technical screening, not
        human approval. Production record bodies fail closed until Yu adopts the boundary,
        reviews the published admission ledger, and a confidential safety-reporting route is live.
        This page describes the workspace implementation; the public API host may be behind it
        until an authorised deploy. Once deployed, the catalogue, rights statement and bulk
        dataset schemas remain readable while bodies are closed.
      </p>

      <section className="mt-8 grid gap-5 lg:grid-cols-2" aria-labelledby="thirty-seconds">
        <article className="rounded-3xl border border-line bg-ink p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">After this API release is deployed</p>
          <h2 id="thirty-seconds" className="mt-2 text-2xl font-semibold">Check release state in 30 seconds</h2>
          <pre
            aria-label="30-second curl example"
            className="mt-5 overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-white sm:text-sm"
          ><code>{curlExample}</code></pre>
          <p className="mt-4 text-sm text-white/70">
            The catalogue distinguishes <code className="text-white">development-preview</code>,
            <code className="text-white"> publication-review</code>, <code className="text-white">approved-disabled</code>,
            <code className="text-white"> open</code> and <code className="text-white">emergency-stopped</code>.
            Only <code className="text-white">open</code> is an approved hosted release. There is no token or request header to add.
          </p>
        </article>

        <article className="rounded-3xl border border-line bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Plain browser JavaScript</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Inspect before downloading</h2>
          <pre
            aria-label="JavaScript fetch example"
            className="mt-5 overflow-x-auto rounded-2xl bg-paper p-4 text-xs leading-6 text-ink sm:text-sm"
          ><code>{javascriptExample}</code></pre>
          <p className="mt-4 text-sm text-ink-soft">
            This catalogue example does not assume publication approval. Fetch a record body only
            when its catalogue entry says <code>availability: open</code>.
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-line bg-white p-6 sm:p-8" aria-labelledby="distribution">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Made to travel</p>
        <h2 id="distribution" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          One catalogue, three useful formats.
        </h2>
        <p className="mt-3 text-sm text-ink-soft">
          Once this API release is deployed, the catalogue remains readable through publication
          review. Dataset JSON, CSV and NDJSON bodies become downloadable only after the catalogue
          marks that dataset <code>open</code>.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            ["JSON", "A self-describing envelope with dataset metadata, records and links. Best for applications and archiving."],
            ["CSV", "One record per row. Arrays and objects are canonical JSON inside one cell, so no values are guessed or flattened away."],
            ["NDJSON", "One complete JSON record per line. Best for streaming, command-line tools and larger mirrors."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl bg-paper p-5">
              <h3 className="font-mono text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{body}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
          <a href={catalogue} className="text-accent underline underline-offset-4">Open the catalogue ↗</a>
          <a href={`${base}/datasets/enforcement-governance/download?format=json`} className="text-accent underline underline-offset-4">After release: example JSON download ↗</a>
          <a href={`${base}/datasets/enforcement-governance/download?format=csv`} className="text-accent underline underline-offset-4">After release: example CSV download ↗</a>
          <a href={`${base}/datasets/enforcement-governance/download?format=ndjson`} className="text-accent underline underline-offset-4">After release: example NDJSON download ↗</a>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" aria-labelledby="mirror">
        <article className="rounded-3xl border border-line bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Polite mirroring</p>
          <h2 id="mirror" className="mt-2 text-2xl font-semibold text-ink">Ask whether it changed first.</h2>
          <p className="mt-3 text-sm text-ink-soft">
            The catalogue, and each static dataset representation once open, has an <code>ETag</code>. Send it back as
            <code> If-None-Match</code>; an unchanged file returns <code>304</code> with no body. ETags
            differ by format, so keep one beside each JSON, CSV or NDJSON mirror.
          </p>
          <pre
            aria-label="ETag mirror example"
            className="mt-5 overflow-x-auto rounded-2xl bg-paper p-4 text-xs leading-6 text-ink sm:text-sm"
          ><code>{mirrorExample}</code></pre>
          <p className="mt-4 text-sm text-ink-soft">
            <code>X-Dataset-Version</code>, <code>X-Schema-Version</code>, <code>X-Record-Count</code> and
            <code> X-Checksum-SHA256</code> make unattended checks straightforward.
          </p>
        </article>

        <article className="rounded-3xl border border-line bg-accent-soft p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Keep the meaning</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">IDs and sources are the join.</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-soft">
            <li><strong className="text-ink">Stable IDs:</strong> dataset and record IDs are permanent identifiers and must not be recycled. A public tombstone ledger is still needed to audit that promise across releases.</li>
            <li><strong className="text-ink">Schema versions:</strong> new optional fields may stay within major version 1; removed fields and required, nullable, type, meaning, primary-key or money-unit changes require a new major.</li>
            <li><strong className="text-ink">Source IDs:</strong> keep <code>sourceIds</code> where present. Source-ledger records carry their own <code>sourceId</code> and official URL.</li>
            <li><strong className="text-ink">Licences:</strong> TaxSorted curation and upstream data can have different terms. Read the mixed-rights statement, then the <code>official-sources</code> dataset before redistribution.</li>
          </ul>
          <a
            href={`${base}/datasets/official-sources`}
            className="mt-5 inline-block text-sm font-semibold text-accent underline underline-offset-4"
          >After release: read the source and reuse ledger ↗</a>
          <a
            href={`${base}/datasets/rights`}
            className="ml-5 mt-5 inline-block text-sm font-semibold text-accent underline underline-offset-4"
          >Read the mixed-rights statement ↗</a>
          <a
            href={`${base}/datasets/admissions`}
            className="ml-5 mt-5 inline-block text-sm font-semibold text-accent underline underline-offset-4"
          >After deployment: read the admission ledger ↗</a>
        </article>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-line bg-white" aria-labelledby="doors">
        <div className="border-b border-line px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Reference</p>
          <h2 id="doors" className="mt-1 text-2xl font-semibold text-ink">Main API doors</h2>
        </div>
        <div className="divide-y divide-line">
          {endpoints.map((endpoint) => (
            <article key={endpoint.path} className="grid gap-2 px-6 py-5 md:grid-cols-[4rem_minmax(0,1fr)_minmax(12rem,1fr)] md:gap-4">
              <p className="font-mono text-xs font-semibold text-accent">{endpoint.method}</p>
              <a
                href={`${base}${endpoint.path}`}
                className="break-all font-mono text-sm text-ink underline decoration-line underline-offset-4 hover:text-accent"
              >
                {endpoint.path}
              </a>
              <p className="text-sm text-ink-soft">{endpoint.does}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3" aria-label="API promises">
        {[
          ["Source-first", "Each dataset names its supporting source IDs; the source ledger resolves them to official URLs."],
          ["Bounded", "Small pages, date limits, upstream timeouts and useful cache headers."],
          ["Deliberately less", "Private contacts and donor address fields are removed, not redistributed."],
        ].map(([title, body]) => (
          <article key={title} className="rounded-3xl border border-line bg-paper p-5">
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{body}</p>
          </article>
        ))}
      </section>

      <p className="mt-8 rounded-2xl border border-line bg-accent-soft p-4 text-sm text-ink">
        <strong>Funding licence gate:</strong> the Electoral Commission search and downloads remain
        the official route today. The normalized donations door returns a clear unavailable response
        until Political Finance Online&apos;s database-reuse and attribution terms are confirmed.
      </p>

      <p className="mt-8 text-sm text-ink-soft">
        Parliamentary information is attributed under the Open Parliament Licence v3.0; applicable
        GOV.UK material uses the Open Government Licence v3.0. No licence is assumed for a Political
        Finance Online mirror. Check the <a href="/uk/politics/method" className="text-accent underline">publishing method</a> before republishing joined data.
      </p>
    </div>
  );
}
