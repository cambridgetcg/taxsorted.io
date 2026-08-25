import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trust and boundaries — data, capability and control | TaxSorted",
  description:
    "What TaxSorted stores, what stays in your browser, what can be submitted, where the product stops, and how to leave with your work.",
};

const BOUNDARIES = [
  {
    title: "Reading and learning",
    state: "No account required",
    body: "Public guides, source maps, Checkup routing and the public UK system can be read without creating a TaxSorted Account. Your chosen language and optional learning progress use ordinary browser storage on that device.",
  },
  {
    title: "Starter Books",
    state: "Browser-local",
    body: "Reviewed money records live in this browser’s IndexedDB. A TaxSorted Account does not back them up or encrypt them. Clearing site data can erase them, so export a portable copy you control.",
  },
  {
    title: "Tax Position Passport",
    state: "Saved only when you choose",
    body: "Opening the Passport does not create a saved record. Save stores a separate browser-local draft. Exported JSON and printable files leave the browser unencrypted and should be handled carefully.",
  },
  {
    title: "Accounts and connections",
    state: "Separate permission boundary",
    body: "Passkey accounts, provider connections and HMRC sandbox connections are separate from local books. Permission to read records is not permission to edit, file, pay or represent you; those powers must remain separate.",
  },
  {
    title: "Filing",
    state: "Production filing not live",
    body: "TaxSorted can prepare bounded figures and demonstrate HMRC sandbox flows. It is not yet recognised for production VAT or MTD Income Tax filing. Prepared, approved, submitted and received never mean the same thing.",
  },
  {
    title: "Personal planning and disputes",
    state: "No confidential intake",
    body: "Planning checks run from facts you control and state their scope. TaxSorted does not accept live dispute files, assess the merits of a case or act before HMRC or a tribunal. Public feedback must not contain personal tax information.",
  },
] as const;

export default function TrustPage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-4xl">
        <p className="section-label">Trust · power to inspect and leave</p>
        <h1 className="hero-title mt-5 text-ink">The boundary should be as visible as the feature.</h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-ink-soft">
          This page gathers the product truths that otherwise become small print: what stays on
          your device, what reaches a service, what TaxSorted can actually do, and how to keep your
          work without staying here.
        </p>
      </header>

      <section aria-labelledby="data-title" className="mt-20">
        <p className="section-label">01 · Data and capability</p>
        <h2 id="data-title" className="section-title mt-4 text-ink">One feature, one explicit boundary.</h2>
        <div className="hairline-grid mt-8 grid overflow-hidden rounded-[2rem] border border-line md:grid-cols-2">
          {BOUNDARIES.map((boundary) => (
            <article key={boundary.title} className="bg-surface p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{boundary.state}</p>
              <h3 className="mt-3 font-display text-2xl font-semibold text-ink">{boundary.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{boundary.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="control-title" className="mt-20 grid gap-6 rounded-[2rem] border border-line bg-paper p-6 sm:p-8 md:grid-cols-2">
        <div>
          <p className="section-label">02 · Your control</p>
          <h2 id="control-title" className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">Export, revoke, delete, leave.</h2>
          <ul className="mt-5 list-disc space-y-2 ps-5 text-sm leading-6 text-ink-soft">
            <li>Export local books and Passport data before clearing browser storage.</li>
            <li>Disconnect an HMRC sandbox module without giving it another permission.</li>
            <li>Provider sign-in connections are not live yet; when they are, scoped disconnect must be an ordinary product path.</li>
            <li>Keep public explanations and sources available without a paid account.</li>
            <li>Use open-source code and documented formats rather than depending on one vendor.</li>
          </ul>
        </div>
        <div>
          <p className="section-label">03 · What is not claimed</p>
          <ul className="mt-5 list-disc space-y-2 ps-5 text-sm leading-6 text-ink-soft">
            <li>No production-filing recognition yet.</li>
            <li>No encrypted cloud backup for browser-local books or Passport files.</li>
            <li>No guarantee that every calculation covers every fact or tax.</li>
            <li>No accessibility certification or independent security certification is claimed here.</li>
            <li>No HMRC endorsement, professional review or adviser relationship is implied.</li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="build-title" className="mt-20">
        <p className="section-label">04 · Inspect the build</p>
        <h2 id="build-title" className="section-title mt-4 text-ink">Sources, code and corrections stay open.</h2>
        <p className="mt-4 max-w-3xl leading-7 text-ink-soft">
          TaxSorted is built by one human and AI collaborators. Tax calculations live in tested,
          versioned TypeScript rules rather than being invented by a language model at the point
          of use. Sources, unknowns and effective dates stay beside bounded answers.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a href="https://github.com/cambridgetcg/taxsorted.io" target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline underline-offset-4">Read the source code ↗ <span className="sr-only">(opens in a new tab)</span></a>
          <Link href="/understanding" className="font-medium text-accent underline underline-offset-4">See how understanding is built →</Link>
          <Link href="/philosophy" className="font-medium text-accent underline underline-offset-4">Read the philosophy →</Link>
          <Link href="/feedback" className="font-medium text-accent underline underline-offset-4">Report a public issue →</Link>
        </div>
        <p className="mt-5 rounded-2xl border border-warm/40 bg-warm/5 p-4 text-sm leading-6 text-ink-soft">
          <strong className="text-ink">Do not post personal tax facts to the public feedback tracker.</strong>{" "}
          A confidential support and correction channel is not live yet.
        </p>
      </section>
    </div>
  );
}
