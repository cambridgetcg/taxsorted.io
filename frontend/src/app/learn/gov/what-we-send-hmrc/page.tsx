import type { Metadata } from "next";
import { Cited } from "@/components/prep/cited";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import { PageSources } from "@/components/gov/sources";
import { HeaderPreview } from "./header-preview";

// i18n: deferred to M2 — plain English for launch

// Fact source for every quote and figure on this page: regs/research/fraud-headers.md
// (spec v3.3, independently re-verified 2026-07-03 — every quote re-checked against
// live primary sources, raw copies saved alongside that file). No fact here is
// invented; where the corpus itself flags something as analysis rather than a
// direct quote, this page says so in plain words instead of wrapping it in Cited.
const VERIFIED_ON = "2026-07-03";

const SI_URL = "https://www.legislation.gov.uk/uksi/2019/360/made";
const DIRECTIONS_URL =
  "https://www.gov.uk/government/publications/direction-under-regulation-22-of-the-delivery-of-tax-information-through-software-ancillary-metadata-regulations-2019-si-2019360";
const WEBAPP_SPEC_URL =
  "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/web-app-via-server/";
const GETTING_IT_RIGHT_URL =
  "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/getting-it-right/";
const DPIA_URL =
  "https://developer.service.hmrc.gov.uk/api-documentation/assets/content/documentation/3f4c263faa8231bea05c1826b7f6b81c-TxM%20DPIA%20v3%201%20Public.pdf";
const ICO_LEGAL_OBLIGATION_URL =
  "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/legal-obligation/";

interface HeaderRow {
  name: string;
  what: string;
  why: string;
  cannotCollect?: true;
  /** Only set for the cannotCollect duo: the specific reason TaxSorted
      can't honestly send this one today (research §2.3's missing-data
      protocol requires a documented reason, not a bare omission). */
  reason?: string;
  /** TaxSorted's own sending behaviour for this header, in plain words —
      NOT a spec fact, so it renders outside the spec citation (the `what`
      column is HMRC's spec, cited; this is us, uncited). Used where when-we-
      send-it is TaxSorted-specific rather than universal (Gov-Client-Multi-
      Factor: only for passkey sessions). */
  sending?: string;
}

