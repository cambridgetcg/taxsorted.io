import type { Metadata } from "next";
import Link from "next/link";
import { Cited } from "@/components/prep/cited";

// i18n: deferred to M2 — plain English for launch

// Fact source: regs/research/gov/participation.md ONLY (fetched/verified
// 2026-07-06), its §1 case-study table + prose and §2 professional-body
// table. No other corpus file was used for a case-study fact on this page.
// A claim not in that section does not appear here — including the HICBC
// household-income-consultation footnote, which participation.md itself
// flags "not verified today; do not publish without checking" (LOW/unverified)
// and is therefore deliberately omitted.
//
// Hedge discipline: every confidence flag the corpus carries (MEDIUM,
// LOW-MEDIUM, self-reported, search-snippet-verified) is preserved in the
// visible copy below, not just tucked into a Cited note — because this page's
// whole point is causation, and causation is exactly where a hedge silently
// dropped becomes an overclaim. Copy says "following pressure from X", not
// "because of X", except where the corpus's own source explicitly names the
// cause (e.g. the 13 Jul 2017 gov.uk announcement, which names the pressure
// sources itself).
const VERIFIED_ON = "2026-07-06";

// --- MTD -----------------------------------------------------------------
const MTD_LORDS_2017_URL =
  "https://committees.parliament.uk/committee/230/finance-bill-subcommittee/news/94386/put-the-brakes-on-making-tax-digital-for-businesses-urges-committee/";
const MTD_2017_DEFERRAL_URL =
  "https://www.gov.uk/government/news/next-steps-on-the-finance-bill-and-making-tax-digital";
const MTD_2021_DELAY_URL =
  "https://www.gov.uk/government/news/businesses-get-more-time-to-prepare-for-digital-tax-changes";
const MTD_2022_THRESHOLD_URL =
  "https://www.gov.uk/government/news/government-announces-phased-mandation-of-making-tax-digital-for-itsa";
const MTD_NAO_URL = "https://www.nao.org.uk/reports/progress-with-making-tax-digital/";
const MTD_2023_OUTCOME_URL =
  "https://www.gov.uk/government/publications/outcome-of-the-making-tax-digital-small-business-review";
const MTD_2025_REVERSAL_URL =
  "https://www.gov.uk/government/publications/making-tax-digital-for-income-tax-self-assessment-reducing-the-mandation-threshold-from-30000-to-20000-from-april-2028/reduction-of-the-mandation-threshold-from-30000-to-20000-from-april-2028";

// --- IR35 / off-payroll ----------------------------------------------------
const IR35_GROWTH_PLAN_URL =
  "https://www.gov.uk/government/publications/the-growth-plan-2022-documents";
const IR35_REVERSAL_URL =
  "https://www.gov.uk/government/news/chancellor-brings-forward-further-medium-term-fiscal-plan-measures";

// --- HICBC -----------------------------------------------------------------
const HICBC_POLICY_PAPER_URL =
  "https://www.gov.uk/government/publications/income-tax-increasing-the-high-income-child-benefit-charge-threshold";
const HICBC_MSE_URL =
  "https://www.moneysavingexpert.com/news/2024/03/spring-budget-child-benefit-martin-lewis-mse/";

// --- Loan charge -------------------------------------------------------------
const LOAN_CHARGE_MORSE_URL =
  "https://www.gov.uk/government/publications/disguised-remuneration-independent-loan-charge-review";
const LOAN_CHARGE_MORSE_GUIDANCE_URL =
  "https://www.gov.uk/government/publications/disguised-remuneration-independent-loan-charge-review/guidance";
const LOAN_CHARGE_APPG_URL = "https://www.loanchargeappg.co.uk/";
const LOAN_CHARGE_MCCANN_URL =
  "https://www.gov.uk/government/publications/independent-review-of-the-loan-charge";

// --- LITRG -------------------------------------------------------------------
const LITRG_ABOUT_URL = "https://www.litrg.org.uk/about-us";

export const metadata: Metadata = {
  title: "Receipts: when pressure worked — TaxSorted",
  description:
    "Four verified case studies where citizen and institutional pressure changed a UK tax rule — Making Tax Digital, IR35, the High Income Child Benefit Charge, and the loan charge reviews — with every hedge and source the corpus carries.",
};

