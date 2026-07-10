import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "How UK charities work — TaxSorted",
  description:
    "An organisation-first guide to UK charity registers, conditional tax relief, obligations, finance, assets, control and safe routes to ask for help.",
};

const registers = [
  {
    jurisdiction: "England and Wales",
    body: "Charity Commission",
    href: "https://www.gov.uk/find-charity-information",
    description:
      "Search registered charities by name or number and inspect their stated work and filed information. Some charities are excepted, exempt or outside the ordinary registration threshold.",
  },
  {
    jurisdiction: "Scotland",
    body: "OSCR",
    href: "https://www.oscr.org.uk/about-charities/search-the-register/",
    description:
      "Search the Scottish Charity Register by exact number, purpose, status, form, geography or income. Read OSCR as the source of the Scottish record.",
  },
  {
    jurisdiction: "Northern Ireland",
    body: "CCNI",
    href: "https://www.charitycommissionni.org.uk/start-up-a-charity/register-of-charities/",
    description:
      "Use CCNI guidance and the register search for Northern Ireland identity, purposes, activities and annual reporting information.",
  },
] as const;

const financeMeasures = [
  ["Income", "Money recognised during a period; not the cash left at the end."],
  ["Expenditure", "Accounting spend; not a standalone measure of benefit or impact."],
  ["Assets", "Resources held or controlled at a date; many are restricted, invested or not readily spendable."],
  ["Reserves", "A policy and accounting measure; not simply a spare bank balance."],
  ["Pay", "Staff cost and published bands must not become an invented named salary."],
  ["Funding", "An award, payment, donation and delivered result are different events."],
] as const;

const obligations = [
  {
    title: "Stay inside the purposes",
    detail:
      "The governing document defines the charitable purposes and decision structure. Resources must be managed for those purposes and public benefit.",
  },
  {
    title: "Keep and report accounts",
    detail:
      "Returns, accounts, trustee reports and external scrutiny depend on jurisdiction, legal form, income, assets and reporting period.",
  },
  {
    title: "Manage conflicts and assets",
    detail:
      "Trustees steward the charity, make collective decisions and protect its money, property, people and reputation. Payment and private benefit are constrained.",
  },
  {
    title: "Meet ordinary duties too",
    detail:
      "Charitable status does not remove employment, safeguarding, fundraising, company, VAT, PAYE, data-protection or other activity-specific duties.",
  },
] as const;

const primarySources = [
  {
    label: "HMRC: charities and tax",
    href: "https://www.gov.uk/charities-and-tax",
  },
  {
    label: "HMRC and Charity Commission: charities and trading",
    href: "https://www.gov.uk/guidance/charities-and-trading",
  },
  {
    label: "Charity Commission: choosing a structure",
    href: "https://www.gov.uk/guidance/charity-types-how-to-choose-a-structure-cc22a",
  },
  {
    label: "Charity Commission: accounts, reporting and tax",
    href: "https://www.gov.uk/government/collections/charity-accounts-financial-reporting-and-tax",
  },
  {
    label: "GOV.UK: complain about a charity",
    href: "https://www.gov.uk/complain-about-charity",
  },
] as const;

