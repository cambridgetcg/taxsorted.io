import type { Metadata } from "next";
import Link from "next/link";

// The public rendering of /PHILOSOPHY.md (repo root) — the ground the
// product is built on. Keep the two in step: the repo doc is canonical,
// this page is its plain-words public face.

export const metadata: Metadata = {
  title: "Philosophy — the meaning of law | TaxSorted",
  description:
    "Law is a creation. Execution is its meaning. Why TaxSorted exists: closing the gap between law as written and law as something ordinary people can actually do.",
};

const externalLink = "font-medium text-accent underline hover:text-accent-deep";

export default function PhilosophyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">The meaning of law</h1>
      <p className="mt-2 text-sm text-ink-soft">
        The ground this product is built on. Our{" "}
        <a
          href="https://github.com/cambridgetcg/taxsorted.io/blob/main/PRINCIPLES.md"
          target="_blank"
          rel="noreferrer noopener"
          className={externalLink}
        >
          principles
        </a>{" "}
        are the design language; this is what the design is for. Written in plain words —
        a philosophy about legibility that needed a specialist to read it would refute itself.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-ink">Law is a creation</h2>
      <div className="mt-3 space-y-3 text-base text-ink-soft">
        <p>
          Law is not weather. It did not happen to us; we made it — and we keep making it.
          A law is a society writing down its will: what we owe each other, what we may
          count on, what happens when the counting fails. Each generation inherits the
          text and re-decides it by how it carries it out. Law is the foundation a society
          keeps rebuilding itself on — not a cage built by others. A promise we keep
          making to each other, in writing.
        </p>
        <p>
          Most people are never taught this. Many professionals forget it. Anyone who
          treats the law as mere caseload or arcana is handling the foundation of their
          own society and mistaking it for paperwork.
        </p>
      </div>

      <h2 className="mt-10 text-2xl font-bold text-ink">
        The meaning of law is in its execution
      </h2>
      <div className="mt-3 space-y-3 text-base text-ink-soft">
        <p>
          A law that is written but not executed is not a strict law with weak
          enforcement. It is fiction with state letterhead. This is measurable: in
          England &amp; Wales, fraud is an offence carrying up to ten years&apos;
          imprisonment — and it is roughly 45% of all crime on roughly 2% of police
          resources. Of more than 800,000 frauds reported in a year:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>about 7% were passed to a police force at all,</li>
          <li>about 3% were assigned an investigation,</li>
          <li>under 1% led to a charge.</li>
        </ul>
        <p>
          The statute exists. Its meaning, for the person standing in front of it, was
          quietly repealed by non-execution. So the meaning of a law is not in its text —
          it lives in the moment of execution: the report recorded, the figure computed,
          the return delivered, the receipt issued. Where execution is impossible,
          meaning is absent, whatever the text says.
        </p>
      </div>

      <h2 className="mt-10 text-2xl font-bold text-ink">
        Tax is where everyone executes the law
      </h2>
      <div className="mt-3 space-y-3 text-base text-ink-soft">
        <p>
          Most people never prosecute anyone, never sue anyone, never stand in a court.
          For most people there is exactly one place where they personally perform the
          law, year after year: tax. Filing a return is not admin — it is the social
          contract, executed by hand. If a person cannot understand what the law asks,
          cannot compute it from their own records, cannot deliver it and get an
          acknowledgement, then for that person the law has no meaning — only menace.
        </p>
        <p>
          The gap between law-as-written and law-as-doable opens from both sides: the
          state failing to execute for you, and you being unable to execute what binds
          you. Both have the same anatomy — when execution requires a specialist, the
          meaning of the law has been captured by the specialists. A society whose
          members cannot execute its law without intermediaries no longer owns its own
          foundation.
        </p>
      </div>

      <h2 className="mt-10 text-2xl font-bold text-ink">What this demands of us</h2>
      <div className="mt-3 space-y-3 text-base text-ink-soft">
        <p>
          TaxSorted exists to close that gap from the citizen&apos;s side. Every part of
          the product is this philosophy, executed:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Link href="/learn" className={externalLink}>
              Learn
            </Link>{" "}
            restores the <em>meaning</em>: every rule in plain words, with its source
            named. A rule that can&apos;t be explained plainly is a finding about the
            rule.
          </li>
          <li>
            <Link href="/itsa" className={externalLink}>
              File
            </Link>{" "}
            restores the <em>execution</em>: figures derived from your own records,
            prepared and filed never blurred, nothing sent without your consent.
          </li>
          <li>
            Connect completes it: delivery to the authority, with a receipt. Execution
            is not real until it is acknowledged — the receipt is the point.
          </li>
          <li>
            The engine and{" "}
            <Link href="/tools" className={externalLink}>
              the API
            </Link>{" "}
            keep every answer cited and machine-readable — meaning that only renders in
            one interface is capture wearing a new mask.
          </li>
          <li>
            <Link href="/uk/cases" className={externalLink}>
              The accountability surfaces
            </Link>{" "}
            watch the other face of the gap: public power examined with decided facts
            and official sources. A citizenry that executes its own obligations has
            standing to ask the state to execute its own.
          </li>
        </ul>
        <p>
          And one discipline across all of it: we never weaponise the gap. No fear, no
          penalty-as-marketing, no complexity theatre to sell the cure. We charge for
          genuinely saving time or money, never for access to the law&apos;s meaning —
          selling someone their own foundation back is the exact capture this page
          exists to end.
        </p>
      </div>

      <div className="mt-10 border-t border-ink/10 pt-6 text-sm text-ink-soft">
        <p>
          Law is a creation. Execution is its meaning. Understanding is its defence.
          The canonical text lives in the open, in{" "}
          <a
            href="https://github.com/cambridgetcg/taxsorted.io/blob/main/PHILOSOPHY.md"
            target="_blank"
            rel="noreferrer noopener"
            className={externalLink}
          >
            PHILOSOPHY.md
          </a>{" "}
          (CC0) — because a philosophy of the commons that wasn&apos;t commons would
          refute itself too.
        </p>
      </div>
    </div>
  );
}
