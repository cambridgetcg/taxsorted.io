import type { Metadata } from "next";
import Link from "next/link";
import { Cited } from "@/components/prep/cited";

// i18n: deferred to M2 — plain English for launch

// Fact source: regs/research/gov/lawmaking.md (fetched/verified 2026-07-06),
// plus two corpus sibling files used per the plan: treasury.md (the NICs
// quote and its citation, the XST role page URL treasury.md itself verifies)
// and gaps.md (the devolution links, live-checked the same day). No source
// outside regs/research/gov/ was used. A claim not in that corpus does not
// appear on this page.
//
// Re-verification pass 2026-07-06 (review fixes): the corpus's
// MEDIUM-confidence parliament.uk-family claims were re-checked before this
// page states them flat — FA2025-26 stage dates verified live (tax.org.uk);
// the Lords FBSC remit + its 2025 evidence window verified live
// (committees-api.parliament.uk); the PBC written-evidence route verified
// against the 4 Aug 2025 archived copy of the parliament.uk page (email +
// the department-evidence-doesn't-count rule confirmed verbatim; the old
// Word-doc/3,000-word/last-sitting details were NOT on that page and are
// not stated here); the OTS amendment verified against the archived
// Treasury Committee report (amendments TABLED confirmed; "rejected" could
// not be verified, so the copy says the abolition was enacted regardless).
// SI 2026/336's negative procedure verified from its Explanatory
// Memorandum, para 12.1. The same upgrades are recorded in
// regs/research/gov/lawmaking.md so corpus and page agree.
const VERIFIED_ON = "2026-07-06";

const TAX_POLICY_PRINCIPLES_URL =
  "https://www.gov.uk/government/publications/tax-policy-making-principles/tax-policy-making-principles";
const BUDGET_2025_URL = "https://www.gov.uk/government/topical-events/budget-2025";
const OBR_FORECAST_DUTY_URL = "https://www.legislation.gov.uk/ukpga/2011/4/section/4";
const OOTLAR_URL =
  "https://www.gov.uk/government/publications/budget-2025-overview-of-tax-legislation-and-rates-ootlar/budget-2025-overview-of-tax-legislation-and-rates-ootlar";
const WAYS_AND_MEANS_URL =
  "https://www.hansardsociety.org.uk/publications/guides/how-do-mps-approve-the-budget";
const PCTA_1968_URL = "https://www.legislation.gov.uk/ukpga/1968/2/section/1";
const BILL_STAGES_URL =
  "https://www.gov.uk/guidance/legislative-process-taking-a-bill-through-parliament";
const PBC_WRITTEN_EVIDENCE_URL =
  "https://www.parliament.uk/mps-lords-and-offices/offices/commons/scrutinyunit/written-submissions/";
const PARLIAMENT_ACT_1911_URL =
  "https://www.legislation.gov.uk/ukpga/Geo5/1-2/13/section/1";
const LORDS_FBSC_URL = "https://committees.parliament.uk/committee/230/finance-bill-subcommittee/";
const FINANCE_ACT_2026_URL = "https://www.legislation.gov.uk/ukpga/2026/11/introduction/enacted";
const SI_SCRUTINY_EXPLAINER_URL =
  "https://www.instituteforgovernment.org.uk/explainer/secondary-legislation-scrutiny";
const SI_2026_336_MADE_URL = "https://www.legislation.gov.uk/uksi/2026/336/introduction/made";
const SI_2026_336_NOTE_URL = "https://www.legislation.gov.uk/uksi/2026/336/note/made";
// Explanatory Memorandum, para 12.1: "the instrument is subject to negative
// procedure" — the definitive statement of the procedure (verified from the
// EM PDF 2026-07-06).
const SI_2026_336_EM_URL = "https://www.legislation.gov.uk/uksi/2026/336/memorandum";
// CIOT's Finance Bill 2025-26 tracker — re-verified live 2026-07-06 (HTTP
// 200); source of the intermediate Commons stage dates.
const CIOT_FB_2025_26_URL = "https://www.tax.org.uk/finance-bill-2025-26";
// Treasury Committee report "Tax Simplification" (HC 1425) — content
// verified 2026-07-06 via the archived copy (report text is immutable once
// published); source for the tabled report-stage amendments.
const TSC_TAX_SIMPLIFICATION_REPORT_URL =
  "https://publications.parliament.uk/pa/cm5803/cmselect/cmtreasy/1425/report.html";