export default function ReceiptsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/learn" className="text-sm text-accent hover:text-accent-deep">
        ← Back to Learn
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">
        Receipts: when pressure worked
      </h1>
      <p className="mt-3 text-ink-soft">
        <Link
          href="/learn/gov/your-levers"
          className="font-medium text-accent underline hover:text-accent-deep"
        >
          Your levers
        </Link>{" "}
        maps every official channel for pushing on tax policy. This page is the evidence that
        some of them have actually worked — four verified moments where a UK tax rule changed,
        with who pushed, which lever they used, what changed, and the source for every claim.
      </p>

      <div
        role="note"
        className="mt-6 rounded-2xl border border-line bg-accent-soft p-4 text-sm text-ink sm:p-5"
      >
        <p>
          <strong>These are receipts, not endorsements — the same levers work for any position.</strong>{" "}
          Every case below shows a rule that changed; nothing here says the change was right or
          wrong. The same select committees, professional bodies, media aggregators and
          cross-party groups exist regardless of what you want moved — point them at your own
          evidence.
        </p>
      </div>

      {/* Honest calibration */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Most pressure does not work.</h2>
        <p className="mt-2 text-sm text-ink-soft">
          The routes on Your levers are all real, but most petitions, letters and consultation
          responses change nothing on their own. The four case studies below are the corpus-verified
          exceptions — moments where a tax rule actually moved, with each card flagging honestly
          how strong the who-made-it-happen attribution really is. Read across all four and they
          share three recurring ingredients:{" "}
          <strong>evidence</strong> (a costed burden, a documented broken scenario, a named date,
          not an adjective), an <strong>institutional ally</strong> able to put that evidence in
          front of decision-makers (a select committee, the National Audit Office, a professional
          body, a cross-party group of MPs, a trusted media aggregator), and <strong>timing</strong>{" "}
          (years of sustained pressure, or a moment when the ask happened to line up with what
          government already wanted to do). Four cases is a pattern, not a law — nothing here
          guarantees the same mix will work again. The IR35 case below is the cautionary one: a
          win that rode a political wave rather than administrative evidence, and evaporated
          within 3 weeks once the wave collapsed.
        </p>
      </section>

      {/* Case 1: Making Tax Digital */}
      <section
        data-case="mtd"
        className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6"
      >
        <h2 className="text-lg font-semibold text-ink">
          Making Tax Digital: a decade of forced delays and threshold rewrites
        </h2>
        <dl className="mt-3 space-y-3 text-sm text-ink-soft">
          <div>
            <dt className="font-semibold text-ink">Problem</dt>
            <dd className="mt-1">
              HMRC&apos;s original Making Tax Digital plan aimed to mandate digital record-keeping
              and quarterly updates for very small businesses and landlords — down to £10,000 of
              income — on a fast timetable.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Who moved</dt>
            <dd className="mt-1">
              The House of Lords Economic Affairs Finance Bill Sub-Committee (report in{" "}
              <Cited cite={{ source: MTD_LORDS_2017_URL, effectiveFrom: VERIFIED_ON }}>
                March 2017
              </Cited>
              ) and its parent Economic Affairs Committee (November 2018); the Treasury Select
              Committee and professional and business bodies, named directly in gov.uk&apos;s own{" "}
              <Cited cite={{ source: MTD_2017_DEFERRAL_URL, effectiveFrom: VERIFIED_ON }}>
                13 July 2017 deferral announcement
              </Cited>
              ;{" "}
              <Cited cite={{ source: MTD_2021_DELAY_URL, effectiveFrom: VERIFIED_ON }}>
                &ldquo;stakeholder feedback&rdquo;, credited without names in the 23 September
                2021 delay
              </Cited>
              ; and the independent National Audit Office and Public Accounts Committee (2023).
              Ahead of the December 2022 threshold rewrite, professional bodies (CIOT, ATT,
              ICAEW) and the FSB were among those publicly arguing for delay — but that
              attribution is the research corpus&apos;s analysis, not the government&apos;s
              record:{" "}
              <Cited
                cite={{
                  source: MTD_2022_THRESHOLD_URL,
                  effectiveFrom: VERIFIED_ON,
                  note: "Re-fetched 2026-07-06: the page quotes only Victoria Atkins (FST) and Jim Harra (HMRC CEO); no professional body, business group or committee is named or credited on it.",
                }}
              >
                the 19 December 2022 announcement itself credits no one by name, citing only the
                &ldquo;challenging economic environment&rdquo; facing the self-employed and
                landlords and the scale of the change
              </Cited>
              .
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Lever used</dt>
            <dd className="mt-1">
              Committee reports, independent value-for-money scrutiny (NAO/PAC), and professional-body
              consultation responses — evidence of cost and unreadiness. The corpus&apos;s own
              reading: no petition or letter-writing campaign appears in any of the
              government&apos;s own accounts of why it changed course.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Outcome</dt>
            <dd className="mt-1">
              MTD was delayed or reshaped at least four times (2017, 2021, 2022 and the 2023
              design review): in 2017, mandatory digital records were deferred to VAT-only from
              2019 (other taxes &ldquo;not before 2020&rdquo;); in 2021, the ITSA start date moved
              to April 2024; in{" "}
              <Cited cite={{ source: MTD_2022_THRESHOLD_URL, effectiveFrom: VERIFIED_ON }}>
                December 2022
              </Cited>
              , the planned £10,000 threshold was abandoned for phased mandation at £50,000 (2026)
              and £30,000 (2027), with a review launched for under-£30,000;{" "}
              <Cited
                cite={{
                  source: MTD_NAO_URL,
                  effectiveFrom: VERIFIED_ON,
                  note: "NAO 'Progress with Making Tax Digital', 12 Jun 2023 — informed the November 2023 PAC report and the concurrent Small Business Review.",
                }}
              >
                NAO and PAC scrutiny in 2023
              </Cited>{" "}
              fed into the{" "}
              <Cited cite={{ source: MTD_2023_OUTCOME_URL, effectiveFrom: VERIFIED_ON }}>
                Autumn Statement 2023 Small Business Review
              </Cited>
              , which kept under-£30,000 mandation under review and simplified the design (removed
              the End of Period Statement, simplified jointly-owned property updates). Honest
              caveat, from the corpus itself: wins aren&apos;t permanent —{" "}
              <Cited cite={{ source: MTD_2025_REVERSAL_URL, effectiveFrom: VERIFIED_ON }}>
                Spring Statement 2025 partly reversed course, adding a £20,000 threshold from April
                2028
              </Cited>
              , mandating roughly 970,000 more people.
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={MTD_LORDS_2017_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Lords Finance Bill Sub-Committee, March 2017
          </a>
          ,{" "}
          <a href={MTD_2017_DEFERRAL_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk, 13 Jul 2017
          </a>
          ,{" "}
          <a href={MTD_2021_DELAY_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk, 23 Sep 2021
          </a>
          ,{" "}
          <a href={MTD_2022_THRESHOLD_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk, 19 Dec 2022
          </a>
          ,{" "}
          <a href={MTD_NAO_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            NAO, Progress with Making Tax Digital
          </a>
          ,{" "}
          <a href={MTD_2023_OUTCOME_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk, Small Business Review outcome
          </a>
          ,{" "}
          <a href={MTD_2025_REVERSAL_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk, Spring Statement 2025
          </a>
          .
        </p>
      </section>

      {/* Case 2: IR35 */}
      <section
        data-case="ir35"
        className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6"
      >
        <h2 className="text-lg font-semibold text-ink">
          IR35 / off-payroll working: the 2022 double U-turn
        </h2>
        <dl className="mt-3 space-y-3 text-sm text-ink-soft">
          <div>
            <dt className="font-semibold text-ink">Problem</dt>
            <dd className="mt-1">
              The 2017 and 2021 off-payroll working (IR35) reforms, long opposed by contractor
              bodies including IPSE and the Stop the Off-Payroll Tax campaign.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Who moved</dt>
            <dd className="mt-1">
              The Chancellor (Kwasi Kwarteng), in the{" "}
              <Cited cite={{ source: IR35_GROWTH_PLAN_URL, effectiveFrom: VERIFIED_ON }}>
                23 September 2022 &ldquo;Growth Plan&rdquo;
              </Cited>
              , announced repeal of both reforms from April 2023. Contractor bodies had lobbied for
              years — but the corpus flags this attribution as{" "}
              <strong>LOW-MEDIUM confidence</strong>: the primary sources on record document only
              the decisions themselves, not their cause.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Lever used</dt>
            <dd className="mt-1">
              Not committee evidence or a consultation response — the repeal arrived because it
              fitted a new government&apos;s wider tax-cutting programme. It evaporated only three
              weeks later when gilt markets destroyed that same programme, forcing a new
              Chancellor&apos;s emergency reversal.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Outcome</dt>
            <dd className="mt-1">
              Repeal announced 23 September 2022; reversed on{" "}
              <Cited cite={{ source: IR35_REVERSAL_URL, effectiveFrom: VERIFIED_ON }}>
                17 October 2022
              </Cited>{" "}
              — gov.uk&apos;s own wording: &ldquo;Repealing the 2017 and 2021 reforms to the
              off-payroll working rules (also known as IR35) from April 2023. The reforms will now
              remain in place.&rdquo; A win that lasted <strong>3 weeks</strong> before it
              evaporated. The corpus&apos;s own lesson: policy wins that ride a political wave die
              with the wave; wins built on administrative evidence — like the MTD and loan charge
              cases here — stick better.
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={IR35_GROWTH_PLAN_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk, The Growth Plan 2022
          </a>
          ,{" "}
          <a href={IR35_REVERSAL_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk, 17 Oct 2022 reversal
          </a>
          .
        </p>
      </section>

      {/* Case 3: HICBC */}
      <section
        data-case="hicbc"
        className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6"
      >
        <h2 className="text-lg font-semibold text-ink">
          Child Benefit HICBC threshold, Spring Budget 2024 — a media-led win
        </h2>
        <dl className="mt-3 space-y-3 text-sm text-ink-soft">
          <div>
            <dt className="font-semibold text-ink">Problem</dt>
            <dd className="mt-1">
              The High Income Child Benefit Charge threshold had been frozen at £50,000 since
              2013, pulling in more families every year as wages rose.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Who moved</dt>
            <dd className="mt-1">
              Martin Lewis and MoneySavingExpert, via a campaign built from mass reader messages,
              an MSE evidence report on the impact on single parents and carers, an open letter to
              the Chancellor (January 2024), and sustained on-air interview pressure.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Lever used</dt>
            <dd className="mt-1">
              A trusted mass-media aggregator converting thousands of individual reader stories
              into one evidenced ask, timed to land before a Budget.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Outcome</dt>
            <dd className="mt-1">
              <Cited cite={{ source: HICBC_POLICY_PAPER_URL, effectiveFrom: VERIFIED_ON }}>
                Spring Budget 2024 (6 March) raised the threshold from £50,000 to £60,000 and
                halved the taper, so the charge is 1% per £200 over £60,000, with full clawback
                only at £80,000
              </Cited>{" "}
              — taking around 170,000 families out of the charge.{" "}
              <Cited
                cite={{
                  source: HICBC_MSE_URL,
                  effectiveFrom: VERIFIED_ON,
                  note: "Martin Lewis, MoneySavingExpert, 6 Mar 2024 — self-reported crediting, MEDIUM confidence.",
                }}
              >
                Lewis reported the Chancellor telling him the change was &ldquo;due in large [part]
                to MSE/my shows campaigning&rdquo;
              </Cited>{" "}
              — a self-reported claim, so treat that specific crediting as{" "}
              <strong>MEDIUM confidence</strong>, even though the threshold change itself is a
              confirmed primary-source fact.
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={HICBC_POLICY_PAPER_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk, HICBC threshold policy paper
          </a>
          ,{" "}
          <a href={HICBC_MSE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            MoneySavingExpert, 6 Mar 2024
          </a>
          .
        </p>
      </section>

      {/* Case 4: Loan charge */}
      <section
        data-case="loan-charge"
        className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6"
      >
        <h2 className="text-lg font-semibold text-ink">
          The loan charge — two independent reviews forced by parliamentary pressure
        </h2>
        <dl className="mt-3 space-y-3 text-sm text-ink-soft">
          <div>
            <dt className="font-semibold text-ink">Problem</dt>
            <dd className="mt-1">
              The 2019 loan charge applied retrospectively to disguised-remuneration loan schemes —
              widely criticised by affected taxpayers and MPs as harsh and retrospective.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Who moved</dt>
            <dd className="mt-1">
              The Loan Charge APPG — a cross-party group whose own site records{" "}
              <Cited cite={{ source: LOAN_CHARGE_APPG_URL, effectiveFrom: VERIFIED_ON }}>
                over 150 parliamentarians signing a letter to the Prime Minister and Chancellor
              </Cited>
              , plus its own inquiry reports (April and November 2019) and evidence calls to
              affected individuals. Hedge, stated plainly by the APPG itself: it &ldquo;is staffed
              and funded by the Loan Charge Action Group&rdquo; — the corpus rates this{" "}
              <strong>MEDIUM confidence</strong> on how much weight the APPG&apos;s framing should
              carry, though <strong>HIGH confidence</strong> that it exists and did these things.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Lever used</dt>
            <dd className="mt-1">
              A decade of backbench pressure — APPG letters, Finance Bill amendments, Westminster
              Hall debates — plus affected-person evidence, converging on commissioned independent
              reviews: the strongest instrument short of litigation.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Outcome</dt>
            <dd className="mt-1">
              Round 1: the{" "}
              <Cited cite={{ source: LOAN_CHARGE_MORSE_URL, effectiveFrom: VERIFIED_ON }}>
                Morse review, commissioned September 2019 and reported December 2019
              </Cited>{" "}
              — the government accepted 19 recommendations, and{" "}
              <Cited cite={{ source: LOAN_CHARGE_MORSE_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
                the charge now applies only to loans made on or after 9 December 2010, excludes
                loans before 6 April 2016 where the scheme was reasonably disclosed, and offers a
                3-year spreading option plus refunds of voluntary restitution
              </Cited>
              . Round 2: the{" "}
              <Cited
                cite={{
                  source: LOAN_CHARGE_MCCANN_URL,
                  effectiveFrom: VERIFIED_ON,
                  note: "McCann review, announced 23 Jan 2025, final report published 26 Nov 2025 (Budget 2025). Outcome figures are search-snippet-verified — MEDIUM confidence.",
                }}
              >
                McCann review (announced January 2025, final report 26 November 2025) called the
                charge &ldquo;extraordinary&rdquo; and &ldquo;undoubtedly harsh&rdquo;; the
                government accepted all but one recommendation, adding a £5,000 write-off per
                individual and a new settlement opportunity for around 32,000 people with
                reductions of up to £70,000
              </Cited>
              — those exact figures carry <strong>MEDIUM confidence</strong> (search-result
              verified, not a direct fetch). Honest caveat: it took about 6 years and two reviews,
              and campaigners still dispute parts of the outcome.
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={LOAN_CHARGE_MORSE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk, Morse review
          </a>
          ,{" "}
          <a href={LOAN_CHARGE_MORSE_GUIDANCE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk, Morse review guidance
          </a>
          ,{" "}
          <a href={LOAN_CHARGE_APPG_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Loan Charge APPG
          </a>
          ,{" "}
          <a href={LOAN_CHARGE_MCCANN_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk, McCann review
          </a>
          .
        </p>
      </section>

      {/* LITRG highlight */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          LITRG — the body that exists for the unrepresented
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited
            cite={{
              source: LITRG_ABOUT_URL,
              effectiveFrom: VERIFIED_ON,
              note: "litrg.org.uk is Cloudflare-challenged; verified via Wayback Machine snapshot 2026-07-06 — MEDIUM confidence the page content is current.",
            }}
          >
            The Low Incomes Tax Reform Group (LITRG) — &ldquo;an initiative of the Chartered
            Institute of Taxation&rdquo; — has worked &ldquo;since 1998... to improve the policy
            and processes of the tax, tax credits and associated welfare systems for the benefit
            of people on low incomes.&rdquo; It exists explicitly for the{" "}
            <strong>unrepresented</strong>: it aims to &ldquo;target for help and information those
            least able in the community to afford to pay for advice&rdquo;, and sits &ldquo;on
            numerous tax and benefit consultative groups... putting forward the perspective of
            those who cannot afford to pay for advice.&rdquo;
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          LITRG is not part of HMRC and cannot access your records or advise you individually — but{" "}
          <Cited cite={{ source: LITRG_ABOUT_URL, effectiveFrom: VERIFIED_ON }}>
            it explicitly encourages people to &ldquo;feed to us their day-to-day experiences of
            the tax and related benefit systems&rdquo;
          </Cited>{" "}
          and turns those anecdotes into consultation evidence — the same kind of evidence that
          moved the cases above. If you don&apos;t have an agent or professional body of your own,
          this is the door built for you: read their guidance at{" "}
          <a
            href={LITRG_ABOUT_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            litrg.org.uk
          </a>{" "}
          and email them your own concrete experience via their contact page.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Source:{" "}
          <a
            href={LITRG_ABOUT_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            LITRG — About us
          </a>
          .
        </p>
      </section>

      {/* Wrong-door box */}
      <section className="mt-8 rounded-2xl border border-line bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Is this actually about your own tax bill?</h2>
        <p className="mt-2 text-sm text-ink">
          Everything on this page is about rules that changed for everyone. If your problem is an{" "}
          <strong>individual dispute</strong> — your own bill, PAYE code, penalty or return —
          none of the levers above will fix it; they influence policy, not your case.
        </p>
        <p className="mt-3 text-sm text-ink">
          <Link
            href="/learn/gov/who-runs-your-taxes"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Who runs your taxes
          </Link>{" "}
          covers who to actually contact and the complaints ladder built for exactly that.
        </p>
      </section>
    </div>
  );
}