export default function CharitiesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <header className="relative overflow-hidden rounded-[2rem] border border-line bg-ink p-6 text-white shadow-sm sm:p-10 lg:p-12">
        <div
          className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute right-8 top-8 h-28 w-28 rounded-full bg-accent/40"
          aria-hidden="true"
        />
        <div className="relative max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/65">
            UK charities · bounded public guide
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
            See the public bargain. Keep people out of the bulk graph.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/75">
            Find the official register, understand conditional tax relief, read money and
            control honestly, then approach an organisation through the route it publishes
            for help.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#registers"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-accent-soft"
            >
              Open the official registers
            </a>
            <a
              href="https://api.taxsorted.io/v1/charities/uk"
              className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Read the bounded API ↗
            </a>
          </div>
        </div>
      </header>

      <nav
        className="mt-6 rounded-3xl border border-line bg-white p-4"
        aria-label="On this page"
      >
        <div className="flex flex-wrap gap-2">
          {[
            ["#registers", "Official registers"],
            ["#tax", "The tax bargain"],
            ["#control", "Control and ownership"],
            ["#finance", "Finance and assets"],
            ["#help", "Ask for help"],
            ["#boundary", "People and religion boundary"],
            ["#api", "API"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:border-accent hover:bg-accent-soft"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section id="registers" className="mt-16 scroll-mt-6" aria-labelledby="registers-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Identity starts at the source
        </p>
        <h2 id="registers-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Three jurisdictions. Three official doors.
        </h2>
        <p className="mt-3 max-w-4xl leading-7 text-ink-soft">
          Use the exact charity number when possible. A public brand, registered charity and
          trading subsidiary can be different legal entities. Absence from one register is
          not, by itself, proof that an organisation is not charitable.
        </p>
        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {registers.map((register) => (
            <article
              key={register.jurisdiction}
              data-testid="register-card"
              className="rounded-3xl border border-line bg-white p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {register.jurisdiction}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-ink">{register.body}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{register.description}</p>
              <a
                href={register.href}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-5 inline-flex text-sm font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
              >
                Search at the official source ↗
              </a>
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          TaxSorted does not currently mirror these national registers. There is no local
          charity directory, trustee list or address book on this page.
        </div>
      </section>

      <section id="tax" className="mt-16 scroll-mt-6" aria-labelledby="tax-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Conditional relief, not a magic label
        </p>
        <h2 id="tax-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          “Charities pay no tax” is the wrong map.
        </h2>
        <div className="mt-7 overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          <div className="grid gap-px bg-line lg:grid-cols-2">
            <article className="bg-accent-soft p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-ink">
                TaxSorted’s structural reading
              </h3>
              <p className="mt-3 leading-7 text-ink-soft">
                TaxSorted reads conditional relief alongside the restriction of resources to
                recognised charitable purposes and public benefit, trustee duties and public
                reporting. This is analysis of the structure, not a statutory purpose statement
                or a reward for a brand appearing benevolent.
              </p>
            </article>
            <article className="bg-white p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-ink">Where ordinary tax remains</h3>
              <p className="mt-3 leading-7 text-ink-soft">
                HMRC recognition, the source and use of income, trading activity and the exact
                tax all matter. Non-qualifying income or non-charitable spending can be taxed;
                VAT and trading follow their own rules.
              </p>
            </article>
          </div>
          <div className="border-t border-line px-6 py-5 sm:px-8">
            <a
              href="https://www.gov.uk/charities-and-tax"
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
            >
              Check HMRC charities and tax guidance ↗
            </a>
          </div>
        </div>
      </section>

      <section id="control" className="mt-16 scroll-mt-6" aria-labelledby="control-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Stewardship is not share ownership
        </p>
        <h2 id="control-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Ask who governs, holds and controls each legal entity.
        </h2>
        <p className="mt-3 max-w-4xl leading-7 text-ink-soft">
          Trustees direct and steward a charity under its governing document. Members may
          have defined votes. In England and Wales, a corporate charity can hold assets in
          its own name; an unincorporated charity may need trustees or a custodian to hold
          property. Scotland and Northern Ireland have their own legal forms and rules. A
          charity can also control a separate trading subsidiary. Calling all of that
          “ownership” hides the real duties and boundaries.
        </p>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {obligations.map((obligation) => (
            <article key={obligation.title} className="rounded-3xl border border-line bg-white p-6">
              <h3 className="font-semibold text-ink">{obligation.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{obligation.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="finance" className="mt-16 scroll-mt-6" aria-labelledby="finance-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Read the accounting boundary
        </p>
        <h2 id="finance-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Income ≠ spending ≠ assets ≠ impact.
        </h2>
        <p className="mt-3 max-w-4xl leading-7 text-ink-soft">
          Always carry the reporting period, currency, source precision and whether the
          figures describe the charity alone or a consolidated group.
        </p>
        <dl className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {financeMeasures.map(([term, meaning]) => (
            <div key={term} data-testid="finance-card" className="rounded-3xl border border-line bg-white p-6">
              <dt className="font-semibold text-ink">{term}</dt>
              <dd className="mt-2 text-sm leading-6 text-ink-soft">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="help" className="mt-16 scroll-mt-6" aria-labelledby="help-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Reach the service, not a private person
        </p>
        <h2 id="help-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          A calm way to ask what help is actually available.
        </h2>
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <ol className="space-y-4 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
            {[
              "Verify the charity number and jurisdiction at the official register.",
              "Read its stated purposes, activities, area and latest reporting date.",
              "Follow the organisation website linked by the official record.",
              "Use its generic service form, public help line or role-based inbox.",
              "State the help needed, relevant area and only the eligibility facts requested.",
              "Ask whether the service is open, whether it charges, what it needs and where it refers people it cannot help.",
              "Understand the privacy route before sending a case file, identity document or safeguarding detail.",
            ].map((step, index) => (
              <li key={step} className="flex gap-4 text-sm leading-6 text-ink-soft">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <aside className="rounded-3xl border border-line bg-paper p-6 sm:p-8" aria-labelledby="ask-title">
            <h3 id="ask-title" className="text-xl font-semibold text-ink">A useful first message</h3>
            <blockquote className="mt-4 border-l-4 border-accent pl-4 text-sm leading-7 text-ink-soft">
              I am looking for help with [type of need] in [area]. Does your service cover
              this, is it currently open, and what is the safest way to share the minimum
              information you need? If not, is there an official service you recommend I
              contact?
            </blockquote>
            <a
              href="https://www.gov.uk/complain-about-charity"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-6 inline-flex text-sm font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
            >
              Understand complaint and concern routes ↗
            </a>
          </aside>
        </div>
      </section>

      <section id="boundary" className="mt-16 scroll-mt-6" aria-labelledby="boundary-title">
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 sm:p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-800">
            The people and belief boundary
          </p>
          <h2 id="boundary-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            An organisation purpose does not establish a person’s private belief.
          </h2>
          <p className="mt-4 max-w-5xl leading-7 text-ink-soft">
            Advancement of religion can be an official charitable-purpose category. This
            guide does not turn it into a denomination map, congregation list or inference
            about trustees, staff, donors, members, attendees or beneficiaries. Publicly
            listed names and addresses are not copied into a TaxSorted bulk people service.
          </p>
          <p className="mt-4 max-w-5xl text-sm font-semibold leading-6 text-rose-900">
            No local charity mirror. No bulk people export. No person-to-religion graph.
          </p>
        </div>
      </section>

      <section id="api" className="mt-16 scroll-mt-6" aria-labelledby="api-title">
        <div className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            A distribution door with a visible limit
          </p>
          <h2 id="api-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Build from the framework without pretending it is the official register.
          </h2>
          <p className="mt-4 max-w-4xl leading-7 text-ink-soft">
            The bounded API describes sources, official register doors, legal forms, tax
            treatments, obligations, funding, finance disclosures, control and help routes.
            It does not reproduce a national charity database. A later organisation snapshot
            needs source rights, a complete inclusion rule, stable identifiers, correction and
            update rules, human approval and a confidential safety-reporting route.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://api.taxsorted.io/v1/charities/uk"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
            >
              Open `/v1/charities/uk` ↗
            </a>
            <a
              href="https://api.taxsorted.io/openapi.json"
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-paper"
            >
              Read OpenAPI ↗
            </a>
            <a
              href="https://api.taxsorted.io/v1/charities/uk/exports"
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-paper"
            >
              Bulk exports ↗
            </a>
            <a
              href="https://api.taxsorted.io/v1/charities/uk/dictionary"
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-paper"
            >
              Data dictionary ↗
            </a>
            <a
              href="https://api.taxsorted.io/v1/charities/uk/registers"
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-paper"
            >
              Register doors ↗
            </a>
          </div>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="sources-title">
        <h2 id="sources-title" className="text-2xl font-semibold tracking-tight text-ink">
          Primary doors used for this guide
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {primarySources.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                target="_blank"
                rel="noreferrer noopener"
                className="block rounded-2xl border border-line bg-white px-5 py-4 text-sm font-semibold text-accent hover:border-accent hover:bg-accent-soft"
              >
                {source.label} ↗
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm leading-6 text-ink-soft">
          Reviewed 10 July 2026. This is public research, not legal, tax, accounting,
          safeguarding or grant advice. Check the current regulator, HMRC and organisation
          before acting.
        </p>
      </section>
    </div>
  );
}
