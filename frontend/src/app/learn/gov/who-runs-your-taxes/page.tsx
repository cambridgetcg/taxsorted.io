import type { Metadata } from "next";
import Link from "next/link";
import { Cited } from "@/components/prep/cited";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import { ExternalLink, PageSources } from "@/components/gov/sources";
import { RoleCard } from "@/components/gov/role-card";
import { ContactTable } from "@/components/gov/contact-table";
import { ROLES, HMRC_CHANNELS, type RoleEntry } from "@/lib/gov/contacts";

// i18n: deferred to M2 — plain English for launch

// Fact sources: regs/research/gov/hmrc-anatomy.md + regs/research/gov/treasury.md
// (fetched/verified 2026-07-06), plus regs/research/gov/transparency-tools.md (the
// FOI-vs-SAR fork) and regs/research/gov/gaps.md (the SAR guidance URL and the
// HMRC scam-identification URL, both independently live-checked 2026-07-06 per
// that file's "Live checks performed" log). No source outside regs/research/gov/
// was used. Structured contact facts (roles, holders, channels) are NOT
// retyped here — every RoleCard and ContactTable row reads straight from
// `frontend/src/lib/gov/contacts.ts`, which itself transcribes only from the
// corpus; this page interpolates specific channel `.details` fields (the
// Adjudicator's Office, the Ombudsman, FOI) rather than hand-copying phone
// numbers or addresses a second time.
//
// FOI address correction (gov-pillar Task 3 build, 2026-07-06): the corpus
// was internally inconsistent — hmrc-anatomy.md said "FoI Act Team, 7th
// Floor", transparency-tools.md said "Freedom of Information Team, 6th
// Floor" (both Central Mail Unit, NE98 1ZZ). Before shipping the FOI address
// below, HMRC's live publication-scheme page was fetched directly (WebFetch,
// 2026-07-06) and confirmed "HMRC Freedom of Information Team" on the 6th
// Floor. Both corpus files now carry a ⚠ CORRECTION note recording this and
// upgrading confidence; only the live-verified version ships here (via
// contacts.ts's `foi-hmrc` channel, which already matched it).
const VERIFIED_ON = "2026-07-06";

const HMRC_ORG_URL = "https://www.gov.uk/government/organisations/hm-revenue-customs";
const HMRC_ABOUT_URL = "https://www.gov.uk/government/organisations/hm-revenue-customs/about";
const HMRC_GOVERNANCE_URL =
  "https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance";
const COMPLAINTS_URL = "https://www.gov.uk/complain-about-hmrc";
const ADJUDICATOR_URL = "https://www.gov.uk/government/organisations/the-adjudicator-s-office";
const PHSO_MP_FILTER_URL =
  "https://www.ombudsman.org.uk/making-complaint/information-mps/helping-your-constituents-use-our-service";
const FOI_MAKE_REQUEST_URL = "https://www.gov.uk/make-a-freedom-of-information-request";
const SAR_GUIDANCE_URL = "https://www.gov.uk/guidance/hmrc-subject-access-request";
const SCAM_GUIDANCE_URL =
  "https://www.gov.uk/guidance/identify-hmrc-related-scam-phone-calls-emails-and-text-messages";
const SCOTTISH_INCOME_TAX_URL = "https://www.gov.uk/scottish-income-tax";
const WELSH_INCOME_TAX_URL = "https://www.gov.uk/welsh-income-tax";

const ROLE_GROUPS: Array<{ heading: string; body: RoleEntry["body"] }> = [
  { heading: "HM Treasury — decides tax policy", body: "hmt" },
  { heading: "HMRC — runs the system day to day", body: "hmrc" },
  { heading: "Independent scrutiny", body: "independent" },
  { heading: "Parliament", body: "parliament" },
];

export const metadata: Metadata = {
  title: "Who runs your taxes — TaxSorted",
  description:
    "Who's actually in charge of HMRC and the tax rules, the real complaints ladder for your own case, and the verified, official routes to reach every one of them.",
};

