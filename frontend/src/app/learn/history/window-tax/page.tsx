import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import { Cited } from "@/components/prep/cited";
import { ExternalLink, PageSources } from "@/components/gov/sources";
import { MaterialFigure } from "@/components/learn/material-figure";
import { windowTaxMaterials } from "@/lib/window-tax-materials";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Window Tax: what the evidence actually shows - TaxSorted",
  description:
    "Why Window Tax began, how sharp bands created incentives, what later records document, and why repeal was also a redesign.",
};

const ACT_1696 = "https://www.legislation.gov.uk/aep/Will3/7-8/18/enacted";
const LORDS_JOURNAL_1696 =
  "https://www.british-history.ac.uk/lords-jrnl/vol15/pp732-733";
const ACT_1851 = "https://www.legislation.gov.uk/ukpga/Vict/14-15/36/enacted";
const HANSARD_1845 =
  "https://hansard.parliament.uk/Commons/1845-03-18/debates/7256a3cb-a389-416f-a079-b8f58ce4a94c/TheWindowDuties";
const HANSARD_1850 =
  "https://hansard.parliament.uk/Commons/1850-04-09/debates/f9bfaf3f-56b7-45f1-af7b-8596ba670ac7/WindowTax";
const HANSARD_1833 =
  "https://hansard.parliament.uk/Commons/1833-04-24/debates/94fc1d8d-ec9f-4baf-b1d7-a1368c3054c0/WindowTax";
const HANSARD_1851 =
  "https://hansard.parliament.uk/Commons/1851-02-19/debates/532617ce-0f0f-4a8c-baa6-80863e2a25de/TheWindowTax%E2%80%94RuleForPetitions";
const NRS_WINDOW_ROLLS =
  "https://www.scotlandspeople.gov.uk/news-and-articles/historical-tax-rolls-window-past";
const HISTORIC_ENGLAND_EDGAR =
  "https://historicengland.org.uk/listing/the-list/list-entry/1389776";
const PARLIAMENT_OVERVIEW =
  "https://www.parliament.uk/about/living-heritage/transformingsociety/private-lives/taxation/overview/taxes18thcentury/";
const RESEARCH_URL =
  "https://github.com/cambridgetcg/taxsorted.io/tree/main/research/uk/tax-history/window-tax";

const repealCartoon = windowTaxMaterials.repealCartoon;
const dumfriesshireRoll = windowTaxMaterials.dumfriesshireRoll;
const edgarStreet = windowTaxMaterials.edgarStreet;

