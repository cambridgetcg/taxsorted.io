import type { Metadata } from "next";
import Link from "next/link";
import { Cited } from "@/components/prep/cited";
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
      <Link href="/learn" className="text-sm text-accent hover:text-accent-deep">
        ← Back to Learn
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Who runs your taxes</h1>
      <p className="mt-3 text-ink-soft">
        HMRC collects it, Treasury ministers decide the rules, and neither can simply wave your
        individual case away — there&apos;s a real ladder for that. Here&apos;s who actually holds
        each role, how to reach them, and the official complaints route if HMRC gets{" "}
        <strong>your own</strong> case wrong.
      </p>

      <div role="note" className="mt-6 rounded-2xl border border-line bg-accent-soft p-4 text-sm text-ink sm:p-5">
        <p>
          <strong>Mechanism, not opinion.</strong> This page describes who holds which office and
          how the machine is built to work — not a verdict on any tax, minister or government.
          Names are role-anchored and date-stamped (people move on; roles don&apos;t) — check the
          linked official page for who holds a role today.
        </p>
      </div>

      {/* 1. Non-ministerial explainer */}
      <section className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          HMRC is non-ministerial — why a minister can&apos;t touch your case
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
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
        <p className="mt-3 text-sm text-ink-soft">
          Plain words: day-to-day administration of the tax system legally sits with HMRC&apos;s
          own Commissioners, not with politicians. A minister or MP cannot simply order HMRC to
          change the outcome of <strong>your</strong> individual case — that&apos;s deliberate; it
          protects impartiality. The routes that <em>do</em> work for an individual case are the
          statutory appeal/review, the complaints ladder below, the Adjudicator, and the Ombudsman
          via your MP. Your MP can still chase HMRC on your behalf and raise systemic issues — but
          that&apos;s the policy lever, not this one.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a
            href={HMRC_ORG_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            HMRC — GOV.UK
          </a>
          ,{" "}
          <a
            href={HMRC_ABOUT_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            HMRC — About us
          </a>
          .
        </p>
      </section>

      {/* 2. Policy partnership */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          The policy partnership: Treasury decides, HMRC delivers
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: HMRC_ABOUT_URL, effectiveFrom: VERIFIED_ON }}>
            HMRC&apos;s own gov.uk page states it verbatim: &ldquo;The Treasury lead on strategic
            tax policy and policy development. HMRC leads on policy maintenance and
            implementation. This arrangement for policy making is known as the &lsquo;policy
            partnership&rsquo;.&rdquo;
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Plain words: Treasury ministers decide what the tax rules <em>should be</em> — rates, new
          taxes, reliefs, announced at Budgets. HMRC keeps the machine running — collects the tax,
          runs the systems, administers the existing rules. Want a rule <em>changed</em>? Treasury
          is the decision-maker.{" "}
          <Link
            href="/learn/gov/your-levers"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Your levers
          </Link>{" "}
          covers that route. Got a problem with how an existing rule was applied to{" "}
          <strong>you</strong>? That&apos;s HMRC, and the rest of this page.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <Cited cite={{ source: HMRC_GOVERNANCE_URL, effectiveFrom: VERIFIED_ON }}>
            The two departments are linked at the top: the Exchequer Secretary to the Treasury —
            the current tax minister — chairs the HMRC Board.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Source:{" "}
          <a
            href={HMRC_ABOUT_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            HMRC — About us (the policy partnership)
          </a>
          .
        </p>
      </section>

      {/* 3. Who's who — RoleCards */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Who actually holds each role</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Every card below is role-anchored — the office is the durable fact; the named
          office-holder carries the date it was last checked. An amber badge means an entry hasn&apos;t
          been re-verified in over 90 days; check the linked page before repeating it as current.
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

      {/* 4. Anti-phishing callout — ABOVE the contact table */}
      <section className="mt-10 rounded-2xl border border-line bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">These are routes for you to contact them</h2>
        <p className="mt-2 text-sm text-ink">
          Every channel in the table below is a route for <strong>you</strong> to reach HMRC — not
          the other way round. HMRC will never call, text or email you out of the blue demanding
          payment, threatening arrest, or asking for your bank details, PIN or password. If you get
          a message like that, it is not HMRC — it&apos;s a scam.
        </p>
        <p className="mt-3 text-sm text-ink">
          Check anything that looks suspicious against{" "}
          <a
            href={SCAM_GUIDANCE_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            HMRC&apos;s own guidance on identifying scam phone calls, emails and text messages
          </a>{" "}
          before you click a link or ring back a number that didn&apos;t come from this page or
          gov.uk. And please stay civil on the phone or in writing — the people answering these
          lines aren&apos;t the ones who set the rules.
        </p>
      </section>

      {/* 5. Contact table */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-ink">Official HMRC contact routes</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Every row below is copied exactly from its own gov.uk contact page — click through to
          check it&apos;s still current before you rely on it.
        </p>
        <div className="mt-3">
          <ContactTable channels={HMRC_CHANNELS} />
        </div>

        <div className="mt-4 rounded-xl border border-line bg-accent-soft p-4 text-sm text-ink">
          <p className="font-semibold">Need extra support to get in touch?</p>
          <p className="mt-1 text-ink-soft">{extraSupportChannel.audience}.</p>
          <p className="mt-1">
            {extraSupportChannel.channel}: {extraSupportChannel.details}
          </p>
          {extraSupportChannel.hours ? (
            <p className="mt-1 text-ink-soft">{extraSupportChannel.hours}</p>
          ) : null}
        </div>
      </section>

      {/* 6. Complaints ladder */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          The complaints ladder — for when HMRC gets your case wrong
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: COMPLAINTS_URL, effectiveFrom: VERIFIED_ON }}>
            Complaints are not appeals: if you think a tax decision or penalty is <em>wrong</em>,
            use the appeal/review route instead. Complaints are for poor service — &ldquo;unreasonable
            delays, mistakes and poor treatment.&rdquo; Keep paying tax during a complaint to avoid
            interest and penalties.
          </Cited>
        </p>
        <ol className="mt-4 space-y-4 text-sm text-ink">
          <li data-step="tier-1">
            <strong>Tier 1 — first review by HMRC.</strong>{" "}
            <Cited cite={{ source: COMPLAINTS_URL, effectiveFrom: VERIFIED_ON }}>
              Complain online, by phone, or by post. Have your National Insurance number, UTR or
              VAT number ready, plus what happened and how you want it resolved. HMRC
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
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a
            href={COMPLAINTS_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Complain about HMRC — GOV.UK
          </a>
          ,{" "}
          <a
            href={ADJUDICATOR_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            The Adjudicator&apos;s Office
          </a>
          ,{" "}
          <a
            href={PHSO_MP_FILTER_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            PHSO — the MP filter
          </a>
          .
        </p>
      </section>

      {/* 7. SAR vs FOI */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          Your own data is a Subject Access Request (SAR), not FOI
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          <Cited cite={{ source: FOI_MAKE_REQUEST_URL, effectiveFrom: VERIFIED_ON }}>
            Freedom of Information gets you HMRC&apos;s policy, process, statistics and internal
            guidance. Personal data about <em>yourself</em> is not FOI — that&apos;s a
            data-protection Subject Access Request (SAR) instead.
          </Cited>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          HMRC has its own dedicated route for that:{" "}
          <a
            href={SAR_GUIDANCE_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            request your own HMRC data via a Subject Access Request
          </a>
          . It is free, and it is entirely separate from the FOI route below.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          FOI, by contrast, is for asking how HMRC works — never your own tax affairs, and never
          anyone else&apos;s (HMRC will &ldquo;neither confirm nor deny&rdquo; holding information
          about an identifiable taxpayer). HMRC&apos;s FOI route: {foiChannel.details}
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a
            href={FOI_MAKE_REQUEST_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Make a Freedom of Information request — GOV.UK
          </a>
          ,{" "}
          <a
            href={SAR_GUIDANCE_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            HMRC Subject Access Request — GOV.UK
          </a>
          .
        </p>
      </section>

      {/* 8. Devolution note */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">If you&apos;re in Scotland or Wales</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Everything above still applies — HMRC still administers and collects your Income Tax,
          National Insurance and VAT, and the same contact routes and complaints ladder are yours to
          use too. What differs is who sets your income tax <em>rates and bands</em>:{" "}
          <Cited cite={{ source: SCOTTISH_INCOME_TAX_URL, effectiveFrom: VERIFIED_ON }}>
            the Scottish Parliament sets Scottish rates and bands
          </Cited>
          , and{" "}
          <Cited cite={{ source: WELSH_INCOME_TAX_URL, effectiveFrom: VERIFIED_ON }}>
            the Senedd sets Welsh rates of income tax
          </Cited>
          . A complaint about the <em>rate itself</em> is a question for the devolved Parliament,
          not the UK routes on this page.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Sources:{" "}
          <a
            href={SCOTTISH_INCOME_TAX_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Scottish Income Tax — GOV.UK
          </a>
          ,{" "}
          <a
            href={WELSH_INCOME_TAX_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Welsh rates of Income Tax — GOV.UK
          </a>
          .
        </p>
      </section>

      {/* Wrong-door box — INVERTED: this page IS the individual-dispute door */}
      <section className="mt-8 rounded-2xl border border-line bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Is this actually about tax policy, not your own case?</h2>
        <p className="mt-2 text-sm text-ink">
          Everything above is the individual-dispute door: a wrong bill, a stuck refund, bad
          service — the complaints ladder is built for exactly that. If instead you think a{" "}
          <strong>rule itself</strong> should change — a rate, a threshold, a Making Tax Digital
          deadline — none of the routes on this page will move it.
        </p>
        <p className="mt-3 text-sm text-ink">
          <Link
            href="/learn/gov/your-levers"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Your levers
          </Link>{" "}
          covers who actually decides tax policy and how to make yourself heard.
        </p>
      </section>
    </div>
  );
}