export default function WhoRunsYourTaxesPage() {
  const adjudicatorChannel = HMRC_CHANNELS.find((c) => c.id === "adjudicators-office-contact")!;
  const phsoChannel = HMRC_CHANNELS.find((c) => c.id === "phso-via-mp")!;
  const foiChannel = HMRC_CHANNELS.find((c) => c.id === "foi-hmrc")!;
  const extraSupportChannel = HMRC_CHANNELS.find((c) => c.id === "extra-support-team")!;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ href: "/learn", label: "Learn" }]} current="Who runs your taxes" />

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Who runs your taxes</h1>
      <p className="mt-3 text-base text-ink-soft">
        This page shows who to contact when HMRC gets <strong>your own</strong>{" "} case wrong — and
        who actually holds each role behind the tax system.
      </p>

      <ShortVersion className="mt-6">
        <li>
          Case gone wrong? The ladder: complain to HMRC (Tier 1), ask for a second review
          (Tier 2), then the free Adjudicator, then the Ombudsman via your MP.
        </li>
        <li>
          Think a tax decision or penalty is <em>wrong</em>? That&apos;s an appeal, not a
          complaint — a separate route.
        </li>
        <li>
          Treasury ministers decide the rules; HMRC runs the system. A minister cannot change
          your individual case.
        </li>
        <li>HMRC never calls, texts or emails out of the blue demanding payment. That&apos;s a scam.</li>
      </ShortVersion>

      <div role="note" className="mt-6 rounded-2xl border border-line bg-accent-soft p-4 text-base text-ink sm:p-5">
        <p>
          <strong>Mechanism, not opinion.</strong>{" "} This page describes who holds which office and
          how the machine is built to work — not a verdict on any tax, minister or government.
          Names are role-anchored and date-stamped (people move on; roles don&apos;t) — check the
          linked official page for who holds a role today.
        </p>
      </div>

      {/* 1. Complaints ladder — the page's most-wanted answer, so it comes first */}
      <section className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          The complaints ladder — for when HMRC gets your case wrong
        </h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: COMPLAINTS_URL, effectiveFrom: VERIFIED_ON }}>
            Complaints are not appeals: if you think a tax decision or penalty is <em>wrong</em>,
            use the appeal/review route instead. Complaints are for poor service — &ldquo;unreasonable
            delays, mistakes and poor treatment.&rdquo; Keep paying tax during a complaint to avoid
            interest and penalties.
          </Cited>
        </p>
        <ol className="mt-4 space-y-4 text-base text-ink">
          <li data-step="tier-1">
            <strong>Tier 1 — first review by HMRC.</strong>{" "}
            <Cited cite={{ source: COMPLAINTS_URL, effectiveFrom: VERIFIED_ON }}>
              Complain online, by phone, or by post. Have your National Insurance number, your
              Unique Taxpayer Reference (UTR — the 10-digit number on HMRC letters) or your VAT
              number ready, plus what happened and how you want it resolved. HMRC
              &ldquo;investigate what happened and what should have happened.&rdquo;
            </Cited>
          </li>
          <li data-step="tier-2">
            <strong>Tier 2 — second review by HMRC.</strong>{" "}
            <Cited cite={{ source: COMPLAINTS_URL, effectiveFrom: VERIFIED_ON }}>
              A different person reviews how the first complaint was handled. &ldquo;The decision
              from the second tier review is final&rdquo; — within HMRC.
            </Cited>
          </li>
          <li data-step="adjudicator">
            <strong>Adjudicator&apos;s Office.</strong>{" "}
            <Cited cite={{ source: ADJUDICATOR_URL, effectiveFrom: VERIFIED_ON }}>
              &ldquo;This service is free and independent of HMRC&rdquo; — it checks whether HMRC
              applied its rules, standards, guidance and codes of practice fairly and consistently,
              once tier 1 and tier 2 are both done.
            </Cited>{" "}
            <span>{adjudicatorChannel.details}</span>
          </li>
          <li data-step="ombudsman">
            <strong>Parliamentary and Health Service Ombudsman — via your MP.</strong>{" "}
            <Cited cite={{ source: PHSO_MP_FILTER_URL, effectiveFrom: VERIFIED_ON }}>
              &ldquo;By law, complaints about UK Government departments and other UK public
              organisations must be referred to us by an MP.&rdquo; This is the &ldquo;MP
              filter&rdquo; — you cannot go to the Ombudsman directly.
            </Cited>{" "}
            <span>{phsoChannel.details}</span>
          </li>
        </ol>
      </section>

      {/* 2. Anti-phishing callout — ABOVE the contact table */}
      <section className="mt-8 rounded-2xl border border-line bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">These are routes for you to contact them</h2>
        <p className="mt-2 text-base text-ink">
          Every channel in the table below is a route for <strong>you</strong>{" "} to reach HMRC — not
          the other way round. HMRC will never call, text or email you out of the blue demanding
          payment, threatening arrest, or asking for your bank details, PIN or password. If you get
          a message like that, it is not HMRC — it&apos;s a scam.
        </p>
        <p className="mt-3 text-base text-ink">
          Check anything suspicious against{" "}
          <ExternalLink href={SCAM_GUIDANCE_URL}>
            HMRC&apos;s own guidance on identifying scam calls, emails and texts
          </ExternalLink>{" "}
          before you click a link or ring back a number that didn&apos;t come from this page or
          gov.uk. And please stay civil on the phone or in writing — the people answering these
          lines aren&apos;t the ones who set the rules.
        </p>
      </section>

      {/* 3. Contact table */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-ink">Official HMRC contact routes</h2>
        <p className="mt-2 text-base text-ink-soft">
          Every row below is copied exactly from its own gov.uk contact page — click through to
          check it&apos;s still current before you rely on it.
        </p>
        <div className="mt-3">
          <ContactTable channels={HMRC_CHANNELS} />
        </div>

        <div className="mt-4 rounded-xl border border-line bg-accent-soft p-4 text-base text-ink">
          <p className="font-semibold">Need extra support to get in touch?</p>
          <p className="mt-1 text-ink-soft">{extraSupportChannel.audience}.</p>
          <p className="mt-1">
            {extraSupportChannel.channel}: {extraSupportChannel.details}
          </p>
          {extraSupportChannel.hours ? (
            <p className="mt-1 text-ink-soft">{extraSupportChannel.hours}</p>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-line bg-white p-4 text-base text-ink">
          <p className="font-semibold">
            What we&apos;re legally required to send when we contact HMRC on your behalf
          </p>
          <p className="mt-1 text-ink-soft">
            Every call our software makes to HMRC carries a set of fraud-prevention headers
            about your browser and device — required by UK law, not our choice.
          </p>
          <Link
            href="/learn/gov/what-we-send-hmrc"
            className="mt-1 inline-block font-medium text-accent underline hover:text-accent-deep"
          >
            See exactly what we send, and why
          </Link>
        </div>
      </section>

      {/* 4. Who's who — RoleCards */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Who actually holds each role</h2>
        <p className="mt-2 text-base text-ink-soft">
          Every card below is role-anchored — the office is the durable fact; the named
          office-holder carries the date it was last checked. An amber badge means an entry
          hasn&apos;t been re-verified in over 90 days; check the linked page before repeating it
          as current.
        </p>
        {ROLE_GROUPS.map((group) => (
          <div key={group.body} className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              {group.heading}
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {ROLES.filter((r) => r.body === group.body).map((role) => (
                <RoleCard key={role.id} role={role} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* 5. Non-ministerial explainer */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          Why a minister can&apos;t touch your case
        </h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: HMRC_ORG_URL, effectiveFrom: VERIFIED_ON }}>
            gov.uk states plainly: &ldquo;HMRC is a non-ministerial department, supported by 1
            public body.&rdquo;
          </Cited>{" "}
          <Cited cite={{ source: HMRC_ABOUT_URL, effectiveFrom: VERIFIED_ON }}>
            It is &ldquo;a non-ministerial Department established by the Commissioners for Revenue
            and Customs Act (CRCA) 2005&rdquo;, with responsibility vested &ldquo;in Commissioners
            appointed by the King&rdquo; — and it &ldquo;report[s] to Parliament through our
            Treasury minister who oversees our spending.&rdquo;
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Plain words: the day-to-day running of the tax system legally sits with HMRC&apos;s own
          Commissioners, not with politicians. A minister or MP cannot order HMRC to change the
          outcome of <strong>your</strong>{" "} case. That&apos;s deliberate — it protects
          impartiality.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          The routes that <em>do</em>{" "} work for an individual case: the statutory appeal/review,
          the complaints ladder above, the Adjudicator, and the Ombudsman via your MP. Your MP
          can still chase HMRC on your behalf and raise systemic issues — but that&apos;s the
          policy lever, not this one.
        </p>
      </section>

      {/* 6. Policy partnership */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          The policy partnership: Treasury decides, HMRC delivers
        </h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: HMRC_ABOUT_URL, effectiveFrom: VERIFIED_ON }}>
            HMRC&apos;s own gov.uk page states it verbatim: &ldquo;The Treasury lead on strategic
            tax policy and policy development. HMRC leads on policy maintenance and
            implementation. This arrangement for policy making is known as the &lsquo;policy
            partnership&rsquo;.&rdquo;
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Plain words: Treasury ministers decide what the rules <em>should be</em> — rates, new
          taxes, reliefs, announced at Budgets. HMRC keeps the machine running: collecting tax
          and applying the existing rules.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Want a rule <em>changed</em>? Treasury is the decision-maker —{" "}
          <Link
            href="/learn/gov/your-levers"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Your levers
          </Link>{" "}
          covers that route. Got a problem with how a rule was applied to <strong>you</strong>?
          That&apos;s HMRC, and the ladder above.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          <Cited cite={{ source: HMRC_GOVERNANCE_URL, effectiveFrom: VERIFIED_ON }}>
            The two departments are linked at the top: the Exchequer Secretary to the Treasury —
            the current tax minister — chairs the HMRC Board.
          </Cited>
        </p>
      </section>

      {/* 7. SAR vs FOI */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          Your own data is a Subject Access Request (SAR), not FOI
        </h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: FOI_MAKE_REQUEST_URL, effectiveFrom: VERIFIED_ON }}>
            Freedom of Information (FOI) gets you HMRC&apos;s policy, process, statistics and
            internal guidance. Personal data about <em>yourself</em>{" "} is not FOI — that&apos;s a
            data-protection Subject Access Request (SAR) instead.
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          HMRC has its own dedicated route for that:{" "}
          <ExternalLink href={SAR_GUIDANCE_URL}>
            request your own HMRC data via a Subject Access Request
          </ExternalLink>
          . It is free, and it is entirely separate from FOI.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          FOI, by contrast, is for asking how HMRC works — never your own tax affairs, and never
          anyone else&apos;s (HMRC will &ldquo;neither confirm nor deny&rdquo; holding information
          about an identifiable taxpayer). HMRC&apos;s FOI route: {foiChannel.details}
        </p>
      </section>

      {/* 8. Devolution note */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">If you&apos;re in Scotland or Wales</h2>
        <p className="mt-2 text-base text-ink-soft">
          Everything above still applies — HMRC still administers and collects your Income Tax,
          National Insurance and VAT, and the same contact routes and complaints ladder are yours to
          use too. What differs is who sets your income tax <em>rates and bands</em>:{" "}
          <Cited cite={{ source: SCOTTISH_INCOME_TAX_URL, effectiveFrom: VERIFIED_ON }}>
            the Scottish Parliament sets Scottish rates and bands
          </Cited>
          , and{" "}
          <Cited cite={{ source: WELSH_INCOME_TAX_URL, effectiveFrom: VERIFIED_ON }}>
            the Senedd (the Welsh Parliament) sets Welsh rates of income tax
          </Cited>
          . A complaint about the <em>rate itself</em>{" "} is a question for the devolved Parliament,
          not the UK routes on this page.
        </p>
      </section>

      {/* Wrong-door box — INVERTED: this page IS the individual-dispute door */}
      <section className="mt-8 rounded-2xl border border-line bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Is this actually about tax policy, not your own case?</h2>
        <p className="mt-2 text-base text-ink">
          Everything above is the individual-dispute door: a wrong bill, a stuck refund, bad
          service — the complaints ladder is built for exactly that. If instead you think a{" "}
          <strong>rule itself</strong>{" "} should change — a rate, a threshold, a Making Tax Digital
          deadline — none of the routes on this page will move it.
        </p>
        <p className="mt-3 text-base text-ink">
          <Link
            href="/learn/gov/your-levers"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Your levers
          </Link>{" "}
          covers who actually decides tax policy and how to make yourself heard.
        </p>
      </section>

      <PageSources
        links={[
          { href: COMPLAINTS_URL, label: "Complain about HMRC — GOV.UK" },
          { href: ADJUDICATOR_URL, label: "The Adjudicator's Office" },
          { href: PHSO_MP_FILTER_URL, label: "Parliamentary and Health Service Ombudsman — the MP filter" },
          { href: SCAM_GUIDANCE_URL, label: "HMRC — identify scam phone calls, emails and texts" },
          { href: HMRC_ORG_URL, label: "HMRC — GOV.UK" },
          { href: HMRC_ABOUT_URL, label: "HMRC — About us (the policy partnership)" },
          { href: HMRC_GOVERNANCE_URL, label: "HMRC — our governance" },
          { href: FOI_MAKE_REQUEST_URL, label: "Make a Freedom of Information request — GOV.UK" },
          { href: SAR_GUIDANCE_URL, label: "HMRC Subject Access Request — GOV.UK" },
          { href: SCOTTISH_INCOME_TAX_URL, label: "Scottish Income Tax — GOV.UK" },
          { href: WELSH_INCOME_TAX_URL, label: "Welsh rates of Income Tax — GOV.UK" },
        ]}
      />
    </div>
  );
}
