import type { Metadata } from "next";
import Link from "next/link";
import { Cited } from "@/components/prep/cited";
import { RoleCard } from "@/components/gov/role-card";
import { ROLES, HMRC_CHANNELS } from "@/lib/gov/contacts";

// i18n: deferred to M2 — plain English for launch

// Fact sources: regs/research/gov/parliament.md + regs/research/gov/transparency-tools.md
// + regs/research/gov/participation.md (all fetched/verified 2026-07-06). One exception,
// explicitly permitted by the gov-pillar plan: the Finance Bill Public Bill Committee
// written-evidence email is pulled from regs/research/gov/lawmaking.md — that file carries
// the ⚠ CORRECTION (2026-07-06) recording that the email (scrutiny@parliament.uk) and the
// department-evidence-doesn't-count rule are verified (Wayback snapshot 4 Aug 2025 of the
// parliament.uk page), while the older "Word document, max 3,000 words, before the
// committee's last sitting" details are NOT on that page and are deliberately NOT stated
// here — this page's copy matches the corrected corpus, and matches how
// how-tax-law-is-made/page.tsx (Task 2) already states the same fact. No other source
// outside regs/research/gov/ was used; a claim not in the corpus does not appear here.
//
// DATA reuse: the Your MP, Treasury Committee and Chancellor entries below render from
// `frontend/src/lib/gov/contacts.ts` (Task 1) via <RoleCard> rather than retyping contact
// details a second time; the FOI email/address reads from that same module's
// `HMRC_CHANNELS` (`foi-hmrc`).
//
// Political neutrality: every lever on this page works the same regardless of what a
// reader wants changed. No cause is named or endorsed; only the mechanism is described.
const VERIFIED_ON = "2026-07-06";

// --- Section 1: MP -----------------------------------------------------------
const MP_FINDER_URL = "https://members.parliament.uk/FindYourMP";
const MP_CONTACT_GUIDANCE_URL =
  "https://www.parliament.uk/get-involved/contact-an-mp-or-lord/contact-your-mp/";
const WRITETOTHEM_URL = "https://www.writetothem.com/";
const WRITETOTHEM_QA_URL = "https://www.writetothem.com/about-qa";
const MP_RAISING_LEVERS_URL = "https://www.parliament.uk/about/mps-and-lords/members/raising/";
const EDM_REALITY_URL = "https://www.parliament.uk/about/how/business/edms/";
const WESTMINSTER_HALL_URL =
  "https://www.parliament.uk/about/how/business/debates/westminster-hall-debates/";
const BILLS_PARLIAMENT_URL = "https://bills.parliament.uk/";
const QUESTIONS_STATEMENTS_URL = "https://questions-statements.parliament.uk/";

// --- Section 2: Treasury Committee written evidence ---------------------------
const TREASURY_COMMITTEE_URL = "https://committees.parliament.uk/committee/158/treasury-committee/";
const GIVE_EVIDENCE_GUIDANCE_URL =
  "https://www.parliament.uk/get-involved/committees/give-evidence-to-a-select-committee/";
const INQUIRIES_PORTAL_URL =
  "https://committees.parliament.uk/inquiries/?showadvanced=true&currentlyacceptingevidence=true";

// --- Section 3: Finance Bill Public Bill Committee ----------------------------
const PBC_WRITTEN_EVIDENCE_URL =
  "https://www.parliament.uk/mps-lords-and-offices/offices/commons/scrutinyunit/written-submissions/";
const PBC_EVIDENCE_GUIDANCE_URL =
  "https://www.parliament.uk/get-involved/have-your-say-on-laws/input-into-legislation/";

// --- Section 4: Budget representations -----------------------------------------
const BUDGET_REPS_GUIDANCE_URL =
  "https://www.gov.uk/government/publications/budget-representations-guidance/guidance-for-submitting-your-budget-or-autumn-statement-representation";

