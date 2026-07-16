import type { Metadata } from "next";
import Link from "next/link";
import { Cited } from "@/components/prep/cited";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import { ExternalLink, PageSources } from "@/components/gov/sources";
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
      <Breadcrumbs items={[{ href: "/learn", label: "Learn" }]} current="Your levers on tax policy" />

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Your levers on tax policy</h1>
      <p className="mt-3 text-base text-ink-soft">
        Not happy with a tax, a threshold or a deadline? This page maps every official channel
        for saying so, with the honest odds attached. Some have genuinely moved policy —{" "}
        <Link
          href="/learn/gov/receipts"
          className="font-medium text-accent underline hover:text-accent-deep"
        >
          see the receipts
        </Link>
        .
      </p>

      <ShortVersion className="mt-6">
        <li>There are real, official ways to push for a tax rule change — every one is below.</li>
        <li>
          The strongest general move: one letter to your own MP, in your own words, with your
          real numbers.
        </li>
        <li>Identical mass letters and most petitions move nothing. Evidence does — slowly.</li>
        <li>Expect months or years, not days.</li>
      </ShortVersion>

      {/* Router: which lever is for me? */}
      <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Which lever is yours?</h2>
        <ul className="mt-3 space-y-3 text-base text-ink-soft">
          <li>
            <strong className="text-ink">A rule hurts you, and you can show how much:</strong>{" "}
            <a href="#mp" className="font-medium text-accent underline hover:text-accent-deep">
              write to your own MP
            </a>{" "}
            — the general-purpose lever.
          </li>
          <li>
            <strong className="text-ink">A consultation is open on your issue:</strong>{" "}
            <a href="#consultations" className="font-medium text-accent underline hover:text-accent-deep">
              respond with your own figures
            </a>{" "}
            — the door built for input.
          </li>
          <li>
            <strong className="text-ink">The Finance Bill is in Parliament right now:</strong>{" "}
            <a href="#finance-bill" className="font-medium text-accent underline hover:text-accent-deep">
              email evidence to its committee
            </a>{" "}
            — the window is weeks, not months.
          </li>
          <li>
            <strong className="text-ink">You know a tax problem deeply:</strong>{" "}
            <a href="#select-committee" className="font-medium text-accent underline hover:text-accent-deep">
              give written evidence to a select committee
            </a>
            .
          </li>
          <li>
            <strong className="text-ink">You want a public, on-the-record answer:</strong>{" "}
            <a href="#petitions" className="font-medium text-accent underline hover:text-accent-deep">
              a petition
            </a>{" "}
            — honest thresholds below.
          </li>
          <li>
            <strong className="text-ink">You want to know how the system works:</strong>{" "}
            <a href="#foi" className="font-medium text-accent underline hover:text-accent-deep">
              ask under Freedom of Information (FOI)
            </a>
            .
          </li>
        </ul>
      </section>

      <div role="note" className="mt-6 rounded-2xl border border-line bg-accent-soft p-4 text-base text-ink sm:p-5">
        <p>
          <strong>Mechanism, not opinion — for any position.</strong> Every lever below works the
          same whether you want a tax raised, cut, simplified or delayed. This page endorses no
          cause and names no side; it only maps the machinery, cited to official sources, so you
          can point it at whatever you believe.
        </p>
      </div>

      {/* 1. Find and contact your MP */}
      <section id="mp" className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Find and contact your MP</h2>
        <p className="mt-2 text-base text-ink-soft">
          <ExternalLink href={MP_FINDER_URL}>Find who represents you</ExternalLink> on the UK
          Parliament site, or write to them through{" "}
          <ExternalLink href={WRITETOTHEM_URL}>WriteToThem</ExternalLink> — a free mySociety
          service that turns your postcode into your MP&apos;s contact details.
        </p>
        <p className="mt-3 text-base text-ink-soft">
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
        <p className="mt-3 text-base text-ink-soft">
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
        <h3 className="mt-4 text-base font-semibold text-ink">What an MP can actually do for you</h3>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-base text-ink-soft">
          <li>
            <Cited cite={{ source: MP_RAISING_LEVERS_URL, effectiveFrom: VERIFIED_ON }}>
              Ask a parliamentary question — oral or written. It &ldquo;may secure information or
              a commitment from the government and guarantees that the minister&apos;s reply is
              put on the record.&rdquo;
            </Cited>{" "}
            Written questions and answers are published on{" "}
            <ExternalLink href={QUESTIONS_STATEMENTS_URL}>
              Parliament&apos;s questions and statements site
            </ExternalLink>
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
            Tabled amendments appear on{" "}
            <ExternalLink href={BILLS_PARLIAMENT_URL}>the bill&apos;s page at Parliament</ExternalLink>
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
      </section>

      {/* 2. Treasury Committee written evidence */}
      <section id="select-committee" className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Give written evidence to a select committee</h2>
        <p className="mt-2 text-base text-ink-soft">
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
        <p className="mt-3 text-base text-ink-soft">
          <Cited cite={{ source: GIVE_EVIDENCE_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            Committees launch inquiries with a &ldquo;call for evidence&rdquo; — anyone with
            relevant knowledge or personal experience can submit.
          </Cited>{" "}
          The live list of inquiries currently accepting evidence is on{" "}
          <ExternalLink href={INQUIRIES_PORTAL_URL}>
            Parliament&apos;s open-inquiries page
          </ExternalLink>{" "}
          — each inquiry page links its own submission form and deadline.
        </p>
        <p className="mt-4 text-base font-semibold text-ink">
          <Cited cite={{ source: GIVE_EVIDENCE_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            The format rules, from Parliament&apos;s own guidance:
          </Cited>
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-base text-ink-soft">
          <li>Keep it short and to the point.</li>
          <li>Use section headings and numbered paragraphs.</li>
          <li>Send one file, in Microsoft Word or another editable format — not a PDF, under 25MB.</li>
          <li>Don&apos;t put your contact details inside the document itself.</li>
          <li>It &ldquo;must be original&rdquo; — not already published elsewhere.</li>
        </ul>
        <p className="mt-3 text-base text-ink-soft">
          <Cited cite={{ source: GIVE_EVIDENCE_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            Evidence is normally published permanently under your name. You can ask for anonymity
            or confidentiality, but &ldquo;it is for the committee to say whether it will
            agree&rdquo;.
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          <Cited cite={{ source: GIVE_EVIDENCE_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            Two honest limits: &ldquo;Committees cannot help you with an individual problem or a
            specific complaint&rdquo; — that&apos;s the wrong door for this route. And committee
            recommendations &ldquo;are not binding on the Government. But they are
            influential.&rdquo;
          </Cited>
        </p>
      </section>

      {/* 3. Finance Bill Public Bill Committee evidence */}
      <section id="finance-bill" className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Write to the Finance Bill&apos;s Public Bill Committee</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: PBC_EVIDENCE_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            After a bill&apos;s second reading, it&apos;s usually referred to a Public Bill
            Committee. If that committee issues a &ldquo;call for evidence&rdquo;, anyone can
            submit written evidence while the committee is meeting — it&apos;s circulated to all
            the MPs serving on the committee.
          </Cited>
        </p>
        <div className="mt-4 rounded-xl border border-line bg-accent-soft p-4 text-base text-ink">
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
        <p className="mt-3 text-base text-ink-soft">
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
      </section>

      {/* 4. Budget representations */}
      <section id="budget-representation" className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Send a Budget representation to HM Treasury</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: BUDGET_REPS_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            &ldquo;A Budget representation is a written representation from an interest group,
            individual or representative body to HM Treasury&rdquo; — suggestions should
            &ldquo;explain the policy rationale, costs, benefits and deliverability.&rdquo;
          </Cited>
        </p>
        <div className="mt-4">
          <RoleCard role={chancellor} />
        </div>
        <p className="mt-3 text-base text-ink-soft">
          <Cited cite={{ source: BUDGET_REPS_GUIDANCE_URL, effectiveFrom: VERIFIED_ON }}>
            Channels: a per-event online portal once one is announced, email
            public.enquiries@hmtreasury.gov.uk, or post to The Correspondence and Enquiry Unit, HM
            Treasury, 1 Horse Guards Road, London, SW1A 2HQ. The guidance says plainly:
            &ldquo;Representations will not receive a bespoke written reply.&rdquo;
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          It&apos;s cheap to do and genuinely read as an input sweep before each Budget. But be
          honest about the whole picture: no reply and no feedback loop, so you&apos;ll likely
          never learn whether it changed anything. Best used for one specific, costed,
          deliverable ask — not a general complaint. Watch gov.uk for the portal once the next
          Budget date is announced.
        </p>
      </section>

      {/* 5. Petitions */}
      <section id="petitions" className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Petitions — honest thresholds</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: PETITIONS_HELP_URL, effectiveFrom: VERIFIED_ON }}>
            &ldquo;Petitions that get 10,000 signatures get a response from the UK
            Government.&rdquo; &ldquo;All petitions that get 100,000 signatures will be considered
            for debate, and are usually debated&rdquo; — usually in Westminster Hall. A new
            petition needs 5 supporters to publish and runs for 6 months.
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
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
          <ExternalLink href={HANSARD_PERSONAL_ALLOWANCE_DEBATE_URL}>
            Commons on 12 May 2025
          </ExternalLink>{" "}
          — but the government&apos;s position on the allowance itself did not change.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Honest takeaway: petitions reliably put an issue on record, and give MPs a peg to raise
          it. But <strong>no recent tax petition has by itself changed tax policy.</strong> Treat
          petitions as an awareness tool, not a decision-making one.
        </p>
      </section>

      {/* 6. FOI + WhatDoTheyKnow + confidentiality carve-out + SAR cross-link */}
      <section id="foi" className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Freedom of Information — ask how the system works</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: MYSOCIETY_TRANSPARENCY_URL, effectiveFrom: VERIFIED_ON }}>
            mySociety describes WhatDoTheyKnow plainly: &ldquo;Make FOI requests to over 24,000
            public authorities in the UK, or browse a massive online public archive of
            information, for free.&rdquo;
          </Cited>{" "}
          Because both the request and HMRC&apos;s answer are published, one person&apos;s FOI
          answer becomes everyone&apos;s answer.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Before writing a fresh request, try{" "}
          <ExternalLink href={WHATDOTHEYKNOW_HMRC_URL}>
            HMRC&apos;s page on WhatDoTheyKnow
          </ExternalLink>{" "}
          or the <ExternalLink href={WHATDOTHEYKNOW_URL}>WhatDoTheyKnow</ExternalLink> archive
          generally. You can also write to HMRC directly: {foiChannel.details}
        </p>
        <div className="mt-4 rounded-xl border border-line bg-accent-soft p-4 text-base text-ink">
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
            </Cited>
          </p>
          <p className="mt-3">
            <Cited cite={{ source: HMRC_MANUAL_IDG40150_URL, effectiveFrom: VERIFIED_ON }}>
              HMRC&apos;s own manual is explicit: on any identifiable taxpayer, &ldquo;our response
              under FOIA will always &lsquo;neither confirm nor deny&rsquo; we hold
              information.&rdquo;
            </Cited>{" "}
            Plainly: FOI gets you policy, process, statistics and internal guidance — never a
            case file, not yours and not anyone else&apos;s.
          </p>
        </div>
        <p className="mt-3 text-base text-ink-soft">
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
      </section>

      {/* 7. Consultations */}
      <section id="consultations" className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Respond to a consultation so it actually counts</h2>
        <p className="mt-2 text-base text-ink-soft">
          Live HMRC and HM Treasury consultations are listed on the{" "}
          <ExternalLink href={CONSULTATION_HUB_HMRC_URL}>gov.uk consultations hub</ExternalLink>,
          filterable by department.{" "}
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
        <p className="mt-3 text-base text-ink-soft">
          What actually gets read: evidence of impact beats opinion. &ldquo;I don&apos;t like
          this&rdquo; is easy to set aside; your own hours, £ costs, software costs, or a
          specific broken scenario is the kind of response that has visibly changed detail in
          past Finance Bills.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Structure it simply: who you are (one line), the proposal paragraph you&apos;re
          answering, your real numbers, and the change you propose. Nothing restricts
          consultations to professional bodies — an individual sole trader&apos;s response with
          real figures is rare, and memorable for it.
        </p>
        <p className="mt-3 text-base text-ink-soft">
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
      </section>

      {/* 8. Transparency toolbox */}
      <section id="toolbox" className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">The transparency toolbox</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: THEYWORKFORYOU_ABOUT_URL, effectiveFrom: VERIFIED_ON }}>
            TheyWorkForYou lets you &ldquo;discover who represents you, how they&apos;ve voted and
            what they&apos;ve said in debates&rdquo;, free.
          </Cited>{" "}
          Set up an <ExternalLink href={THEYWORKFORYOU_URL}>email alert</ExternalLink> on a
          keyword you care about —{" "}
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
        <p className="mt-3 text-base text-ink-soft">
          <Cited cite={{ source: SI_2021_1076_EM_URL, effectiveFrom: VERIFIED_ON }}>
            Every statutory instrument laid before Parliament since June 2004 carries an
            Explanatory Memorandum — plain-English notes on what the SI does and why, written for
            readers who aren&apos;t legally qualified. Find it under the &ldquo;Explanatory
            Memorandum&rdquo; tab on the SI&apos;s page at{" "}
          </Cited>
          <ExternalLink href={LEGISLATION_UNDERSTANDING_URL}>legislation.gov.uk</ExternalLink>.
          It&apos;s the fastest way to read what a technical tax SI actually does without a law
          degree.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          <Cited cite={{ source: ORGANOGRAM_HMRC_URL, effectiveFrom: VERIFIED_ON }}>
            Departments including HMRC publish an &ldquo;Organogram of Staff Roles &amp;
            Salaries&rdquo; — an organisation chart of every staff role, with names and salary
            details for senior civil servants.
          </Cited>{" "}
          Find any department&apos;s{" "}
          <ExternalLink href={ORGANOGRAM_SEARCH_URL}>organogram at data.gov.uk</ExternalLink>.
        </p>
      </section>

      {/* 9. Civility + realistic expectations */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What actually moves the needle</h2>
        <p className="mt-2 text-base text-ink-soft">
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
          One clear, evidenced, personally-written submission is worth more than a hundred copies
          of the same paragraph.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Be civil in every one of these channels. The people reading committee inboxes and
          consultation responses are often the officials who will act on good evidence — a
          hostile tone gets a submission set aside as fast as a form letter does.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Bring facts and your own numbers, not adjectives. And expect timescales in months and
          years, not days — every lever on this page is real, but none of them is instant.
        </p>
      </section>

      {/* Wrong-door box */}
      <section className="mt-8 rounded-2xl border border-line bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Is this actually about your own tax bill?</h2>
        <p className="mt-2 text-base text-ink">
          Everything on this page is about changing a rule for everyone. If your problem is an{" "}
          <strong>individual dispute</strong> — your own bill, PAYE code, penalty or return —
          none of the routes above will fix it; they influence policy, not your case.
        </p>
        <p className="mt-3 text-base text-ink">
          <Link
            href="/learn/gov/who-runs-your-taxes"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Who runs your taxes
          </Link>{" "}
          covers who to actually contact and the complaints ladder built for exactly that.
        </p>
      </section>

      <PageSources
        links={[
          { href: MP_FINDER_URL, label: "Find your MP — UK Parliament" },
          { href: MP_CONTACT_GUIDANCE_URL, label: "Contact your MP — UK Parliament" },
          { href: MP_RAISING_LEVERS_URL, label: "Raising an issue as an MP or Lord" },
          { href: EDM_REALITY_URL, label: "Early Day Motions" },
          { href: WESTMINSTER_HALL_URL, label: "Westminster Hall debates" },
          { href: WRITETOTHEM_URL, label: "WriteToThem" },
          { href: WRITETOTHEM_QA_URL, label: "WriteToThem — about & Q&A" },
          { href: TREASURY_COMMITTEE_URL, label: "Treasury Committee" },
          { href: GIVE_EVIDENCE_GUIDANCE_URL, label: "Give evidence to a select committee" },
          { href: INQUIRIES_PORTAL_URL, label: "Open inquiries accepting evidence" },
          { href: PBC_EVIDENCE_GUIDANCE_URL, label: "Input into legislation — UK Parliament" },
          { href: PBC_WRITTEN_EVIDENCE_URL, label: "Scrutiny Unit — written submissions" },
          { href: BUDGET_REPS_GUIDANCE_URL, label: "Guidance for submitting your Budget representation" },
          { href: PETITIONS_HELP_URL, label: "Petitions — how it works (petition.parliament.uk)" },
          { href: HANSARD_PERSONAL_ALLOWANCE_DEBATE_URL, label: "Hansard: personal allowance petition debate, 12 May 2025" },
          { href: MYSOCIETY_TRANSPARENCY_URL, label: "mySociety — WhatDoTheyKnow" },
          { href: CRCA_S18_URL, label: "Commissioners for Revenue and Customs Act 2005, section 18" },
          { href: CRCA_S23_URL, label: "Commissioners for Revenue and Customs Act 2005, section 23" },
          { href: HMRC_MANUAL_IDG40150_URL, label: "HMRC Information Disclosure Guide, IDG40150" },
          { href: CONSULTATION_PRINCIPLES_URL, label: "Consultation Principles" },
          { href: TAX_POLICY_PRINCIPLES_URL, label: "Tax Policy Making Principles" },
          { href: TIMELY_PAYMENTS_CONSULTATION_URL, label: "Timely Payments in income tax Self Assessment" },
          { href: THEYWORKFORYOU_ABOUT_URL, label: "TheyWorkForYou" },
          { href: LEGISLATION_UNDERSTANDING_URL, label: "legislation.gov.uk — understanding legislation" },
          { href: SI_2021_1076_EM_URL, label: "legislation.gov.uk — Explanatory Memoranda example (SI 2021/1076)" },
          { href: ORGANOGRAM_HMRC_URL, label: "HMRC organogram — data.gov.uk" },
        ]}
      />
    </div>
  );
}
