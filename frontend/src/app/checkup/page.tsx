import type { Metadata } from "next";
import Link from "next/link";
import { CheckupClient } from "./checkup-client";

export const metadata: Metadata = {
  title: "Tax Checkup — find the right next step | TaxSorted",
  description:
    "Start with what changed. TaxSorted routes you to the right UK tax check, record tool or source-backed guide without pretending one form covers everyone.",
};

const STAGES = [
  {
    name: "Understand",
    status: "Open now",
    body: "Plain guides and source-linked rule paths explain what a rule means and when it applies.",
  },
  {
    name: "Check",
    status: "Two deep paths",
    body: "MTD Income Tax and adjusted-net-income checks show facts used, unknowns and boundaries.",
  },
  {
    name: "Prepare",
    status: "Browser tools open",
    body: "Browser records feed the estimate and quarter figures so those numbers are derived, not retyped.",
  },
  {
    name: "File",
    status: "Sandbox only",
    body: "Production filing waits for HMRC recognition. Prepared, approved, submitted and received remain different states.",
  },
] as const;

export default function CheckupPage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm font-medium text-accent hover:text-accent-deep">
        ← TaxSorted
      </Link>

      <header className="mt-6 max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Tax Checkup
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Find where you stand. Then take the next honest step.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">
          Tax is not one giant form. Start with the thing that changed and we will take you to the
          narrowest check, record tool or guide that fits. If TaxSorted does not know, it says so.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2 text-sm text-ink-soft" aria-label="Checkup promises">
          <li className="rounded-full border border-line bg-white px-3 py-1">No account to start</li>
          <li className="rounded-full border border-line bg-white px-3 py-1">Coverage and boundaries visible</li>
          <li className="rounded-full border border-line bg-white px-3 py-1">Bounded checks keep unknowns unknown</li>
        </ul>
      </header>

      <CheckupClient />

      <section className="mt-16" aria-labelledby="stages-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">One honest journey</p>
        <h2 id="stages-title" className="mt-2 text-3xl font-bold tracking-tight text-ink">
          The words tell you what power the tool has
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage) => (
            <article key={stage.name} className="rounded-2xl border border-line bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{stage.status}</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">{stage.name}</h3>
              <p className="mt-2 text-sm text-ink-soft">{stage.body}</p>
            </article>
          ))}
        </div>
      </section>

      <aside className="mt-10 rounded-2xl border border-line bg-paper p-5 text-sm text-ink-soft">
        <strong className="text-ink">Safety boundary:</strong>{" "}TaxSorted is educational and
        preparation software, not a substitute for advice on facts outside a tool&apos;s stated scope.
        No tax figures or quarterly updates are sent to HMRC unless you deliberately connect the
        sandbox and separately review and consent to that submission.
      </aside>
    </div>
  );
}
