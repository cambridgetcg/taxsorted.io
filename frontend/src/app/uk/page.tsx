import type { Metadata } from "next";
import Link from "next/link";
import { ukProfessionalOpportunityPublicationAvailable } from "@/lib/uk-professional-opportunities";

export const metadata: Metadata = {
  title: "The UK tax system — money, rules and public data | TaxSorted",
  description:
    "Follow UK tax from personal rules into public money, institutions, accountability and reusable source-linked APIs.",
};

const PERSONAL_PATHS = [
  {
    href: "/uk/tax-expert",
    title: "UK tax expert",
    body: "Evidence-backed checks, explicit unknowns and an honest capability map.",
  },
  {
    href: "/uk/personal-tax",
    title: "Personal tax playbook",
    body: "Thresholds, lawful planning moves, counter-moves and official receipts.",
  },
  {
    href: "/itsa",
    title: "MTD Income Tax",
    body: "Eligibility, records, quarter figures, deadlines and the filing boundary.",
  },
] as const;

const PUBLIC_PATHS = [
  {
    href: "/uk/public-funding",
    title: "Public money",
    body: "How pooled tax becomes allocations, health and education delivery, accounts and audit.",
  },
  {
    href: "/uk/politics",
    title: "Politics and power",
    body: "Who makes the rules, how decisions travel and what the evidence can support.",
  },
  {
    href: "/uk/accountability",
    title: "Accountability",
    body: "Who watches public bodies, who can challenge them and where coverage still stops.",
  },
  {
    href: "/uk/cases",
    title: "Public-power case commons",
    body: "Decided cases, exact remedies, honest money meanings and local professional review packets.",
  },
  {
    href: "/uk/opportunities",
    title: "Professional opportunity atlas",
    body: "Under-covered tax work, real professional gates, finite local pipelines and regulator scrutiny.",
  },
  {
    href: "/uk/tax-industry",
    title: "The tax industry",
    body: "Roles, qualifications, pay evidence, market gates and lawful routes into the work.",
  },
  {
    href: "/uk/charities",
    title: "Charities",
    body: "Registers, legal forms, conditional tax treatment, funding, duties and safe help routes.",
  },
] as const;

const API_PATHS = [
  {
    href: "https://api.taxsorted.io/v1/uk/tax-expert",
    title: "Tax expert capabilities",
    body: "Public capability JSON and links to the bounded assessment contracts.",
  },
  {
    href: "/uk/politics/api",
    title: "Politics API guide",
    body: "Dataset contracts, publication gates, source fields and safe reuse boundaries.",
  },
  {
    href: "https://api.taxsorted.io/v1/public-funding/uk",
    title: "Public-funding API",
    body: "Stable records, manifests, changes and machine-readable funding paths.",
  },
  {
    href: "https://api.taxsorted.io/openapi.json",
    title: "OpenAPI 3.1",
    body: "The full deployed service contract for people, apps and agents.",
  },
] as const;

function Door({ href, title, body }: { href: string; title: string; body: string }) {
  const external = href.startsWith("https://");
  const className =
    "block min-h-11 rounded-2xl border border-line bg-white p-5 transition hover:border-accent";
  const content = (
    <>
      <h3 className="text-lg font-semibold text-ink">
        {title} {external ? <span aria-hidden="true">↗</span> : null}
      </h3>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
    </>
  );

  return external ? (
    <a href={href} className={className} target="_blank" rel="noreferrer noopener">
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export default function UkSystemPage() {
  const publicPaths = ukProfessionalOpportunityPublicationAvailable
    ? PUBLIC_PATHS
    : PUBLIC_PATHS.filter((path) => path.href !== "/uk/opportunities");
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm font-medium text-accent hover:text-accent-deep">
        ← TaxSorted
      </Link>

      <header className="mt-6 max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          United Kingdom · system map
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Follow the rules, the money and the power around tax.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">
          Your tax position sits inside a public system. These maps connect the rules people face
          with the institutions that make, administer, fund, enforce and challenge them.
        </p>
      </header>

      <section className="mt-12" aria-labelledby="your-tax-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Start with your tax</p>
        <h2 id="your-tax-title" className="mt-2 text-2xl font-bold tracking-tight text-ink">
          Checks and practical journeys
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {PERSONAL_PATHS.map((path) => <Door key={path.href} {...path} />)}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="public-system-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Then zoom out</p>
        <h2 id="public-system-title" className="mt-2 text-2xl font-bold tracking-tight text-ink">
          Public system and civic data
        </h2>
        <p className="mt-2 max-w-3xl text-ink-soft">
          Source-linked and non-partisan. Official work contacts and public roles are kept separate
          from private life; publication status and evidence gaps stay visible.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {publicPaths.map((path) => <Door key={path.href} {...path} />)}
        </div>
      </section>

      <section className="mt-14 rounded-3xl border border-line bg-paper p-6 sm:p-8" aria-labelledby="api-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Build on the commons</p>
        <h2 id="api-title" className="mt-2 text-2xl font-bold tracking-tight text-ink">
          The same understanding, shaped for software
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          Read-only public doors need no account. Each door shows the coverage and version data it
          currently carries; public datasets also state their rights and publication status. An
          endpoint existing does not mean every candidate record has passed its publication gate.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {API_PATHS.map((path) => <Door key={path.href} {...path} />)}
        </div>
      </section>

      <p className="mt-8 text-sm text-ink-soft">
        See the <Link href="/uk/politics/method" className="font-medium text-accent underline underline-offset-4">publishing method</Link>{" "}
        for the separate evidence, rights and personal-data gate used by the politics work.
      </p>
    </div>
  );
}