// Every entry's "what it contains" cites the same source: the WEB_APP_VIA_SERVER
// header spec, the one page that lists all 16 required headers for our
// connection method (regs/research/fraud-headers.md §1, §2.2). The "why HMRC
// wants it" text is our own plain-words reading, not a spec quote — HMRC's
// spec page documents header format, not per-header rationale, so that part
// is deliberately left uncited. Order matches the spec's own numbering
// (research lines 56-71).
const HEADER_ROWS: HeaderRow[] = [
  {
    name: "Gov-Client-Connection-Method",
    what: "Always the fixed value WEB_APP_VIA_SERVER — it says your request travelled from your browser through our servers, not straight from your device.",
    why: "Tells HMRC which connection pattern to expect, since different patterns imply different header sets and different fraud checks.",
  },
  {
    name: "Gov-Client-Browser-JS-User-Agent",
    what: "Your browser's own user-agent string, read straight from navigator.userAgent — the same string most websites can already see.",
    why: "Cross-checked against the connection method and other signals, to catch requests that claim to be a browser but aren't.",
  },
  {
    name: "Gov-Client-Device-ID",
    what: "A random ID with no name attached, held in a cookie our server manages. It persists across your visits so the same device can be recognised again.",
    why: "Lets HMRC's fraud systems link activity back to a consistent device over time, without needing to know who you are.",
  },
  {
    name: "Gov-Client-Multi-Factor",
    what: "One entry per authentication factor you cleared when signing in — its type, the time you passed it, and a hashed reference to the factor, never the raw code, secret or phone number.",
    why: "Signals how strongly your sign-in to our software was verified.",
    sending:
      "Sent when you signed in with a passkey this session: the time you last passed the passkey prompt and a hashed reference to which passkey — never the key itself. Omitted for anonymous use — we don't invent it.",
  },
  {
    name: "Gov-Client-Public-IP",
    what: "The public internet address your device is browsing from, right now.",
    why: "A core fraud signal — flags patterns like one account filing from wildly different places within minutes.",
  },
  {
    name: "Gov-Client-Public-IP-Timestamp",
    what: "The exact moment, to the millisecond, that we captured your public IP address.",
    why: "IP addresses change; pinning the exact capture time lets HMRC line it up against everything else about that same instant.",
  },
  {
    name: "Gov-Client-Public-Port",
    what: "The specific network port your own browser used to send this request — never a server port such as 443.",
    why: "Another device-fingerprinting signal, used the same way as Public-IP.",
    cannotCollect: true,
    reason:
      "We run behind Fly.io's proxy, which exposes the server port your browser connected to, never the ephemeral source port your own browser used. That source port is genuinely unobtainable from where our server sits.",
  },
  {
    name: "Gov-Client-Screens",
    what: "Your screen's width, height, scaling factor and colour depth.",
    why: "A device fingerprint — genuine devices report consistent, plausible screen data; automated or spoofed requests often don't.",
  },
  {
    name: "Gov-Client-Timezone",
    what: "Your device's timezone offset from UTC, formatted as UTC±hh:mm.",
    why: "Cross-checked against where your IP address appears to be, for consistency.",
  },
  {
    name: "Gov-Client-User-IDs",
    what: "The identifier you're signed in with inside our software — your account's ID once you're signed in, otherwise the anonymous session ID. Never your real name or your HMRC login.",
    why: "Links this request to one account inside our software, so HMRC can build a picture across every API call from the same user.",
  },
  {
    name: "Gov-Client-Window-Size",
    what: "The pixel width and height of your actual browser window — not your whole screen.",
    why: "Another fingerprint signal, cross-checked against Screens.",
  },
  {
    name: "Gov-Vendor-Forwarded",
    what: "The chain of servers, by IP address, that carried your request from us onward to HMRC.",
    why: "Lets HMRC check that the IP addresses named in every other header line up honestly with each other.",
  },
  {
    name: "Gov-Vendor-License-IDs",
    what: "Hashed licence keys for any licensed software installed on your device.",
    why: "Flags fraud patterns HMRC has seen tied to licensed software elsewhere.",
    cannotCollect: true,
    reason:
      "TaxSorted is free, open-source software. There is no licensed component on your device to hash a licence key for.",
  },
  {
    name: "Gov-Vendor-Product-Name",
    what: "Our product's own name — always TaxSorted.",
    why: "Identifies which piece of software actually sent the request.",
  },
  {
    name: "Gov-Vendor-Public-IP",
    what: "Our own server's public IP address.",
    why: "Identifies us as the vendor, and is cross-checked against Vendor-Forwarded.",
  },
  {
    name: "Gov-Vendor-Version",
    what: "Version numbers for both our frontend and our server.",
    why: "Lets HMRC correlate a fraud pattern with a specific software release, in case an issue turns out to be version-specific.",
  },
];

const CANNOT_COLLECT = HEADER_ROWS.filter((h) => h.cannotCollect);

export const metadata: Metadata = {
  title: "What we send to HMRC — TaxSorted",
  description:
    "The 16 fraud-prevention headers UK law requires every MTD filing to carry — what each one contains, why HMRC wants it, what we honestly can't collect yet, and a live preview of your own browser's values.",
};

function CannotCollectBadge() {
  return (
    <span className="ml-2 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
      cannot collect yet
    </span>
  );
}