export default function WindowTaxPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[{ href: "/learn", label: "Learn" }]}
        current="Window Tax"
      />

      <header className="mt-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Tax history
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">Window Tax</h1>
        <p className="mt-3 text-lg leading-8 text-ink-soft">
          A visible proxy, a paper trail of changed behaviour, a long argument about light
          and health, and a repeal that replaced one property measure with another.
        </p>
      </header>

      <ShortVersion className="mt-6">
        <li>
          The 1696 law was not simply a charge on every window. Its first bands were 2
          shillings, 6 shillings total and 10 shillings total.
        </li>
        <li>
          Records document windows closed since an earlier survey. A blocked opening by
          itself still does not prove why it was blocked.
        </li>
        <li>
          Health harm was argued in Parliament and disputed there too. A repeal motion
          lost 77 to 80 in 1850.
        </li>
        <li>
          In 1851 Parliament ended the window-count duty and moved the inhabited house
          duty to annual rental value.
        </li>
      </ShortVersion>

      <div
        role="note"
        className="mt-6 rounded-lg border border-line bg-accent-soft p-4 text-base leading-7 text-ink sm:p-5"
      >
        <p>
          <strong>Evidence and permission are different questions.</strong> Every image
          below has a recorded reuse basis. That does not make every story told about the
          image true. The source, credit, changes and evidence limit stay visible beside it.
        </p>
      </div>

      <nav
        aria-label="On this page"
        className="mt-6 flex gap-2 overflow-x-auto border-y border-line py-3 text-sm"
      >
        {[
          ["#origin", "Why it began"],
          ["#bands", "The first bands"],
          ["#records", "The paper trail"],
          ["#building", "Reading a facade"],
          ["#health", "Health debate"],
          ["#repeal", "Three votes"],
          ["#redesign", "The redesign"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 font-medium text-accent underline underline-offset-4 hover:bg-accent-soft hover:text-accent-deep"
          >
            {label}
          </a>
        ))}
      </nav>

      <section id="origin" className="mt-12 scroll-mt-6 border-t border-line pt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">1. Origin</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">A clipped coin, not a window</h2>
        <div className="mt-4 space-y-4 text-base leading-7 text-ink-soft">
          <p>
            <Cited cite={{ source: ACT_1696, effectiveFrom: "25 March 1696" }}>
              The enacted 1696 Act
            </Cited>{" "}
            charged occupied dwellings in England, Wales and Berwick-upon-Tweed. Its stated
            purpose was to make good the deficiency caused when clipped silver was recoined,
            and the occupier was liable. War with France was part of the wider fiscal
            pressure, but it was not the purpose written into the Act.
          </p>
          <p>
            The statute says the charge began on 25 March 1696.{" "}
            <Cited cite={{ source: LORDS_JOURNAL_1696, effectiveFrom: "10 April 1696" }}>
              The Lords Journal
            </Cited>{" "}
            records Royal Assent on 10 April. The modern legislation site calls it the
            Taxation (No. 3) Act 1695 because historical session dating does not line up
            neatly with the calendar year.
          </p>
        </div>

        <div
          role="img"
          aria-label="TaxSorted reconstruction: clipped silver led to losses during recoinage, which led Parliament to a house-and-window charge."
          className="mt-6 grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]"
        >
          {[
            ["Clipped silver", "Edges were cut from coins, reducing their silver."],
            ["Loss during recoinage", "Old clipped money was exchanged for full-weight coin."],
            ["House-and-window charge", "Parliament created a visible property-based charge."],
          ].map(([title, detail], index) => (
            <div key={title} className="contents">
              <div className="rounded-lg border border-line bg-white p-4">
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">{detail}</p>
              </div>
              {index < 2 ? (
                <span
                  aria-hidden="true"
                  className="flex rotate-90 items-center justify-center text-xl text-accent sm:rotate-0 sm:px-1"
                >
                  &#8594;
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          TaxSorted reconstruction from the enacted 1696 Act, not a historical object.
        </p>
      </section>

      <section id="bands" className="mt-12 scroll-mt-6 border-t border-line pt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          2. The proxy
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink">
          A visible measure with sharp edges
        </h2>
        <p className="mt-4 text-base leading-7 text-ink-soft">
          <Cited cite={{ source: ACT_1696, effectiveFrom: "25 March 1696" }}>
            The enacted 1696 Act
          </Cited>{" "}
          used three annual bands. It was not initially a separate charge on each
          individual window.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["0-9 windows", "2s", "base house duty"],
            ["10-19 windows", "6s total", "2s base plus 4s"],
            ["20+ windows", "10s total", "2s base plus 8s"],
          ].map(([band, amount, detail]) => (
            <div key={band} className="rounded-lg border border-line bg-white p-5">
              <p className="text-sm font-semibold text-accent">{band}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-ink">{amount}</p>
              <p className="mt-1 text-sm text-ink-soft">{detail}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-base leading-7 text-ink-soft">
          A house moving from 9 to 10 windows crossed from 2 shillings to 6. That cliff is the
          important design fact: when a visible proxy changes a bill sharply, people have a
          reason to change the thing being counted. Later Acts changed the bands and
          calculation, so later rates should not be projected back onto 1696.
        </p>
      </section>

      <section id="records" className="mt-12 scroll-mt-6 border-t border-line pt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          3. Documented behaviour
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink">The paper trail says more than a wall</h2>
        <p className="mt-4 text-base leading-7 text-ink-soft">
          <Cited cite={{ source: NRS_WINDOW_ROLLS, effectiveFrom: "1754" }}>
            National Records of Scotland&apos;s Dumfriesshire extract
          </Cited>{" "}
          records entries with one, three and five windows closed since the previous survey.
          That is direct administrative evidence of changed window counts. It still does not
          tell us why every opening was closed.
        </p>

        <div className="mt-6">
          <MaterialFigure
            id={dumfriesshireRoll.id}
            src={dumfriesshireRoll.publicUrl}
            width={dumfriesshireRoll.width}
            height={dumfriesshireRoll.height}
            alt="A 1754 handwritten Dumfriesshire Window Tax roll. In the occasional remarks column, three entries note that one, three and five windows had been closed since the last survey."
            title="Dumfriesshire Window Tax roll, 1754"
            caption={
              <p>
                NRS E326/1/32, page 73. The notes document fewer open windows at three
                assessed properties than at the earlier survey.
              </p>
            }
            creator={dumfriesshireRoll.source.creator}
            sourceLabel={`${dumfriesshireRoll.source.publisher}, ${dumfriesshireRoll.source.locator}`}
            sourceUrl={dumfriesshireRoll.source.pageUrl}
            creditLine={dumfriesshireRoll.rights.creditLine}
            rightsLabel="National Records of Scotland copyright and reuse conditions"
            rightsUrl={dumfriesshireRoll.rights.statementUrl}
            changeNote={dumfriesshireRoll.changeNote}
            evidenceBoundary={dumfriesshireRoll.evidence.doesNotProve.join(" ")}
            transcript={
              <ul className="list-disc space-y-1 pl-5">
                <li>One window closed since the previous survey.</li>
                <li>Three windows closed since the previous survey.</li>
                <li>Five windows closed since the previous survey.</li>
              </ul>
            }
          />
        </div>
      </section>

      <section id="building" className="mt-12 scroll-mt-6 border-t border-line pt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          4. Probable attribution
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Look carefully at the facade</h2>
        <p className="mt-4 text-base leading-7 text-ink-soft">
          <Cited cite={{ source: HISTORIC_ENGLAND_EDGAR, effectiveFrom: "listing reviewed 16 July 2026" }}>
            Historic England&apos;s list entry
          </Cited>{" "}
          says the ground-floor windows at 3 Edgar Street were paired to reduce the facade
          count from 14 to 12, <em>presumably</em> to reduce Window Tax. That one word
          matters. The facade is visible; the official interpretation is probable; the
          owner&apos;s recorded intention is not in the source.
        </p>

        <div className="mt-6">
          <MaterialFigure
            id={edgarStreet.id}
            src={edgarStreet.publicUrl}
            width={edgarStreet.width}
            height={edgarStreet.height}
            alt="The brick Georgian facade of 3 Edgar Street, Worcester, with five sash windows on each upper floor and two paired groups of ground-floor sash windows around a central door."
            title="3 Edgar Street, Worcester"
            caption={
              <p>
                The photograph shows the present arrangement.{" "}
                <ExternalLink href={HISTORIC_ENGLAND_EDGAR}>
                  Historic England&apos;s list entry
                </ExternalLink>{" "}
                supplies the qualified 14-to-12 interpretation.
              </p>
            }
            creator={edgarStreet.source.creator}
            sourceLabel="Wikimedia Commons, Geograph image 6461842"
            sourceUrl={edgarStreet.source.pageUrl}
            creditLine={edgarStreet.rights.creditLine}
            rightsLabel={edgarStreet.rights.licence?.name ?? "Rights statement"}
            rightsUrl={edgarStreet.rights.licence?.url ?? edgarStreet.rights.statementUrl}
            changeNote={edgarStreet.changeNote}
            evidenceBoundary={edgarStreet.evidence.doesNotProve.join(" ")}
          />
        </div>
      </section>

      <section id="health" className="mt-12 scroll-mt-6 border-t border-line pt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          5. Contested effects
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink">
          Health evidence was argued, not magically settled
        </h2>
        <p className="mt-4 text-base leading-7 text-ink-soft">
          <Cited cite={{ source: HANSARD_1845, effectiveFrom: "18 March 1845" }}>
            The 1845 Commons debate
          </Cited>{" "}
          contains claims from doctors, builders, local health bodies and reformers that the
          duty encouraged restrictions on light and ventilation, together with a government
          rebuttal disputing parts of that evidence.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="border-l-4 border-accent pl-4">
            <h3 className="font-semibold text-ink">What the record supports</h3>
            <p className="mt-2 text-base leading-7 text-ink-soft">
              Contemporary people connected the tax with darker, less ventilated housing and
              pressed Parliament to act.
            </p>
          </div>
          <div className="border-l-4 border-amber-400 pl-4">
            <h3 className="font-semibold text-ink">What it cannot calculate</h3>
            <p className="mt-2 text-base leading-7 text-ink-soft">
              It does not produce a modern death estimate. Crowding, drainage, sanitation,
              poverty, heating and disease transmission were intertwined.
            </p>
          </div>
        </div>
      </section>

      <section id="repeal" className="mt-12 scroll-mt-6 border-t border-line pt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          6. Decision point
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Three votes</h2>
        <p className="mt-4 text-base leading-7 text-ink-soft">
          Petitions reported in{" "}
          <ExternalLink href={HANSARD_1833}>1833</ExternalLink> and{" "}
          <ExternalLink href={HANSARD_1851}>1851</ExternalLink> show opposition reaching
          Parliament through formal public channels. But pressure did not produce immediate
          repeal.
        </p>

        <div className="mt-6 flex items-baseline justify-between gap-5 rounded-lg border border-line bg-white p-5 sm:p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              Commons division, 9 April 1850
            </p>
            <p className="mt-2 text-base text-ink-soft">
              <Cited cite={{ source: HANSARD_1850, effectiveFrom: "9 April 1850" }}>
                The recorded division
              </Cited>{" "}
              shows the repeal resolution failing by three votes.
            </p>
          </div>
          <p className="shrink-0 text-3xl font-bold tabular-nums text-ink">77-80</p>
        </div>

        <div className="mt-6">
          <MaterialFigure
            id={repealCartoon.id}
            src={repealCartoon.publicUrl}
            width={repealCartoon.width}
            height={repealCartoon.height}
            alt="A black-and-white 1850 Punch satire by Richard Doyle. In a dark room, a family welcomes a smiling personified sun appearing at the window after repeal of the Window Tax."
            title="A vision of the repeal of the window-tax"
            caption={
              <p>
                Richard Doyle&apos;s satire presented repeal as the return of daylight. It is
                evidence of contemporary campaign culture and visual argument, not a neutral
                survey of housing conditions.
              </p>
            }
            creator={`${repealCartoon.source.creator}, ${repealCartoon.source.created}`}
            sourceLabel={`${repealCartoon.source.publisher}, ${repealCartoon.source.locator}`}
            sourceUrl={repealCartoon.source.pageUrl}
            creditLine={repealCartoon.rights.creditLine}
            rightsLabel={repealCartoon.rights.licence?.name ?? "Rights statement"}
            rightsUrl={repealCartoon.rights.licence?.url ?? repealCartoon.rights.statementUrl}
            changeNote={repealCartoon.changeNote}
            evidenceBoundary={repealCartoon.evidence.doesNotProve.join(" ")}
          />
        </div>
      </section>

      <section id="redesign" className="mt-12 scroll-mt-6 border-t border-line pt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          7. Replacement
        </p>
        <h2 className="mt-2 text-2xl font-bold text-ink">Repeal was also redesign</h2>
        <p className="mt-4 text-base leading-7 text-ink-soft">
          <Cited cite={{ source: ACT_1851, effectiveFrom: "1851" }}>
            The 1851 Act
          </Cited>{" "}
          ended the window-count duty and substituted an inhabited house duty based on
          annual value. Parliament changed the proxy rather than abandoning property
          taxation.
        </p>

        <div
          role="img"
          aria-label="The property-tax proxy changed from number of windows to annual rental value."
          className="mt-6 grid items-center gap-3 rounded-lg border border-line bg-white p-5 text-center sm:grid-cols-[1fr_auto_1fr] sm:p-6"
        >
          <div>
            <p className="text-sm font-semibold text-accent">Old proxy</p>
            <p className="mt-1 text-xl font-bold text-ink">Number of windows</p>
          </div>
          <span aria-hidden="true" className="text-2xl text-accent">
            &#8594;
          </span>
          <div>
            <p className="text-sm font-semibold text-accent">New proxy</p>
            <p className="mt-1 text-xl font-bold text-ink">Annual rental value</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-accent/30 bg-accent-soft p-5">
          <h3 className="font-semibold text-ink">The useful question now</h3>
          <p className="mt-2 text-base leading-7 text-ink-soft">
            When a proxy changes behaviour and distributes harm badly, should lawmakers remove
            the tax, change the proxy, change the thresholds, or change who bears the charge?
          </p>
        </div>
      </section>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="text-2xl font-bold text-ink">How to read the evidence</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-ink">Documented</dt>
            <dd className="mt-1 text-sm leading-6 text-ink-soft">
              The Dumfriesshire roll records changed window counts.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Probable</dt>
            <dd className="mt-1 text-sm leading-6 text-ink-soft">
              Historic England uses <em>presumably</em> for 3 Edgar Street.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Cultural response</dt>
            <dd className="mt-1 text-sm leading-6 text-ink-soft">
              The Punch cartoon shows an argument for repeal, not a measurement.
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-base leading-7 text-ink-soft">
          The complete candidate ledger, held-back materials and claim limits are in the{" "}
          <ExternalLink href={RESEARCH_URL}>Window Tax research record</ExternalLink>. Agents
          and other tools can inspect the exact deployed files in the{" "}
          <Link
            href="/media/window-tax/manifest.json"
            className="font-medium text-accent underline underline-offset-4 hover:text-accent-deep"
          >
            media manifest (JSON)
          </Link>
          .
        </p>
      </section>

      <PageSources
        links={[
          { href: ACT_1696, label: "1696 enacted Act" },
          { href: LORDS_JOURNAL_1696, label: "Lords Journal, 10 April 1696" },
          { href: ACT_1851, label: "House Tax Act 1851" },
          { href: HANSARD_1845, label: "Commons Window Duties debate, 18 March 1845" },
          { href: HANSARD_1850, label: "Commons Window Tax debate and division, 9 April 1850" },
          { href: HANSARD_1833, label: "St Paul, Covent Garden petition report, 1833" },
          { href: HANSARD_1851, label: "St James, Bath petition report, 1851" },
          { href: NRS_WINDOW_ROLLS, label: "National Records of Scotland historical tax rolls" },
          { href: HISTORIC_ENGLAND_EDGAR, label: "Historic England: 3 Edgar Street" },
          { href: PARLIAMENT_OVERVIEW, label: "UK Parliament taxation overview" },
        ]}
      />
    </div>
  );
}
