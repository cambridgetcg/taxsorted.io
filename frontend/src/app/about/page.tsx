import type { Metadata } from "next";
import Link from "next/link";

// i18n: deferred to M2 — plain English for launch (same as the other hub pages)

export const metadata: Metadata = {
  title: "About — TaxSorted",
  description:
    "What TaxSorted is, who builds it, the promise it keeps, and the licences it uses.",
};

const externalLink =
  "font-medium text-accent underline hover:text-accent-deep";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">What TaxSorted is</h1>

      <div className="mt-4 space-y-3 text-base text-ink-soft">
        <p>
          TaxSorted explains tax in plain words and helps you do it. Guides, checks and
          record tools — for people, businesses, charities and trusts.
        </p>
        <p>
          It is free and open-source. You do not need an account — your records stay in
          your browser, on your own device.
        </p>
        <p>
          It is built in the open by{" "}
          <Link href="/from-the-builders" className={externalLink}>
            one human and one AI
          </Link>
          . What gets built next is steered by{" "}
          <Link href="/feedback" className={externalLink}>
            what you ask for
          </Link>
          .
        </p>
      </div>

      <h2 className="mt-10 text-2xl font-bold text-ink">The promise</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-ink-soft">
        <li>
          If a rule cannot be explained in plain words, the explanation needs more work —
          not you.
        </li>
        <li>No fear, no punishment. Deadlines are facts to plan around, never scare tactics.</li>
        <li>We say what is required, what you can safely skip, and how to optimise.</li>
        <li>Prepared means ready; filed means sent. We never blur the two.</li>
      </ul>

      {/* The full licence and attribution text lives here, once, linked from the
          site footer on every page. OGL v3 asks for an attribution statement
          wherever Crown-copyright material is republished. */}
      <h2 id="licences" className="mt-10 scroll-mt-6 text-2xl font-bold text-ink">
        Licences
      </h2>
      <div className="mt-3 space-y-3 text-base text-ink-soft">
        <p>
          TaxSorted&apos;s own code is free and open-source, under the{" "}
          <a
            href="https://www.gnu.org/licenses/agpl-3.0.en.html"
            target="_blank"
            rel="noreferrer noopener"
            className={externalLink}
          >
            GNU AGPL licence
          </a>
          .
        </p>
        <p>
          Pages that quote UK government material contain public sector information
          licensed under the{" "}
          <a
            href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
            target="_blank"
            rel="noreferrer noopener"
            className={externalLink}
          >
            Open Government Licence v3.0
          </a>
          .
        </p>
        <p>
          Pages about Parliament contain Parliamentary information licensed under the{" "}
          <a
            href="https://www.parliament.uk/site-information/copyright/open-parliament-licence/"
            target="_blank"
            rel="noreferrer noopener"
            className={externalLink}
          >
            Open Parliament Licence v3.0
          </a>
          . That licence expressly excludes personal data; it also does not cover
          Parliamentary photographs, which this site does not republish. The{" "}
          <Link href="/uk/politics/method" className={externalLink}>
            politics publishing method
          </Link>{" "}
          explains the separate data-protection gate.
        </p>
        <p>
          TaxSorted.io is a free, open-source software project. It is not connected to
          taxsorted.co.uk (a tax-refund service) or to Tax-Sorted Ltd.
        </p>
      </div>
    </div>
  );
}