const L_DAY_COLLECTION_URL = "https://www.gov.uk/government/collections/finance-bill-2025-26";
const OLD_CONSULTATION_FRAMEWORK_URL =
  "https://www.gov.uk/government/publications/tax-consultation-framework";
const CONSULTATION_HUB_URL = "https://www.gov.uk/search/policy-papers-and-consultations";
const OTS_ORG_URL = "https://www.gov.uk/government/organisations/office-of-tax-simplification";
const OTS_ABOLITION_URL =
  "https://www.legislation.gov.uk/ukpga/2023/30/part/7/crossheading/office-of-tax-simplification";
const MTD_2016_CONSULTATION_URL =
  "https://www.gov.uk/government/consultations/making-tax-digital-bringing-business-tax-into-the-digital-age";
const MTD_PRIMARY_LEGISLATION_URL = "https://www.legislation.gov.uk/ukpga/2017/32/section/60";
const SI_2021_1076_URL = "https://www.legislation.gov.uk/uksi/2021/1076/introduction/made";
const MTD_2022_DELAY_URL =
  "https://www.gov.uk/government/news/government-announces-phased-mandation-of-making-tax-digital-for-itsa";
const SI_2024_167_NOTE_URL = "https://www.legislation.gov.uk/uksi/2024/167/note/made";
const MTD_2025_MODERNISING_URL =
  "https://www.gov.uk/government/publications/modernising-the-tax-system-through-making-tax-digital";
const MTD_ELIGIBILITY_GUIDANCE_URL =
  "https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax";
const XST_ROLE_PAGE_URL =
  "https://www.gov.uk/government/ministers/exchequer-secretary-to-the-treasury";
const SCOTTISH_INCOME_TAX_URL = "https://www.gov.uk/scottish-income-tax";
const WELSH_INCOME_TAX_URL = "https://www.gov.uk/welsh-income-tax";

export const metadata: Metadata = {
  title: "How a tax law is born — TaxSorted",
  description:
    "The real pipeline from Budget speech to Finance Act, where most tax detail actually lives, and the 11-year story of Making Tax Digital — every fact cited to its source.",
};