export default function WhatWeSendHmrcPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ href: "/learn", label: "Learn" }]} current="What we send to HMRC" />

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">What we send to HMRC — and why</h1>
      <p className="mt-3 text-base text-ink-soft">
        This page shows the data our software must send HMRC alongside your tax filings — all of
        it, in plain words.
      </p>

      <ShortVersion className="mt-6">
        <li>
          When software like ours talks to HMRC, UK law makes it send facts about your browser
          and device — 16 of them for the way we connect.
        </li>
        <li>This page lists all 16 — most software never mentions them.</li>
        <li>
          Two of them we honestly can&apos;t collect, so we leave them out. We never invent a
          value.
        </li>
        <li>At the bottom, you can see live what your own browser would send.</li>
      </ShortVersion>

      {/* 1. Why these headers exist */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Why we have to send these at all</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: SI_URL, si: "SI 2019/360, reg 3(2)", effectiveFrom: VERIFIED_ON }}>
            The law itself: &ldquo;The software supplier must ensure that the program operates so
            that it (a) collects, and (b) delivers to the Commissioners, the relevant ancillary
            metadata.&rdquo;
          </Cited>{" "}
          That&apos;s us — any software that files Making Tax Digital VAT or Income Tax returns
          must send this data with every call. It is not optional and it is not our choice.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          <Cited cite={{ source: SI_URL, si: "SI 2019/360, reg 4", effectiveFrom: VERIFIED_ON }}>
            Getting it wrong carries a real penalty: up to <strong>£3,000</strong>{" "} per program,
            at most once every 12 months, with the same appeal rights as any other HMRC penalty.
          </Cited>{" "}
          <Cited cite={{ source: DIRECTIONS_URL, effectiveFrom: VERIFIED_ON }}>
            The exact list of 16 headers below has the force of law under the Commissioners&apos;
            Directions, which &ldquo;have effect from 16 October 2023&rdquo;.
          </Cited>
        </p>
      </section>

      {/* 2. The 16 headers */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">The 16 headers, one by one</h2>
        <p className="mt-2 text-base text-ink-soft">
          For each header, &ldquo;what it contains&rdquo; is HMRC&apos;s own specification —
          select the small source marker after it to see the source. &ldquo;Why HMRC wants
          it&rdquo; is our plain-words reading; HMRC doesn&apos;t publish per-header reasons, so
          that part isn&apos;t cited.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Headers tagged{" "}
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
            cannot collect yet
          </span>{" "}
          are explained fully in the section right after this list.
        </p>
        <ul className="mt-4 space-y-3">
          {HEADER_ROWS.map((h) => (
            <li
              key={h.name}
              data-header={h.name}
              className="rounded-2xl border border-line bg-white p-4 sm:p-5"
            >
              <h3 className="break-all font-mono text-sm font-semibold text-ink">
                {h.name}
                {h.cannotCollect ? <CannotCollectBadge /> : null}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-5">
                <div>
                  <p className="text-sm font-medium text-ink-soft">What it contains</p>
                  <p className="mt-1 text-base text-ink">
                    <Cited cite={{ source: WEBAPP_SPEC_URL, effectiveFrom: VERIFIED_ON }}>
                      {h.what}
                    </Cited>
                  </p>
                  {h.sending ? (
                    // TaxSorted's own sending behaviour — not a spec fact, so
                    // it sits outside the citation above (we never cite our
                    // own conduct to HMRC's specification).
                    <p className="mt-2 text-sm text-ink-soft">{h.sending}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-soft">Why HMRC wants it</p>
                  <p className="mt-1 text-base text-ink-soft">{h.why}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. The cannot-collect duo */}
      <section
        data-section="cannot-collect"
        className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6"
      >
        <h2 className="text-lg font-semibold text-ink">
          Two headers we honestly can&apos;t send yet
        </h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: GETTING_IT_RIGHT_URL, effectiveFrom: VERIFIED_ON }}>
            HMRC&apos;s own rules allow this: &ldquo;If you are unable to submit a header, you
            must contact us to explain why … After discussing a missing header with us, you can
            omit the header or submit it with an empty value. You must not include a placeholder
            value, for example null or undefined.&rdquo;
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          We follow that route for two headers today. Each will be raised with HMRC&apos;s
          SDSTeam@hmrc.gov.uk before we apply for production access (the drafts are written, not
          yet sent). Neither is ever guessed at or filled in with a fake number.
        </p>
        <ul className="mt-4 space-y-3 text-base text-ink">
          {CANNOT_COLLECT.map((h) => (
            <li key={h.name}>
              <strong className="font-mono text-sm">{h.name}</strong> — {h.reason}
            </li>
          ))}
        </ul>
      </section>

      {/* 4. HMRC's side */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What HMRC does with this data</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: DPIA_URL, effectiveFrom: VERIFIED_ON }}>
            HMRC&apos;s own public Data Protection Impact Assessment for this system
            (&ldquo;Transaction Monitoring&rdquo;, TxM) says it &ldquo;records customer activity
            across HMRC customer facing services … to detect suspicious behaviours which might
            indicate fraud or crime&rdquo;; alerts are reviewed by a human, never a fully
            automated decision.
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          <Cited cite={{ source: DPIA_URL, effectiveFrom: VERIFIED_ON }}>
            HMRC relies on its own public task, not your consent: &ldquo;TxM are not required to
            seek consent from customers.&rdquo; HMRC&apos;s lawful basis is &ldquo;Article
            6(1)(e) of the GDPR&rdquo; — public task — because &ldquo;the collection and supply
            of this data is mandated by Statutory Instrument.&rdquo;
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          <Cited cite={{ source: DPIA_URL, effectiveFrom: VERIFIED_ON }}>
            It is kept for &ldquo;6 years + current year&rdquo; — HMRC says this follows its own
            records management and retention and disposal policy — and &ldquo;may share TxM data
            with other government departments, the Police and the National Cyber Security
            Centre for the purposes of prevention and detection of crime.&rdquo;
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          What we do <em>not</em>{" "} do: nothing beyond passing this data on to HMRC as the law
          requires. We don&apos;t keep our own separate copy of your fingerprint data beyond what
          transporting the request itself requires.
        </p>
      </section>

      {/* 5. Our side */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Our own legal basis for collecting it</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: ICO_LEGAL_OBLIGATION_URL, effectiveFrom: VERIFIED_ON }}>
            Our collection and onward transmission of this data fits UK GDPR (the UK&apos;s
            data-protection law), <strong>Article 6(1)(c) — legal obligation</strong>:
            &ldquo;processing is necessary for compliance with a legal obligation to which the
            controller is subject.&rdquo; The obligation we point to is SI 2019/360 and the
            Commissioners&apos; Directions above.
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          <Cited cite={{ source: ICO_LEGAL_OBLIGATION_URL, effectiveFrom: VERIFIED_ON }}>
            One consequence is worth saying plainly: under this basis, &ldquo;the individual has
            no right to erasure, right to data portability, or right to object&rdquo; for this
            specific processing. That&apos;s the law&apos;s own trade-off, not ours — we&apos;re
            telling you rather than burying it.
          </Cited>
        </p>
      </section>

      {/* 6. reg 3(4) — you can block this */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">You can block this — here&apos;s what that means</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: SI_URL, si: "SI 2019/360, reg 3(4)", effectiveFrom: VERIFIED_ON }}>
            The law itself carves this out: &ldquo;The program is not required to collect or
            deliver relevant ancillary metadata to the extent that the person using it … has
            blocked the collection of, or manipulated, such metadata.&rdquo;
          </Cited>{" "}
          If your browser settings block something we&apos;d normally collect — a script,
          cookies, a fingerprinting API — that doesn&apos;t put us in breach of our legal duty.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          The honest caveat: these headers exist to help HMRC&apos;s fraud systems recognise
          genuine activity. Block collection, and those systems have less to go on — so they may
          look at your account more closely, not less. That isn&apos;t a threat from us;
          it&apos;s the logical shape of a system built to flag missing or unusual data.
        </p>
      </section>

      {/* 7. Live preview */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          This is what your browser would contribute right now
        </h2>
        <p className="mt-2 text-base text-ink-soft">
          Built from the exact same code that runs on every real request — not a mock, not a
          re-typed example. Nothing here is sent anywhere by loading this page; it&apos;s a
          preview, computed locally, of the same four values your browser would hand over the
          next time we actually call HMRC.
        </p>
        <HeaderPreview />
      </section>

      <PageSources
        links={[
          { href: SI_URL, label: "SI 2019/360 — the ancillary metadata regulations" },
          { href: DIRECTIONS_URL, label: "Commissioners' Directions — the exact header list" },
          { href: WEBAPP_SPEC_URL, label: "HMRC header specification for web apps via server" },
          { href: GETTING_IT_RIGHT_URL, label: "HMRC fraud-prevention guidance: getting it right" },
          { href: DPIA_URL, label: "HMRC Transaction Monitoring — Data Protection Impact Assessment (PDF)" },
          { href: ICO_LEGAL_OBLIGATION_URL, label: "ICO guide to the legal-obligation lawful basis" },
        ]}
      />

    </div>
  );
}
