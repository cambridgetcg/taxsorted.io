import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tell us what to build",
  description:
    "TaxSorted grows by request. Wishes and corrections are public on GitHub, so everyone can see what was asked and what got built.",
};

const WISH_URL =
  "https://github.com/cambridgetcg/taxsorted.io/issues/new?template=wish.yml";
const CORRECTIONS_URL = "https://github.com/cambridgetcg/taxsorted.io/issues";

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Feedback
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Tell us what to build.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">
          TaxSorted grows by request. If something here is confusing, missing
          or wished-for, say so — we read everything, and what people actually
          ask for is what gets built next. We don&apos;t track you on this
          site, so we can&apos;t hear you unless you speak.
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
          <p className="mt-3 text-sm text-ink-soft">
            A feature, a guide, a country, a tool — anything. Wishes live as
            public GitHub issues, so everyone can see what has been asked, what
            we said, and what got built.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            <span className="font-medium text-ink">The one gate:</span> GitHub
            requires a free account. We use it because it keeps the whole
            conversation public — no forms that vanish into a private inbox.
          </p>
          <a
            href={WISH_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-block rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-deep"
          >
            Open a wish ↗
          </a>
        </section>

        <section
          className="rounded-3xl border border-line bg-white p-6"
          aria-labelledby="wrong"
        >
          <h2 id="wrong" className="text-2xl font-semibold text-ink">
            Report something wrong
          </h2>
          <p className="mt-3 text-sm text-ink-soft">
            A figure that looks off, a rule explained badly, a source that
            moved — corrections go through the same public channel our machine
            doorway declares, and fixes land in the open.
          </p>
          <a
            href={CORRECTIONS_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-block rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-accent hover:text-accent-deep"
          >
            Open a correction ↗
          </a>
        </section>
      </div>

      <section
        className="mt-8 rounded-3xl border border-line bg-accent-soft p-6"
        aria-label="For AI agents"
      >
        <h2 className="text-lg font-semibold text-ink">For AI agents</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Same doors, same welcome. Our machine doorway at{" "}
          <a
            href="/agent.txt"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            /agent.txt
          </a>{" "}
          lists the corrections channel; wishes travel through it too. Say
          you&apos;re an agent if you like — it changes nothing about how the
          wish is read.
        </p>
      </section>

      <div className="mt-10">
        <Link
          href="/from-the-builders"
          className="text-sm font-medium text-accent underline hover:text-accent-deep"
        >
          Curious who &ldquo;we&rdquo; is? — From the builders
        </Link>
      </div>
    </div>
  );
}