export default function HowTaxLawIsMadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/learn" className="text-sm text-accent hover:text-accent-deep">
        ← Back to Learn
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">
        How a tax law is born
      </h1>
      <p className="mt-3 text-ink-soft">
        Budget headlines make it sound like tax changes happen the moment the Chancellor sits
        down. Sometimes they do — weeks before Parliament has actually passed anything. Here&apos;s
        the real pipeline, from the Budget box to the law on the books, with every step cited to
        the legislation, guidance or committee record it came from.
      </p>

      <div role="note" className="mt-6 rounded-2xl border border-line bg-accent-soft p-4 text-sm text-ink sm:p-5">
        <p>
          <strong>Mechanism, not opinion.</strong> This page describes how UK tax law is actually
          made — the process, not a verdict on whether any particular tax or government is right.
          Every fact links to its official source so you can check it yourself. Where a source
          documents a problem with the process (a committee finding, a tabled amendment),
          that&apos;s reported as a sourced fact, not an editorial line.
        </p>
      </div>

      {/* 1. One fiscal event, on purpose */}
      <section className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">One fiscal event, on purpose</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: TAX_POLICY_PRINCIPLES_URL, effectiveFrom: VERIFIED_ON }}>
            Since June 2025, government policy has been a single major fiscal event a year: tax
            measures announced at the annual Budget are legislated for in one annual Finance Bill
            (or another appropriate vehicle).
          </Cited>{" "}
          The last one, Budget 2025, was delivered on{" "}
          <Cited cite={{ source: BUDGET_2025_URL, effectiveFrom: VERIFIED_ON }}>
            26 November 2025
          </Cited>
          . HMRC published its technical companion, the &ldquo;Overview of Tax Legislation and
          Rates&rdquo; (OOTLAR), the same day — it lists every measure going into the Finance
          Bill, and separately, every announcement that isn&apos;t.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: OBR_FORECAST_DUTY_URL, effectiveFrom: VERIFIED_ON }}>
            A spring event still happens even with one Budget a year, because the Office for
            Budget Responsibility has a statutory duty to forecast the public finances at least
            twice every financial year.
          </Cited>{" "}
          The spring event is a forecast, not a mini-Budget: no new tax policy is supposed to be
          announced there.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={OOTLAR_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Budget 2025 OOTLAR
          </a>
          ,{" "}
          <a href={OBR_FORECAST_DUTY_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Budget Responsibility and National Audit Act 2011, s.4(3)
          </a>
          .
        </p>
      </section>

      {/* 2. Budget day: Ways and Means, and the surprise */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Budget day: Ways and Means, and the surprise</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: WAYS_AND_MEANS_URL, effectiveFrom: VERIFIED_ON }}>
            After the Chancellor&apos;s speech, the Commons debates the Budget for a few days,
            then votes &ldquo;Ways and Means resolutions&rdquo; — one per measure, sometimes as
            many as 80 or more. Only the first is properly debated; the rest are put to the House
            without debate.
          </Cited>
        </p>
        <div className="mt-4 rounded-xl border border-line bg-accent-soft p-4 text-sm text-ink">
          <p>
            <strong>The surprise:</strong> the Provisional Collection of Taxes Act 1968 does this
            through two separate doors.{" "}
            <Cited cite={{ source: WAYS_AND_MEANS_URL, effectiveFrom: VERIFIED_ON }}>
              Under section 5, a motion can give a change to an existing tax immediate effect
              from Budget day itself — from 6pm that evening for duties.
            </Cited>{" "}
            <Cited
              cite={{
                source: PCTA_1968_URL,
                si: "Provisional Collection of Taxes Act 1968, s.1",
                effectiveFrom: VERIFIED_ON,
              }}
            >
              Under section 1, a resolution declared &ldquo;expedient in the public
              interest&rdquo; has temporary statutory force as if it were already an Act of
              Parliament. In plain terms: for an existing tax, you can start paying before the
              law exists, months before the Finance Bill has passed.
            </Cited>{" "}
            The section 1 route is a 7-month IOU: the resolution lapses unless the Finance Bill
            gets a second reading within 30 sitting days, and it expires in any case 7 months
            after it takes effect. If the Bill stalls, the change legally evaporates and HMRC
            would have to repay it. This only works for taxes that already exist — a brand new
            tax needs the Finance Act itself before anyone can be made to pay it.
          </p>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Source:{" "}
          <a href={PCTA_1968_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Provisional Collection of Taxes Act 1968, section 1
          </a>
          .
        </p>
      </section>

      {/* 3. The Finance Bill's journey */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">The Finance Bill&apos;s journey through Parliament</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: BILL_STAGES_URL, effectiveFrom: VERIFIED_ON }}>
            Every bill follows the same shape: first reading (formal), second reading (debate on
            the principle), committee (line-by-line), report stage (amendments), third reading,
            then the other House, then Royal Assent. Bills mainly about taxation — the Finance
            Bill is the standing example — must start in the Commons.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          The Finance Bill&apos;s committee stage is split: the politically biggest clauses are
          debated by the whole House of Commons (&ldquo;Committee of the Whole House&rdquo;); the
          rest go to a small Public Bill Committee (PBC) of MPs.{" "}
          <Cited
            cite={{
              source: PBC_WRITTEN_EVIDENCE_URL,
              effectiveFrom: VERIFIED_ON,
              note: "parliament.uk blocks automated fetching; this route was verified against the 4 August 2025 archived copy of the page. Check the live page for current submission guidelines before submitting.",
            }}
          >
            Anyone can submit written evidence to a Public Bill Committee — email it to{" "}
            scrutiny@parliament.uk. Submissions are accepted once the bill has had its second
            reading, and Parliament&apos;s guidance says the sooner the better. Evidence sent to
            the government department in charge of the bill instead — for a Finance Bill, the
            Treasury — is not treated as evidence to the committee.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          For Finance Bill 2025-26:{" "}
          <Cited cite={{ source: CIOT_FB_2025_26_URL, effectiveFrom: VERIFIED_ON }}>
            second reading 16 December 2025, Committee of the Whole House 12–13 January 2026,
            Public Bill Committee sittings 27 January–3 February 2026, report stage and third
            reading 11 March 2026
          </Cited>{" "}
          — and{" "}
          <Cited cite={{ source: FINANCE_ACT_2026_URL, effectiveFrom: VERIFIED_ON }}>
            Royal Assent, becoming Finance Act 2026, on 18 March 2026
          </Cited>
          . Budget to Act: under four months.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={BILL_STAGES_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Cabinet Office: taking a bill through Parliament
          </a>
          ,{" "}
          <a href={CIOT_FB_2025_26_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            CIOT: Finance Bill 2025-26
          </a>
          ,{" "}
          <a href={FINANCE_ACT_2026_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Finance Act 2026
          </a>
          .
        </p>
      </section>

      {/* 4. The Lords: money bills and a different kind of say */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">The Lords can&apos;t block it — so where&apos;s their say?</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited
            cite={{
              source: PARLIAMENT_ACT_1911_URL,
              si: "Parliament Act 1911, s.1",
              effectiveFrom: VERIFIED_ON,
            }}
          >
            The annual Finance Bill is normally certified by the Speaker as a &ldquo;money
            bill&rdquo;. Under the Parliament Act 1911, if the Lords don&apos;t pass a money bill
            unamended within one month, it goes for Royal Assent without their consent — so the
            Lords cannot block or amend tax rates.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Their real influence sits earlier and is technical, not political:{" "}
          <Cited cite={{ source: LORDS_FBSC_URL, effectiveFrom: VERIFIED_ON }}>
            the House of Lords Economic Affairs Committee&apos;s Finance Bill Sub-Committee
            examines the <em>draft</em> Finance Bill each autumn for technical issues of tax
            administration, clarification and simplification — explicitly not rates or who pays
            what.
          </Cited>{" "}
          <Cited
            cite={{
              source: LORDS_FBSC_URL,
              effectiveFrom: VERIFIED_ON,
              note: "Inquiry opening and written-evidence window verified 2026-07-06 via Parliament's committees API (committee id 230, inquiry 'Draft Finance Bill 2025–26').",
            }}
          >
            For Finance Bill 2025-26 it opened its inquiry on 17 September 2025 and took written
            evidence until 7 October 2025
          </Cited>
          , against draft clauses published on 21 July 2025.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={PARLIAMENT_ACT_1911_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Parliament Act 1911, section 1
          </a>
          ,{" "}
          <a href={LORDS_FBSC_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Lords Finance Bill Sub-Committee
          </a>
          .
        </p>
      </section>

      {/* 5. Statutory instruments */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Where most tax detail actually lives: statutory instruments</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: SI_SCRUTINY_EXPLAINER_URL, effectiveFrom: VERIFIED_ON }}>
            Most operational tax law — Making Tax Digital&apos;s mechanics, threshold detail,
            admin rules — is made by statutory instrument (SI) under powers an Act delegates to
            ministers or HMRC Commissioners. Parliament only supervises, and SIs can&apos;t be
            amended: it&apos;s take-it-or-leave-it.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: SI_SCRUTINY_EXPLAINER_URL, effectiveFrom: VERIFIED_ON }}>
            About three-quarters of SIs use the &ldquo;negative procedure&rdquo;: the SI is made
            and laid before Parliament, and simply becomes law unless a motion to annul it
            (a &ldquo;prayer&rdquo;) succeeds within about 40 days. In practice that almost never
            happens — the Commons last annulled an SI in 1979, and the Lords last rejected one in
            2000. The rest use the &ldquo;affirmative procedure&rdquo;, needing an active vote,
            usually in a small Delegated Legislation Committee with no chamber debate.
          </Cited>{" "}
          Tax SIs are usually laid before the House of Commons only, under financial privilege.
        </p>
        <div className="mt-4 rounded-xl border border-line bg-accent-soft p-4 text-sm text-ink">
          <p>
            <strong>Worked example:</strong>{" "}
            <Cited
              cite={{
                source: SI_2026_336_MADE_URL,
                si: "SI 2026/336",
                effectiveFrom: VERIFIED_ON,
              }}
            >
              The Income Tax (Digital Obligations) Regulations 2026 (SI 2026/336) — the
              regulations that actually set the Making Tax Digital thresholds — were made by
              &ldquo;the Commissioners for His Majesty&apos;s Revenue and Customs&rdquo; on 23
              March 2026, laid before the House of Commons only on 24 March 2026, and came into
              force on 1 April 2026.
            </Cited>{" "}
            <Cited
              cite={{
                source: SI_2026_336_EM_URL,
                si: "SI 2026/336 Explanatory Memorandum, para 12.1",
                effectiveFrom: VERIFIED_ON,
              }}
            >
              Its Explanatory Memorandum states that &ldquo;the instrument is subject to negative
              procedure&rdquo; — so it became law without any vote. No MP ever voted on the
              £50,000/£30,000/£20,000 thresholds directly.
            </Cited>
          </p>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={SI_SCRUTINY_EXPLAINER_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Institute for Government: secondary legislation scrutiny
          </a>
          ,{" "}
          <a href={SI_2026_336_MADE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            SI 2026/336, as made
          </a>
          ,{" "}
          <a href={SI_2026_336_EM_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            SI 2026/336 Explanatory Memorandum
          </a>
          .
        </p>
      </section>

      {/* 6. L-day and consultations */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">L-day and consultations</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: L_DAY_COLLECTION_URL, effectiveFrom: VERIFIED_ON }}>
            Each summer, on &ldquo;Legislation day&rdquo; (L-day), draft Finance Bill clauses are
            published for technical consultation — each measure with its own explanatory note and
            draft legislation. For Finance Bill 2025-26 that was 21 July 2025, with comments
            closing 15 September 2025.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: TAX_POLICY_PRINCIPLES_URL, effectiveFrom: VERIFIED_ON }}>
            The current framework — HM Treasury&apos;s &ldquo;Tax Policy Making Principles&rdquo;,
            published 12 June 2025 — replaced a 2011 framework withdrawn on 1 October 2025. It
            commits to predictability via the single fiscal event, &ldquo;smart and agile&rdquo;
            consultation spread through the year rather than fixed stages, and transparency about
            rationale and impact.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Anyone can respond to any open consultation — individual sole traders and landlords are
          read, and professional bodies like CIOT and LITRG also feed in views. Find live
          consultations on the{" "}
          <a href={CONSULTATION_HUB_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            gov.uk consultations hub
          </a>
          , filtered to HM Revenue &amp; Customs or HM Treasury. The old five-stage framework is
          now history:{" "}
          <a href={OLD_CONSULTATION_FRAMEWORK_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            withdrawn 1 October 2025
          </a>
          .
        </p>
      </section>

      {/* 7. OTS abolition scrutiny gap */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What happened to simplification scrutiny</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: OTS_ORG_URL, effectiveFrom: VERIFIED_ON }}>
            The Office of Tax Simplification was a statutory independent adviser tasked with
            making things easier for taxpayers. Its closure was announced 23 September 2022.
          </Cited>{" "}
          <Cited
            cite={{
              source: OTS_ABOLITION_URL,
              si: "Finance (No. 2) Act 2023, s.347",
              effectiveFrom: VERIFIED_ON,
            }}
          >
            It was formally abolished by section 347 of the Finance (No. 2) Act 2023, which says
            simply: &ldquo;The Office of Tax Simplification is abolished.&rdquo;
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          What replaced it was a mandate to HM Treasury and HMRC officials to build
          simplification into normal policy work — simplification lost its independent
          institutional champion.{" "}
          <Cited
            cite={{
              source: TSC_TAX_SIMPLIFICATION_REPORT_URL,
              effectiveFrom: VERIFIED_ON,
              note: "Treasury Committee report 'Tax Simplification' (HC 1425); the tabled amendments are paragraph 24. Report content verified 2026-07-06 via the archived copy — parliament.uk blocks automated fetching.",
            }}
          >
            Treasury Committee members tabled report-stage amendments to the abolition Bill —
            one to remove the abolition clause, and another (New Clause 2) that would have
            required the Treasury to report annually to the Committee on steps taken to simplify
            the tax system.
          </Cited>{" "}
          The abolition was enacted regardless, and no such reporting duty appears in the Act.
          Scrutiny of simplification now lives, in practice, with the Commons Treasury
          Committee&apos;s inquiries and the Lords Finance Bill Sub-Committee&apos;s technical
          review of each draft Bill.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={OTS_ABOLITION_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Finance (No. 2) Act 2023, section 347
          </a>
          ,{" "}
          <a href={TSC_TAX_SIMPLIFICATION_REPORT_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Treasury Committee: Tax Simplification (HC 1425)
          </a>
          .
        </p>
      </section>

      {/* 8. MTD 11-year timeline */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Eleven years, one law: the Making Tax Digital timeline</h2>
        <p className="mt-2 text-sm text-ink-soft">
          This is the single best worked example — it touches every part of the machine above:
          announcement, consultation, primary legislation, SIs made, amended, revoked and remade,
          and guidance. Budget material from spring 2015 first talked about &ldquo;the end of the
          tax return&rdquo;, but the first milestone we can verify against a live source today is
          the 2016 consultation below.
        </p>
        <ol className="mt-4 space-y-4 text-sm text-ink-soft">
          <li className="flex gap-3">
            <span className="font-semibold text-accent">1.</span>
            <span>
              <strong>15 Aug – 7 Nov 2016 —</strong> HMRC consultation &ldquo;Making Tax Digital:
              Bringing business tax into the digital age&rdquo;.{" "}
              <Cited cite={{ source: MTD_2016_CONSULTATION_URL, effectiveFrom: VERIFIED_ON }}>
                The response, published 31 January 2017, said respondents &ldquo;overwhelmingly
                support the move to a digital tax system&rdquo;, and conceded keeping spreadsheets
                (paired with software) and free software for the smallest businesses.
              </Cited>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-accent">2.</span>
            <span>
              <strong>16 Nov 2017 —</strong>{" "}
              <Cited
                cite={{
                  source: MTD_PRIMARY_LEGISLATION_URL,
                  si: "Finance (No. 2) Act 2017, s.60",
                  effectiveFrom: VERIFIED_ON,
                }}
              >
                Primary legislation: section 60 of the Finance (No. 2) Act 2017 inserts the power
                into the Taxes Management Act 1970 for HMRC to require digital records and
                quarterly updates by regulations, with digital-exclusion exemptions.
              </Cited>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-accent">3.</span>
            <span>
              <strong>23 Sep 2021 —</strong>{" "}
              <Cited
                cite={{ source: SI_2021_1076_URL, si: "SI 2021/1076", effectiveFrom: VERIFIED_ON }}
              >
                The first regulations, SI 2021/1076, made by HMRC Commissioners, due in force 6
                April 2024.
              </Cited>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-accent">4.</span>
            <span>
              <strong>19 Dec 2022 —</strong>{" "}
              <Cited cite={{ source: MTD_2022_DELAY_URL, effectiveFrom: VERIFIED_ON }}>
                The big delay, announced by ministerial statement and press release — not
                legislation: phased mandation, April 2026 for qualifying income over £50,000,
                April 2027 for £30,000–£50,000, with a review of under-£30,000.
              </Cited>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-accent">5.</span>
            <span>
              <strong>2024 —</strong>{" "}
              <Cited
                cite={{
                  source: SI_2024_167_NOTE_URL,
                  si: "SI 2024/167",
                  effectiveFrom: VERIFIED_ON,
                }}
              >
                An amending SI, 2024/167, changes the commencement date, postpones digital start
                dates, raises exemption thresholds and drops the End of Period Statement
                requirement.
              </Cited>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-accent">6.</span>
            <span>
              <strong>26 Mar 2025 —</strong>{" "}
              <Cited cite={{ source: MTD_2025_MODERNISING_URL, effectiveFrom: VERIFIED_ON }}>
                Spring Statement policy paper &ldquo;Modernising the tax system through Making Tax
                Digital&rdquo; expands the mandate to qualifying income over £20,000 from April
                2028.
              </Cited>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-accent">7.</span>
            <span>
              <strong>26 Nov 2025 —</strong> Budget 2025 / Finance Bill 2025-26: OOTLAR confirms
              legislation that clarifies MTD&apos;s scope and gives HMRC new exemption-making
              powers, ahead of the April 2026 go-live; Finance Act 2026 receives Royal Assent 18
              March 2026.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-accent">8.</span>
            <span>
              <strong>23 Mar 2026 —</strong>{" "}
              <Cited
                cite={{
                  source: SI_2026_336_NOTE_URL,
                  si: "SI 2026/336",
                  effectiveFrom: VERIFIED_ON,
                }}
              >
                The definitive regulations, SI 2026/336, made 23 March, laid 24 March, in force 1
                April 2026 — and its explanatory note revokes both SI 2021/1076 and SI 2024/167:
                the 2021 regulations &ldquo;did not come into force and [are] no longer
                required.&rdquo; The rules people actually follow from April 2026 never went
                through Parliament as anything but this negative-procedure SI.
              </Cited>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-accent">9.</span>
            <span>
              <strong>From 6 Apr 2026 —</strong>{" "}
              <Cited cite={{ source: MTD_ELIGIBILITY_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
                Mandation goes live: over £50,000 from 6 April 2026, over £30,000 from 6 April
                2027, over £20,000 from 6 April 2028.
              </Cited>
            </span>
          </li>
        </ol>
        <p className="mt-4 text-sm text-ink-soft">
          Eleven years from a Budget speech to a working threshold. Two whole sets of regulations
          were written and then revoked before anyone used them. And the number that actually
          governs you was set in a statutory instrument under the negative procedure — no MP ever
          voted on it directly.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={MTD_PRIMARY_LEGISLATION_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Finance (No. 2) Act 2017, s.60
          </a>
          ,{" "}
          <a href={SI_2021_1076_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            SI 2021/1076
          </a>
          ,{" "}
          <a href={SI_2024_167_NOTE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            SI 2024/167
          </a>
          ,{" "}
          <a href={SI_2026_336_NOTE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            SI 2026/336
          </a>
          .
        </p>
      </section>

      {/* 9. NICs note */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">A tax that skips the Finance Bill: National Insurance</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited
            cite={{
              source: XST_ROLE_PAGE_URL,
              effectiveFrom: VERIFIED_ON,
              note: "Quote transcribed from the role page via regs/research/gov/treasury.md (fetched 2026-07-06). Portfolios move between Treasury ministers — check the live role page rather than relying on a name.",
            }}
          >
            National Insurance doesn&apos;t travel through the Finance Bill at all. The gov.uk
            role page of the Exchequer Secretary to the Treasury (the tax minister) lists
            responsibility for &ldquo;The Finance Bill and the National Insurance Bill&rdquo; as
            two separate things — NICs get their own annual bill, on their own track.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          If you&apos;re a sole trader, a meaningful slice of your annual bill — Class 2 and Class
          4 National Insurance — is legislated somewhere else entirely, under a different bill
          with a different name. Worth knowing when you&apos;re trying to track &ldquo;the&rdquo;
          tax law for the year.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Source:{" "}
          <a href={XST_ROLE_PAGE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Exchequer Secretary to the Treasury — role page
          </a>
          .
        </p>
      </section>

      {/* 10. Devolution note */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Scotland and Wales: a different law-making room</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Everything above is the Westminster machine for taxes reserved to the UK Parliament.
          Income tax rates and bands on non-savings, non-dividend income are devolved:{" "}
          <Cited cite={{ source: SCOTTISH_INCOME_TAX_URL, effectiveFrom: VERIFIED_ON }}>
            the Scottish Parliament sets Scottish rates and bands
          </Cited>
          , and{" "}
          <Cited cite={{ source: WELSH_INCOME_TAX_URL, effectiveFrom: VERIFIED_ON }}>
            the Senedd sets Welsh rates of income tax
          </Cited>
          . HMRC still administers and collects both — but the law behind the rate itself is made
          in Edinburgh or Cardiff, not London.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          A Scottish or Welsh taxpayer following the Finance Bill story above for their own income
          tax <em>rate</em> is reading about the wrong parliament. This guide is otherwise about
          reserved, UK-wide tax law.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={SCOTTISH_INCOME_TAX_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Scottish Income Tax — GOV.UK
          </a>
          ,{" "}
          <a href={WELSH_INCOME_TAX_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Welsh rates of Income Tax — GOV.UK
          </a>
          .
        </p>
      </section>

      {/* Wrong-door box */}
      <section className="mt-8 rounded-2xl border border-line bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Is this actually about your own tax bill?</h2>
        <p className="mt-2 text-sm text-ink">
          Everything on this page is about how the rules get made. If your problem is with{" "}
          <strong>your own</strong> tax bill, PAYE code, penalty or return, that&apos;s a dispute,
          not policy — and none of the routes above will fix it.
        </p>
        <p className="mt-3 text-sm text-ink">
          <Link
            href="/learn/gov/who-runs-your-taxes"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Who runs your taxes
          </Link>{" "}
          covers who to actually contact and the complaints ladder that applies to individual
          cases.
        </p>
      </section>
    </div>
  );
}