// --- Section 5: Petitions -------------------------------------------------------
const PETITIONS_HELP_URL = "https://petition.parliament.uk/help";
const PETITION_MTD_JSON_URL = "https://petition.parliament.uk/petitions/729235.json";
const PETITION_PERSONAL_ALLOWANCE_JSON_URL = "https://petition.parliament.uk/petitions/702844.json";
const HANSARD_PERSONAL_ALLOWANCE_DEBATE_URL =
  "https://hansard.parliament.uk/commons/2025-05-12/debates/EEB4E70E-87F1-450E-8CA7-1C38E316913F/IncomeTaxPersonalAllowance";

// --- Section 6: FOI / WhatDoTheyKnow / confidentiality carve-out ---------------
const WHATDOTHEYKNOW_URL = "https://www.whatdotheyknow.com";
const WHATDOTHEYKNOW_HMRC_URL = "https://www.whatdotheyknow.com/body/hmrc";
const MYSOCIETY_TRANSPARENCY_URL = "https://www.mysociety.org/transparency/";
const CRCA_S18_URL = "https://www.legislation.gov.uk/ukpga/2005/11/section/18";
const CRCA_S23_URL = "https://www.legislation.gov.uk/ukpga/2005/11/section/23";
const HMRC_MANUAL_IDG40150_URL =
  "https://www.gov.uk/hmrc-internal-manuals/information-disclosure-guide/idg40150";

// --- Section 7: Consultations ----------------------------------------------------
const CONSULTATION_HUB_HMRC_URL =
  "https://www.gov.uk/search/policy-papers-and-consultations?content_store_document_type%5B%5D=open_consultations&organisations%5B%5D=hm-revenue-customs";
const CONSULTATION_PRINCIPLES_URL =
  "https://www.gov.uk/government/publications/consultation-principles-guidance";
const TAX_POLICY_PRINCIPLES_URL =
  "https://www.gov.uk/government/publications/tax-policy-making-principles";
const TIMELY_PAYMENTS_CONSULTATION_URL =
  "https://www.gov.uk/government/consultations/timely-payments-in-income-tax-self-assessment";

// --- Section 8: Transparency toolbox ---------------------------------------------
const THEYWORKFORYOU_URL = "https://www.theyworkforyou.com/";
const THEYWORKFORYOU_ABOUT_URL = "https://www.theyworkforyou.com/about/";
const HANSARD_API_MTD_SEARCH_URL =
  "https://hansard-api.parliament.uk/search.json?queryParameters.searchTerm=%22Making%20Tax%20Digital%22";
const LEGISLATION_UNDERSTANDING_URL = "https://www.legislation.gov.uk/understanding-legislation";
const SI_2021_1076_EM_URL = "https://www.legislation.gov.uk/uksi/2021/1076/memorandum/contents";
const ORGANOGRAM_HMRC_URL =
  "https://www.data.gov.uk/dataset/61e3828b-d1ad-4c69-b291-347a9d899fb3/organogram-hm-revenue-and-customs";
const ORGANOGRAM_SEARCH_URL = "https://www.data.gov.uk/search?q=organogram";

export const metadata: Metadata = {
  title: "Your levers on tax policy — TaxSorted",
  description:
    "The real, official channels for changing a tax rule — your MP, select committees, the Finance Bill, Budget representations, petitions, FOI and consultations — with honest thresholds and every fact cited.",
};

