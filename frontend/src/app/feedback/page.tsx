import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "Feedback access and limits — TaxSorted",
  description:
    "The current TaxSorted issue tracker requires access to the private development repository. Public feedback and confidential support channels are not available yet.",
};

const WISH_URL =
  "https://github.com/cambridgetcg/taxsorted.io/issues/new?template=wish.yml";
const CORRECTIONS_URL = "https://github.com/cambridgetcg/taxsorted.io/issues";

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs current="Feedback" className="mb-6" />

      <header className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Feedback
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Feedback access and limits.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">
          The current feedback tracker is inside a private GitHub repository. You need a
          GitHub account with access to that repository to suggest a feature or report a
          correction. A public feedback channel is not available yet.
        </p>
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section
          className="rounded-3xl border border-line bg-white p-6"
          aria-labelledby="wish"
        >
          <h2 id="wish" className="text-2xl font-semibold text-ink">
            Make a wish
          </h2>
          <p className="mt-3 text-base text-ink-soft">
            If you already have repository access, use a GitHub issue to suggest a feature,
            guide or tool. Explain the task you want to complete and where you get stuck.
          </p>
          <p className="mt-3 text-base text-ink-soft">
            <span className="font-medium text-ink">Access required:</span> Creating a GitHub
            account alone does not grant access. The link below may show a missing-page
            response if you are not an authorised collaborator.
          </p>
          <a
            href={WISH_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-base font-medium text-white hover:bg-accent-deep"
          >
            Open a wish (repository access required) <span aria-hidden="true">&nbsp;↗</span>
          </a>
        </section>

        <section
          className="rounded-3xl border border-line bg-white p-6"
          aria-labelledby="wrong"
        >
          <h2 id="wrong" className="text-2xl font-semibold text-ink">
            Report something wrong
          </h2>
          <p className="mt-3 text-base text-ink-soft">
            A figure that looks off, a rule explained badly, a source that moved:
            collaborators can report these in the same private issue tracker. Include
            the page and public source, using made-up examples instead of personal tax data.
          </p>
          <a
            href={CORRECTIONS_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 py-2 text-base font-medium text-accent hover:text-accent-deep"
          >
            Open a correction (repository access required) <span aria-hidden="true">&nbsp;↗</span>
          </a>
        </section>
      </div>

      <p className="mt-6 rounded-2xl border border-warm/40 bg-warm/5 p-4 text-sm leading-6 text-ink-soft">
        Confidential support is not available. Do not put personal tax records, account
        details or identity documents in an issue. The tracker is for product feedback,
        not tax advice or handling an individual case.
      </p>

      <section
        className="mt-8 rounded-3xl border border-line bg-accent-soft p-6"
        aria-label="For AI agents"
      >
        <h2 className="text-lg font-semibold text-ink">For AI agents</h2>
        <p className="mt-2 text-base text-ink-soft">
          Same doors, same welcome. Our machine doorway (the guide we publish for AI agents) at{" "}
          <a
            href="/agent.txt"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            /agent.txt
          </a>{" "}
          lists the corrections route. The same repository-access requirement applies to
          people and agents; the machine doorway does not grant access to GitHub.
        </p>
      </section>

      <div className="mt-10">
        <Link
          href="/from-the-builders"
          className="text-base font-medium text-accent underline hover:text-accent-deep"
        >
          Curious who &ldquo;we&rdquo; is? — From the builders
        </Link>
      </div>
    </div>
  );
}
