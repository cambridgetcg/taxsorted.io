import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "How UK charities work — TaxSorted",
  description:
    "Find a charity on its official register, understand how charity tax really works, and ask for help safely — with the rules that keep people out of our data.",
};

const registers = [
  {
    jurisdiction: "England and Wales",
    body: "Charity Commission",
    href: "https://www.gov.uk/find-charity-information",
    description:
      "Search registered charities by name or number and read their stated work and filed information. Some charities do not have to register — the law calls them excepted or exempt — or sit outside the ordinary registration threshold.",
  },
  {
    jurisdiction: "Scotland",
    body: "OSCR",
    href: "https://www.oscr.org.uk/about-charities/search-the-register/",
    description:
      "The Office of the Scottish Charity Regulator (OSCR) holds the Scottish record. Search the Scottish Charity Register by exact number, purpose, status, form, geography or income.",
  },
  {
    jurisdiction: "Northern Ireland",
    body: "CCNI",
    href: "https://www.charitycommissionni.org.uk/start-up-a-charity/register-of-charities/",
    description:
      "The Charity Commission for Northern Ireland (CCNI) publishes identity, purposes, activities and annual reporting information. Use its register search and guidance.",
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

const accountabilityEvidence = [
  {
    title: "Formal objects and attributed claims",
    description:
      "These establish an object or preserve a reviewed TaxSorted normalisation of what a linked source says. They do not, by themselves, prove delivery or effect.",
    items: [
      [
        "Organisation identity",
        "An exact registered organisation or official institution, kept separate from its source document and attributed claims.",
      ],
      [
        "Source document",
        "Reviewed metadata plus bounded public review declarations and notes; source bodies, excerpts, images and attachments stay external.",
      ],
      ["Plan", "A stated intention, target, budget or future programme."],
      ["Self-report", "An organisation’s own account of its work, performance or results."],
    ],
  },
  {
    title: "Records, transactions and assessment",
    description:
      "These preserve disclosures, decisions, transfers, reported delivery, reported change or independent analysis as separate evidence.",
    items: [
      ["Filing", "A submitted account, return, trustee report or other formal disclosure."],
      ["Award", "A decision to allocate money; not proof of payment, delivery or impact."],
      ["Payment", "A recorded transfer; not proof that a service was delivered or worked."],
      ["Output", "A sourced record of an activity, service or thing produced."],
      ["Outcome", "A sourced claim or measurement of change, with its method and limits."],
      ["Evaluation", "A review whose author, method, independence and conclusions remain visible."],
    ],
  },
] as const;

const evidenceContext = [
  [
    "Source voice",
    "Who is speaking: the subject organisation, regulator, funder, auditor, delivery partner, evaluator or TaxSorted editorial analysis.",
  ],
  ["Date", "The event, publication and retrieval dates where each is available."],
  [
    "Scope",
    "The exact organisation, programme or aggregate population described; item-level assets and locations are excluded.",
  ],
  ["Period", "The time covered by the evidence, not merely the webpage date."],
  ["Metric", "The exact scope and metric definitions, method, units and accounting boundary."],
] as const;

const controlPoints = [
  "Members may have defined votes.",
  "In England and Wales, a corporate charity can hold assets in its own name. An unincorporated charity may need trustees or a custodian to hold property.",
  "Scotland and Northern Ireland have their own legal forms and rules.",
  "A charity can also control a separate trading subsidiary.",
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
      "Charitable status does not remove employment, safeguarding, fundraising, company, VAT, PAYE (Pay As You Earn payroll), data-protection or other activity-specific duties.",
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
      <Breadcrumbs
        items={[{ href: "/uk/money", label: "Follow the money" }]}
        current="Charities"
        className="mb-6"
      />

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
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
            UK charities
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Check a charity, understand its tax, ask it for help.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/80">
            Find any UK charity on its official register, see how charity tax really
            works, and ask for help the safe way.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#registers"
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-base font-semibold text-ink hover:bg-accent-soft"
            >
              Find a charity
            </a>
            <a
              href="#help"
              className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-5 py-2.5 text-base font-semibold text-white hover:bg-white/10"
            >
              How to ask for help
            </a>
          </div>
        </div>
      </header>

      <ShortVersion className="mt-6">
        <li>Check a charity’s number on its official register before trusting the brand.</li>
        <li>
          “Charities pay no tax” is not quite true: relief has conditions, and some income
          is still taxed.
        </li>
        <li>There is a calm, 7-step way to ask a charity for help — see below.</li>
        <li>We publish how charities work, never a directory of the people in them.</li>
      </ShortVersion>

      <nav
        className="mt-6 rounded-3xl border border-line bg-white p-4"
        aria-label="On this page"
      >
        <div className="flex flex-wrap gap-2">
          {[
            ["#registers", "Find a charity"],
            ["#tax", "How charity tax works"],
            ["#help", "Ask for help"],
            ["#control", "Who runs a charity"],
            ["#finance", "Reading the money"],
            ["#protect", "How we protect people in this data"],
            ["#developers", "For developers"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-base text-ink hover:border-accent hover:bg-accent-soft"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section id="registers" className="mt-16 scroll-mt-6" aria-labelledby="registers-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Start at the official source
        </p>
        <h2 id="registers-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Three nations, three official registers.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          Use the exact charity number when possible. A public brand, a registered charity
          and a trading subsidiary can be different legal bodies. Absence from one register
          is not, by itself, proof that an organisation is not charitable.
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
              <p className="mt-3 text-base leading-7 text-ink-soft">{register.description}</p>
              <a
                href={register.href}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-5 inline-flex min-h-11 items-center text-base font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
              >
                Search at the official source <span aria-hidden="true">&nbsp;↗</span>
              </a>
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-base leading-7 text-amber-950">
          TaxSorted does not copy these national registers. There is no local charity
          directory, trustee list or address book on this page.
        </div>
      </section>

      <section id="tax" className="mt-16 scroll-mt-6" aria-labelledby="tax-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Relief with conditions, not a magic label
        </p>
        <h2 id="tax-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          “Charities pay no tax” is the wrong map.
        </h2>
        <div className="mt-7 overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          <div className="grid gap-px bg-line lg:grid-cols-2">
            <article className="bg-accent-soft p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-ink">
                Why charities get tax relief
              </h3>
              <p className="mt-3 text-base leading-7 text-ink-soft">
                Relief comes with strings. Money must serve recognised charitable purposes
                and public benefit, trustees carry duties, and reporting is public. This is
                analysis of the structure, not a statement of law or a reward for a brand
                appearing benevolent.
              </p>
            </article>
            <article className="bg-white p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-ink">Where ordinary tax remains</h3>
              <p className="mt-3 text-base leading-7 text-ink-soft">
                Recognition by HM Revenue &amp; Customs (HMRC — the UK tax office), the source
                and use of income, trading activity and the exact tax all matter.
                Non-qualifying income or non-charitable spending can be taxed; VAT (Value
                Added Tax) and trading follow their own rules.
              </p>
            </article>
          </div>
          <div className="border-t border-line px-6 py-4 sm:px-8">
            <a
              href="https://www.gov.uk/charities-and-tax"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center text-base font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
            >
              Check HMRC charities and tax guidance <span aria-hidden="true">&nbsp;↗</span>
            </a>
          </div>
        </div>
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
              <li key={step} className="flex gap-4 text-base leading-7 text-ink-soft">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <aside className="rounded-3xl border border-line bg-paper p-6 sm:p-8" aria-labelledby="ask-title">
            <h3 id="ask-title" className="text-xl font-semibold text-ink">A useful first message</h3>
            <blockquote className="mt-4 border-l-4 border-accent pl-4 text-base leading-7 text-ink-soft">
              I am looking for help with [type of need] in [area]. Does your service cover
              this, is it currently open, and what is the safest way to share the minimum
              information you need? If not, is there an official service you recommend I
              contact?
            </blockquote>
            <a
              href="https://www.gov.uk/complain-about-charity"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-6 inline-flex min-h-11 items-center text-base font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
            >
              Understand complaint and concern routes <span aria-hidden="true">&nbsp;↗</span>
            </a>
          </aside>
        </div>
      </section>

      <section id="control" className="mt-16 scroll-mt-6" aria-labelledby="control-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Nobody “owns” a charity like shares
        </p>
        <h2 id="control-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Ask who governs, holds and controls each legal body.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          Trustees direct and steward a charity under its governing document.
        </p>
        <ul className="mt-3 max-w-4xl list-disc space-y-2 pl-5 text-base leading-7 text-ink-soft">
          {controlPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          Calling all of that “ownership” hides the real duties and boundaries.
        </p>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {obligations.map((obligation) => (
            <article key={obligation.title} className="rounded-3xl border border-line bg-white p-6">
              <h3 className="font-semibold text-ink">{obligation.title}</h3>
              <p className="mt-3 text-base leading-7 text-ink-soft">{obligation.detail}</p>
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
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          Always carry the reporting period, the currency and the source’s precision. Check
          whether figures describe the charity alone or a consolidated group.
        </p>
        <dl className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {financeMeasures.map(([term, meaning]) => (
            <div key={term} data-testid="finance-card" className="rounded-3xl border border-line bg-white p-6">
              <dt className="font-semibold text-ink">{term}</dt>
              <dd className="mt-2 text-base leading-7 text-ink-soft">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <details
        id="protect"
        className="group mt-16 scroll-mt-6 rounded-[2rem] border border-line bg-white shadow-sm"
      >
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-6 marker:hidden sm:p-8">
          <span>
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              How we protect people in this data
            </h2>
            <p className="mt-2 max-w-4xl text-base leading-7 text-ink-soft">
              We are designing a way to show what charities say next to what they file. It
              is not live yet. These are the safety rules it must obey first — heavy
              detail, for careful readers.
            </p>
          </span>
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-lg text-accent transition group-open:rotate-45"
            aria-hidden="true"
          >
            +
          </span>
        </summary>

        <div className="border-t border-line p-6 sm:p-8">
          <h3 className="max-w-4xl text-2xl font-semibold tracking-tight text-ink">
            Compare public claims and records without inventing a character score.
          </h3>
          <p className="mt-3 max-w-5xl text-base leading-7 text-ink-soft">
            This is the published model for a future ledger, not a populated organisation
            directory. It keeps each evidence kind distinct, attributes the source voice and
            links back to the original wording. A legal object, a normalised claim and a reported
            result are not interchangeable just because they concern the same charity.
          </p>
          <p className="mt-3 max-w-5xl text-base leading-7 text-ink-soft">
            The API stores a human-reviewed paraphrase, not a quotation. Its locator is a human
            editorial assertion, not a mechanically proven anchor. Follow it to the publisher&apos;s
            words as available at review time; the permanence field says whether a publisher
            version or lawful archive is known. Public review notes, IDs, attribution, terms,
            limitations and locators are screened too: no copied source excerpt or personal detail,
            and locators remain pointers rather than quotations.
          </p>
          <p className="mt-3 max-w-5xl text-base leading-7 text-ink-soft">
            A TaxSorted editorial number cannot call itself reported. TaxSorted-derived finance must
            show its exact arithmetic, while programmes, funding, assets, control, observations and
            outcomes stay attributed to an external institutional source.
          </p>

          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {accountabilityEvidence.map((group, index) => (
              <article
                key={group.title}
                className={
                  index === 0
                    ? "rounded-[2rem] border border-ink bg-ink p-6 text-white shadow-sm sm:p-8"
                    : "rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8"
                }
              >
                <h4 className={`text-xl font-semibold ${index === 0 ? "text-white" : "text-ink"}`}>
                  {group.title}
                </h4>
                <p
                  className={`mt-3 text-base leading-7 ${index === 0 ? "text-white/80" : "text-ink-soft"}`}
                >
                  {group.description}
                </p>
                <dl className="mt-6 space-y-4">
                  {group.items.map(([term, meaning]) => (
                    <div
                      key={term}
                      data-testid="accountability-evidence-type"
                      className={
                        index === 0
                          ? "rounded-2xl border border-white/15 bg-white/5 p-4"
                          : "rounded-2xl border border-line bg-paper p-4"
                      }
                    >
                      <dt className={`font-semibold ${index === 0 ? "text-white" : "text-ink"}`}>
                        {term}
                      </dt>
                      <dd
                        className={`mt-1 text-base leading-7 ${index === 0 ? "text-white/80" : "text-ink-soft"}`}
                      >
                        {meaning}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-3xl border border-line bg-accent-soft p-6 sm:p-8">
            <h4 className="text-xl font-semibold text-ink">
              Keep the relevant context attached when records are compared
            </h4>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {evidenceContext.map(([term, meaning]) => (
                <div key={term} className="rounded-2xl bg-white/75 p-4">
                  <dt className="text-base font-semibold text-accent-deep">{term}</dt>
                  <dd className="mt-2 text-base leading-7 text-ink-soft">{meaning}</dd>
                </div>
              ))}
            </dl>
          </div>

          <aside
            className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8"
            aria-labelledby="comparison-rules-title"
          >
            <h4 id="comparison-rules-title" className="text-xl font-semibold text-ink">
              Missing evidence is not contradiction.
            </h4>
            <div className="mt-4 space-y-3 text-base leading-7 text-amber-950">
              <p>
                A gap records evidence that is missing, unavailable, unsafe, conflicting or
                deliberately excluded. It does not make a claim false. An award is not a
                payment, delivery or impact result, and those stages must never be silently
                filled in.
              </p>
              <p>
                If an aggregate would need suppression, its value is omitted and a reviewed
                coverage gap records only that an omission happened. Its fixed wording cannot
                repeat the amount or sensitive context, and it cannot point back to the source.
              </p>
              <p>
                Every financial fact receives a disclosure review. Every derived financial fact
                and numeric comparison receives a fresh result review. If an input is
                people-derived, the result stays people-derived and needs its own reviewed-safe
                smallest cell. Staff costs, remuneration bands and trustee remuneration are
                always treated as people-derived. The final privacy review follows disclosure, so
                it also checks the disclosure reviewer&apos;s public limitations text.
              </p>
              <p>
                Only human-reviewed, logically incompatible records or statements about the
                same exact organisation identifier, period, scope key and definition, and metric
                key and definition may be labelled inconsistent. Two money records must also match
                basis, measurement stage and amount date. Differences in voice, timing or method
                stay visible as differences.
              </p>
              <p className="font-semibold">
                No honesty, trust, faith or impact leaderboard is produced from this evidence.
              </p>
            </div>
          </aside>

          <div className="mt-5 rounded-[2rem] border border-rose-200 bg-rose-50 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-rose-800">
              The people and belief boundary
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              An organisation purpose does not establish a person’s private belief.
            </h3>
            <p className="mt-4 max-w-5xl text-base leading-7 text-ink-soft">
              Advancement of religion can be an official charitable-purpose category. This
              guide does not turn it into a denomination map, congregation list or inference
              about trustees, staff, donors, members, attendees or beneficiaries. Publicly
              listed names and addresses are not copied into a TaxSorted bulk people service.
            </p>
            <p className="mt-4 max-w-5xl text-base font-semibold leading-7 text-rose-900">
              No local charity mirror. No bulk people export. No person-to-religion graph.
            </p>
          </div>
        </div>
      </details>

      <details
        id="developers"
        className="group mt-6 scroll-mt-6 rounded-[2rem] border border-line bg-white shadow-sm"
      >
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-6 marker:hidden sm:p-8">
          <span>
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              For developers
            </h2>
            <p className="mt-2 max-w-4xl text-base leading-7 text-ink-soft">
              The bounded API, its schemas and the machine-readable explanation traces.
            </p>
          </span>
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-lg text-accent transition group-open:rotate-45"
            aria-hidden="true"
          >
            +
          </span>
        </summary>

        <div className="border-t border-line p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-ink">
            Build from the framework without pretending it is the official register.
          </h3>
          <p className="mt-4 max-w-4xl text-base leading-7 text-ink-soft">
            The bounded API describes sources, official register doors, legal forms, tax
            treatments, obligations, funding, finance disclosures, control and help routes.
            It does not reproduce a national charity database. A later organisation snapshot
            needs source rights, a complete inclusion rule, stable identifiers, correction and
            update rules, human approval and a confidential safety-reporting route.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://api.taxsorted.io/v1/charities/uk"
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-base font-semibold text-white hover:bg-accent-deep"
            >
              Open `/v1/charities/uk` <span aria-hidden="true">&nbsp;↗</span>
            </a>
            <a
              href="https://api.taxsorted.io/openapi.json"
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-base font-semibold text-accent hover:bg-paper"
            >
              Read OpenAPI <span aria-hidden="true">&nbsp;↗</span>
            </a>
            <a
              href="https://api.taxsorted.io/v1/charities/uk/exports"
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-base font-semibold text-accent hover:bg-paper"
            >
              Bulk exports <span aria-hidden="true">&nbsp;↗</span>
            </a>
            <a
              href="https://api.taxsorted.io/v1/charities/uk/dictionary"
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-base font-semibold text-accent hover:bg-paper"
            >
              Data dictionary <span aria-hidden="true">&nbsp;↗</span>
            </a>
            <a
              href="https://api.taxsorted.io/v1/charities/uk/registers"
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-base font-semibold text-accent hover:bg-paper"
            >
              Register doors <span aria-hidden="true">&nbsp;↗</span>
            </a>
            <a
              href="https://api.taxsorted.io/v1/why-graph/adopters"
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-base font-semibold text-accent hover:bg-paper"
            >
              Why-graph adopters <span aria-hidden="true">&nbsp;↗</span>
            </a>
          </div>

          <div className="mt-8 rounded-3xl border border-line bg-paper p-6">
            <h3 className="text-xl font-semibold text-ink">Explanation traces for tax treatments</h3>
            <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
              Every published tax treatment now has a machine-readable explanation trace.
              It connects stable record fields to their exact reviewed sources, keeps the
              possible benefit beside the reverse tax path, and names what is still missing.
              The corpus now admits exact primary-law records where reviewed, with
              supplementary law and conditional procedures kept separately queryable. The
              graph still says when a binding provision, case selector, deadline, or route
              is not established instead of dressing guidance, adjacency, or a sector map
              up as a conclusion about a real case.
            </p>
            <a
              href="https://api.taxsorted.io/v1/charities/uk/tax-treatments/tax-income-and-gains/why-graph"
              className="mt-4 inline-flex min-h-11 items-center text-base font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
            >
              Walk the income-and-gains why graph <span aria-hidden="true">&nbsp;↗</span>
            </a>
          </div>

          <div className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Open shape, guarded publication
            </p>
            <h3 className="mt-2 text-xl font-semibold text-ink">
              Builders can use the accountability schema.
            </h3>
            <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
              The evidence types, provenance fields, collection guide and comparison rules are
              open for structural reuse. No route accepts candidate documents. The two named
              blockers—confidential correction intake and asset-level rights review—are immediate,
              not exhaustive: all nine admission conditions must pass before any organisation row
              is published. Use the zero-row example and runtime validator; JSON Schema alone does
              not perform the graph, arithmetic or history checks.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="https://api.taxsorted.io/v1/charities/uk/accountability"
                className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-base font-semibold text-white hover:bg-accent-deep"
              >
                Accountability index <span aria-hidden="true">&nbsp;↗</span>
              </a>
              <a
                href="https://api.taxsorted.io/v1/charities/uk/accountability/schema"
                className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-base font-semibold text-accent hover:bg-paper"
              >
                Accountability schema <span aria-hidden="true">&nbsp;↗</span>
              </a>
              <a
                href="https://github.com/cambridgetcg/taxsorted.io/blob/main/research/uk/charity-accountability/examples/zero-row-candidate.json"
                className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-base font-semibold text-accent hover:bg-paper"
              >
                Zero-row example <span aria-hidden="true">&nbsp;↗</span>
              </a>
            </div>
          </div>
        </div>
      </details>

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
                className="block rounded-2xl border border-line bg-white px-5 py-4 text-base font-semibold text-accent hover:border-accent hover:bg-accent-soft"
              >
                {source.label} <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm leading-6 text-ink-soft">
          Reviewed 13 July 2026. This is public research, not legal, tax, accounting,
          safeguarding or grant advice. Check the current regulator, HMRC and organisation
          before acting.
        </p>
      </section>
    </div>
  );
}