export default function YourLeversPage() {
  const yourMp = ROLES.find((r) => r.id === "your-mp")!;
  const treasuryCommitteeChair = ROLES.find((r) => r.id === "treasury-committee-chair")!;
  const chancellor = ROLES.find((r) => r.id === "chancellor-of-the-exchequer")!;
  const foiChannel = HMRC_CHANNELS.find((c) => c.id === "foi-hmrc")!;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/learn" className="text-sm text-accent hover:text-accent-deep">
        ← Back to Learn
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Your levers on tax policy</h1>
      <p className="mt-3 text-ink-soft">
        Not happy with a tax, a threshold or a deadline? There are real, official channels for
        saying so — and some are on record as having moved policy —{" "}
        <Link
          href="/learn/gov/receipts"
          className="font-medium text-accent underline hover:text-accent-deep"
        >
          see the receipts
        </Link>
        . Here&apos;s every one of them, with the honest odds attached and every fact cited to its
        official source.
      </p>

      <div role="note" className="mt-6 rounded-2xl border border-line bg-accent-soft p-4 text-sm text-ink sm:p-5">
        <p>
          <strong>Mechanism, not opinion — for any position.</strong> Every lever below works the
          same whether you want a tax raised, cut, simplified or delayed. This page endorses no
          cause and names no side; it only maps the machinery, cited to official sources, so you
          can point it at whatever you believe.
        </p>
      </div>

      {/* 1. Find and contact your MP */}
      <section className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Find and contact your MP</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Find who represents you at{" "}
          <a
            href={MP_FINDER_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            members.parliament.uk/FindYourMP
          </a>
          , or write to them through{" "}
          <a
            href={WRITETOTHEM_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            WriteToThem
          </a>{" "}
          — a free mySociety service that turns your postcode into your MP&apos;s contact details.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: MP_CONTACT_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            &ldquo;MPs will generally only act on behalf of people who live in their own
            constituency&rdquo; — so write to your own MP, not a well-known one on your issue.
            Writing is recommended over other channels because it &ldquo;provides a written
            record.&rdquo;
          </Cited>{" "}
          <Cited cite={{ source: MP_CONTACT_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            Mass-mailing every MP is explicitly discouraged — official guidance says
            &ldquo;mass mailings will not get their attention&rdquo; — so one letter in your own
            words carries more weight than a form letter forwarded to every MP.
          </Cited>
        </p>
        <div className="mt-4">
          <RoleCard role={yourMp} />
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited
            cite={{
              source: WRITETOTHEM_QA_URL,
              effectiveFrom: VERIFIED_ON,
              note: "Confirms WriteToThem only delivers to your own representatives and blocks copy-paste campaign letters.",
            }}
          >
            WriteToThem &ldquo;block[s] &lsquo;identikit&rsquo; letters&rdquo; on purpose — it only
            works for your own representatives, and it wants your own words, not a template.
          </Cited>
        </p>
        <p className="mt-4 text-sm font-semibold text-ink">What an MP can actually do for you</p>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-ink-soft">
          <li>
            <Cited cite={{ source: MP_RAISING_LEVERS_URL, effectiveFrom: VERIFIED_ON }}>
              Ask a parliamentary question — oral or written. It &ldquo;may secure information or
              a commitment from the government and guarantees that the minister&apos;s reply is
              put on the record.&rdquo;
            </Cited>{" "}
            Written questions and answers are published at{" "}
            <a
              href={QUESTIONS_STATEMENTS_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-accent underline hover:text-accent-deep"
            >
              questions-statements.parliament.uk
            </a>
            .
          </li>
          <li>
            <Cited
              cite={{
                source: WESTMINSTER_HALL_URL,
                effectiveFrom: VERIFIED_ON,
                note: "Motions are neutral and unamendable — this is a pressure/on-record venue, not a vote.",
              }}
            >
              Push for a Westminster Hall debate — motions are neutral (&ldquo;That this House has
              considered [X]&rdquo;), with no amendments and no votes, but the minister must attend
              and give a considered response.
            </Cited>
          </li>
          <li>
            <Cited
              cite={{
                source: EDM_REALITY_URL,
                effectiveFrom: VERIFIED_ON,
                note: "Honest hedge: signature count does not move the odds of a debate — keep expectations realistic.",
              }}
            >
              Sign or ask for an Early Day Motion (EDM) — a visibility tool, not a decision tool.
              &ldquo;In an average session only six or seven EDMs reach over two hundred
              signatures&rdquo;, and there is &ldquo;no rule whereby the number of signatures
              affects the likelihood of an EDM being debated.&rdquo;
            </Cited>
          </li>
          <li>
            <Cited cite={{ source: MP_RAISING_LEVERS_URL, effectiveFrom: VERIFIED_ON }}>
              Ask your MP to table (or support) a Finance Bill amendment or New Clause —
              &ldquo;MPs can also propose an amendment or New Clause to a relevant government bill
              while it is being considered in the Commons.&rdquo;
            </Cited>{" "}
            Tabled amendments appear in the publications section of the bill&apos;s page on{" "}
            <a
              href={BILLS_PARLIAMENT_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-accent underline hover:text-accent-deep"
            >
              bills.parliament.uk
            </a>
            . The window is short — Finance Bills usually move from second reading to Royal
            Assent in well under four months (see{" "}
            <Link
              href="/learn/gov/how-tax-law-is-made"
              className="font-medium text-accent underline hover:text-accent-deep"
            >
              How a tax law is born
            </Link>{" "}
            for the exact timeline).
          </li>
          <li>
            <Cited
              cite={{
                source: MP_RAISING_LEVERS_URL,
                effectiveFrom: VERIFIED_ON,
                note: "Often the highest-value, lowest-drama lever for a sole trader: a written ministerial reply the department is obliged to give.",
              }}
            >
              Ask your MP to write privately to a minister — &ldquo;MPs&apos; correspondence with
              ministers is prioritised by civil servants who must provide a &lsquo;high
              quality&rsquo; reply in a timely manner.&rdquo;
            </Cited>
          </li>
        </ul>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={MP_CONTACT_GUIDANCE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Contact your MP — UK Parliament
          </a>
          ,{" "}
          <a href={MP_RAISING_LEVERS_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Raising an issue as an MP or Lord
          </a>
          ,{" "}
          <a href={EDM_REALITY_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Early Day Motions
          </a>
          ,{" "}
          <a href={WRITETOTHEM_QA_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            WriteToThem — about &amp; Q&amp;A
          </a>
          .
        </p>
      </section>

      {/* 2. Treasury Committee written evidence */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Give written evidence to a select committee</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: TREASURY_COMMITTEE_URL, effectiveFrom: VERIFIED_ON }}>
            The Treasury Committee is &ldquo;appointed by the House of Commons to examine the
            expenditure, administration and policy of HM Treasury, HM Revenue &amp; Customs, and
            associated public bodies, including the Bank of England and the Financial Conduct
            Authority.&rdquo;
          </Cited>
        </p>
        <div className="mt-4">
          <RoleCard role={treasuryCommitteeChair} />
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: GIVE_EVIDENCE_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            Committees launch inquiries with a &ldquo;call for evidence&rdquo; — anyone with
            relevant knowledge or personal experience can submit.
          </Cited>{" "}
          The live list of inquiries currently accepting evidence is at{" "}
          <a
            href={INQUIRIES_PORTAL_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            committees.parliament.uk/inquiries
          </a>
          — each inquiry page links its own submission form and deadline.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: GIVE_EVIDENCE_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            Format, quoted exactly: &ldquo;Keep your evidence short and to the point. Use section
            headings and numbered paragraphs.&rdquo; Send &ldquo;a single file in Microsoft Word
            or another editable format&rdquo; — not a PDF, under 25MB — and &ldquo;Do not include
            your contact details&rdquo; in the document itself. Your contribution &ldquo;must be
            original&rdquo;, not already published elsewhere.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: GIVE_EVIDENCE_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            Evidence is normally published permanently under your name; you can ask for anonymity
            or confidentiality, but &ldquo;it is for the committee to say whether it will
            agree&rdquo;. And plainly: &ldquo;Committees cannot help you with an individual
            problem or a specific complaint.&rdquo; — that&apos;s the wrong door for this route.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: GIVE_EVIDENCE_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            Committee recommendations &ldquo;are not binding on the Government. But they are
            influential.&rdquo;
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={TREASURY_COMMITTEE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Treasury Committee
          </a>
          ,{" "}
          <a href={GIVE_EVIDENCE_GUIDANCE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Give evidence to a select committee
          </a>
          .
        </p>
      </section>

      {/* 3. Finance Bill Public Bill Committee evidence */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Write to the Finance Bill&apos;s Public Bill Committee</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: PBC_EVIDENCE_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            After a bill&apos;s second reading, it&apos;s usually referred to a Public Bill
            Committee. If that committee issues a &ldquo;call for evidence&rdquo;, anyone can
            submit written evidence while the committee is meeting — it&apos;s circulated to all
            the MPs serving on the committee.
          </Cited>
        </p>
        <div className="mt-4 rounded-xl border border-line bg-accent-soft p-4 text-sm text-ink">
          <p>
            <strong>The route, exactly:</strong>{" "}
            <Cited
              cite={{
                source: PBC_WRITTEN_EVIDENCE_URL,
                effectiveFrom: VERIFIED_ON,
                note: "parliament.uk blocks automated fetching; this route was verified against the 4 August 2025 archived copy of the page. Check the live page for current submission guidelines before submitting.",
              }}
            >
              Email your written evidence to scrutiny@parliament.uk. Submissions are accepted once
              the bill has had its second reading, and the sooner you send it in, the better.
              Sending your evidence to the government department in charge of the bill instead —
              for a Finance Bill, the Treasury — is <strong>not treated as evidence</strong> to the
              committee.
            </Cited>
          </p>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          The Finance Bill&apos;s committee stage is compressed into weeks, not months — see{" "}
          <Link
            href="/learn/gov/how-tax-law-is-made"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            How a tax law is born
          </Link>{" "}
          for the real dates. If you want to influence this year&apos;s Bill, send evidence as
          soon as second reading happens, not after.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={PBC_EVIDENCE_GUIDANCE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Input into legislation — UK Parliament
          </a>
          ,{" "}
          <a href={PBC_WRITTEN_EVIDENCE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Scrutiny Unit — written submissions
          </a>
          .
        </p>
      </section>

      {/* 4. Budget representations */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Send a Budget representation to HM Treasury</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: BUDGET_REPS_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            &ldquo;A Budget representation is a written representation from an interest group,
            individual or representative body to HM Treasury&rdquo; — suggestions should
            &ldquo;explain the policy rationale, costs, benefits and deliverability.&rdquo;
          </Cited>
        </p>
        <div className="mt-4">
          <RoleCard role={chancellor} />
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: BUDGET_REPS_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            Channels: a per-event online portal once one is announced, email
            public.enquiries@hmtreasury.gov.uk, or post to The Correspondence and Enquiry Unit, HM
            Treasury, 1 Horse Guards Road, London, SW1A 2HQ. Be honest with yourself: the
            guidance says plainly, &ldquo;Representations will not receive a bespoke written
            reply.&rdquo;
          </Cited>{" "}
          It&apos;s cheap to do and genuinely read as an input sweep before each Budget — but be
          honest about the whole picture: no bespoke reply <em>and</em> a zero feedback loop, so
          you&apos;ll likely never learn whether your representation was read, considered, or
          changed anything. Best used for one specific, costed, deliverable ask, not a general
          complaint. Watch gov.uk for the representations portal once the next Budget date is
          announced.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Source:{" "}
          <a href={BUDGET_REPS_GUIDANCE_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Guidance for submitting your Budget representation
          </a>
          .
        </p>
      </section>

      {/* 5. Petitions */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Petitions — honest thresholds</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: PETITIONS_HELP_URL, effectiveFrom: VERIFIED_ON }}>
            &ldquo;Petitions that get 10,000 signatures get a response from the UK
            Government.&rdquo; &ldquo;All petitions that get 100,000 signatures will be considered
            for debate, and are usually debated&rdquo; — usually in Westminster Hall. A new
            petition needs 5 supporters to publish and runs for 6 months.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Two real tax petitions show the range:{" "}
          <Cited
            cite={{
              source: PETITION_MTD_JSON_URL,
              effectiveFrom: VERIFIED_ON,
              note: "Petition 729235: 20,086 signatures, government response 15 Oct 2025, not debated.",
            }}
          >
            a petition against Making Tax Digital reached 20,086 signatures and got a government
            response — but was never debated
          </Cited>
          , while{" "}
          <Cited
            cite={{
              source: PETITION_PERSONAL_ALLOWANCE_JSON_URL,
              effectiveFrom: VERIFIED_ON,
              note: "Petition 702844: 281,794 signatures, debated 12 May 2025 (Hansard transcript linked), government position unchanged.",
            }}
          >
            a petition to raise the income tax personal allowance reached 281,794 signatures and
            was debated
          </Cited>{" "}
          in the{" "}
          <a
            href={HANSARD_PERSONAL_ALLOWANCE_DEBATE_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Commons on 12 May 2025
          </a>
          — but the government&apos;s position on the allowance itself did not change.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Honest takeaway: petitions reliably produce an on-the-record government statement at
          10,000 signatures and sometimes a Westminster Hall debate at 100,000 signatures — they
          put an issue on record and give MPs a peg to raise it. But{" "}
          <strong>no recent tax petition has by itself changed tax policy.</strong> Treat petitions
          as an awareness tool, not a decision-making one.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Source:{" "}
          <a href={PETITIONS_HELP_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            petition.parliament.uk/help
          </a>
          .
        </p>
      </section>

      {/* 6. FOI + WhatDoTheyKnow + confidentiality carve-out + SAR cross-link */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Freedom of Information — ask how the system works</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: MYSOCIETY_TRANSPARENCY_URL, effectiveFrom: VERIFIED_ON }}>
            mySociety describes WhatDoTheyKnow plainly: &ldquo;Make FOI requests to over 24,000
            public authorities in the UK, or browse a massive online public archive of
            information, for free.&rdquo;
          </Cited>{" "}
          Because both the request and HMRC&apos;s answer are published, one person&apos;s FOI
          answer becomes everyone&apos;s answer — try{" "}
          <a
            href={WHATDOTHEYKNOW_HMRC_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            HMRC&apos;s page on WhatDoTheyKnow
          </a>{" "}
          or the{" "}
          <a
            href={WHATDOTHEYKNOW_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            WhatDoTheyKnow
          </a>{" "}
          archive generally before you write a fresh request. You can also write to HMRC directly:{" "}
          {foiChannel.details}
        </p>
        <div className="mt-4 rounded-xl border border-line bg-accent-soft p-4 text-sm text-ink">
          <p>
            <strong>The carve-out: HMRC will never release your — or anyone&apos;s — tax
            affairs.</strong>{" "}
            <Cited
              cite={{
                source: CRCA_S18_URL,
                si: "Commissioners for Revenue and Customs Act 2005, s.18(1)",
                effectiveFrom: VERIFIED_ON,
              }}
            >
              By law, &ldquo;Revenue and Customs officials may not disclose information which is
              held by the Revenue and Customs in connection with a function of the Revenue and
              Customs&rdquo; — a standing duty of confidentiality.
            </Cited>{" "}
            <Cited
              cite={{
                source: CRCA_S23_URL,
                si: "Commissioners for Revenue and Customs Act 2005, s.23(1)",
                effectiveFrom: VERIFIED_ON,
              }}
            >
              That duty makes any information that would identify a taxpayer exempt from FOI
              outright.
            </Cited>{" "}
            <Cited cite={{ source: HMRC_MANUAL_IDG40150_URL, effectiveFrom: VERIFIED_ON }}>
              HMRC&apos;s own manual is explicit: on any identifiable taxpayer, &ldquo;our response
              under FOIA will always &lsquo;neither confirm nor deny&rsquo; we hold
              information.&rdquo;
            </Cited>{" "}
            Plainly: HMRC will never release information that would reveal an identifiable
            person&apos;s or company&apos;s tax affairs through FOI — not yours, and not anyone
            else&apos;s. FOI gets you policy, process, statistics and internal guidance, never a
            case file.
          </p>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Want your own data instead of general policy information? That&apos;s a Subject Access
          Request (SAR), not FOI — HMRC&apos;s SAR route (and the full FOI-vs-SAR explainer) is
          covered on{" "}
          <Link
            href="/learn/gov/who-runs-your-taxes"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Who runs your taxes
          </Link>
          .
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={MYSOCIETY_TRANSPARENCY_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            mySociety — WhatDoTheyKnow
          </a>
          ,{" "}
          <a href={CRCA_S18_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            CRCA 2005, s.18
          </a>
          ,{" "}
          <a href={CRCA_S23_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            CRCA 2005, s.23
          </a>
          ,{" "}
          <a href={HMRC_MANUAL_IDG40150_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            HMRC Information Disclosure Guide, IDG40150
          </a>
          .
        </p>
      </section>

      {/* 7. Consultations */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Respond to a consultation so it actually counts</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Live HMRC and HM Treasury consultations are listed on the{" "}
          <a
            href={CONSULTATION_HUB_HMRC_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            gov.uk consultations hub
          </a>
          , filterable by department.{" "}
          <Cited cite={{ source: CONSULTATION_PRINCIPLES_URL, effectiveFrom: VERIFIED_ON }}>
            The Cabinet Office&apos;s Consultation Principles say government should consult
            &ldquo;only on issues that are genuinely undecided&rdquo;, using &ldquo;clear language
            and plain English.&rdquo;
          </Cited>{" "}
          <Cited cite={{ source: TAX_POLICY_PRINCIPLES_URL, effectiveFrom: VERIFIED_ON }}>
            HM Treasury&apos;s Tax Policy Making Principles (published 12 June 2025) add that
            formal tax consultation will be &ldquo;targeted and precise&rdquo; — windows are
            getting shorter, so watch for openings.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          What actually gets read: evidence of impact beats opinion. A response that says &ldquo;I
          don&apos;t like this&rdquo; is easy to set aside; a response with your own hours, £ cost,
          software cost, or a specific broken scenario is the kind that has visibly changed detail
          in past Finance Bills. Structure it simply: who you are (one line), the specific proposal
          paragraph you&apos;re answering, your real numbers, and the change you&apos;re proposing.
          Nothing restricts consultations to professional bodies — an individual sole trader&apos;s
          response with real figures is rare, and memorable for it.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited
            cite={{
              source: TIMELY_PAYMENTS_CONSULTATION_URL,
              effectiveFrom: VERIFIED_ON,
              note: "Live worked example of a consultation's own response route (online form, email, post) as of 2026-07-06.",
            }}
          >
            Every consultation page carries its own response route — for example, the live
            &ldquo;Timely Payments in income tax Self Assessment&rdquo; consultation can be
            answered by online form, by email, or by post, all listed on the consultation page
            itself.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={CONSULTATION_PRINCIPLES_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Consultation Principles
          </a>
          ,{" "}
          <a href={TAX_POLICY_PRINCIPLES_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Tax Policy Making Principles
          </a>
          ,{" "}
          <a href={TIMELY_PAYMENTS_CONSULTATION_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            Timely Payments in income tax Self Assessment
          </a>
          .
        </p>
      </section>

      {/* 8. Transparency toolbox */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">The transparency toolbox</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: THEYWORKFORYOU_ABOUT_URL, effectiveFrom: VERIFIED_ON }}>
            TheyWorkForYou lets you &ldquo;discover who represents you, how they&apos;ve voted and
            what they&apos;ve said in debates&rdquo;, free.
          </Cited>{" "}
          Set up an{" "}
          <a
            href={THEYWORKFORYOU_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            email alert
          </a>{" "}
          on a keyword you care about —{" "}
          <Cited
            cite={{
              source: HANSARD_API_MTD_SEARCH_URL,
              effectiveFrom: VERIFIED_ON,
              note: "Live Hansard API query, 2026-07-06.",
            }}
          >
            a search for the exact phrase &ldquo;Making Tax Digital&rdquo; in Hansard turned up 231
            contributions, 10 written statements and 4 debates
          </Cited>{" "}
          — Hansard is the official transcript of everything said in Parliament.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: SI_2021_1076_EM_URL, effectiveFrom: VERIFIED_ON }}>
            Every statutory instrument laid before Parliament since June 2004 carries an
            Explanatory Memorandum — plain-English notes on what the SI does and why, written for
            readers who aren&apos;t legally qualified. Find it under the &ldquo;Explanatory
            Memorandum&rdquo; tab on the SI&apos;s page at{" "}
          </Cited>
          <a
            href={LEGISLATION_UNDERSTANDING_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            legislation.gov.uk
          </a>
          . It&apos;s the fastest way to read what a technical tax SI actually does without a law
          degree.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: ORGANOGRAM_HMRC_URL, effectiveFrom: VERIFIED_ON }}>
            Departments including HMRC publish an &ldquo;Organogram of Staff Roles &amp;
            Salaries&rdquo; — an organisation chart of every staff role, with names and salary
            details for senior civil servants.
          </Cited>{" "}
          Find any department&apos;s at{" "}
          <a
            href={ORGANOGRAM_SEARCH_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            data.gov.uk
          </a>
          .
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a href={THEYWORKFORYOU_ABOUT_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            TheyWorkForYou
          </a>
          ,{" "}
          <a href={SI_2021_1076_EM_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            legislation.gov.uk — Explanatory Memoranda
          </a>
          ,{" "}
          <a href={ORGANOGRAM_HMRC_URL} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline hover:text-accent-deep">
            HMRC organogram — data.gov.uk
          </a>
          .
        </p>
      </section>

      {/* 9. Civility + realistic expectations */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What actually moves the needle</h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited
            cite={{
              source: WRITETOTHEM_QA_URL,
              effectiveFrom: VERIFIED_ON,
              note: "The tool that sends the letters explains why it discounts campaign duplicates.",
            }}
          >
            A hundred identical letters are actively discounted, not amplified — WriteToThem
            blocks &ldquo;identikit&rdquo; letters because MPs &ldquo;rather naturally take a
            sudden influx of identical or similar messages with a large pinch of salt&rdquo;.
          </Cited>{" "}
          One clear, evidenced, personally-written submission — to your MP, a select committee, a
          consultation, or Treasury — is worth more than a hundred copies of the same paragraph.
          Quality, aggregated with real numbers, beats quantity, duplicated.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Be civil in every one of these channels — the people reading select-committee inboxes
          and consultation responses are often the same officials who will act on good evidence,
          and a hostile tone gets a submission set aside as fast as a form letter does. Bring facts
          and your own numbers, not adjectives, and expect timescales in months and years, not
          days — every lever on this page is real, but none of them is instant.
        </p>
      </section>

      {/* Wrong-door box */}
      <section className="mt-8 rounded-2xl border border-line bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Is this actually about your own tax bill?</h2>
        <p className="mt-2 text-sm text-ink">
          Everything on this page is about changing a rule for everyone. If your problem is an{" "}
          <strong>individual dispute</strong> — your own bill, PAYE code, penalty or return —
          none of the routes above will fix it; they influence policy, not your case.
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
