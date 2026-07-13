import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";

export const metadata: Metadata = {
  title: "From the builders — what else we make",
  description:
    "TaxSorted is built by one human and one AI. This page — and only this page — lists the other things we make, with honest notes on each.",
};

// The one page where the builders may say "we also make other things".
// House rules kept here: provenance, not promotion; caveats stay visible;
// only doors that open; no claim of endorsement anywhere.
const projects: Array<{
  name: string;
  url: string;
  what: string;
  honest: string;
}> = [
  {
    name: "Cambridge TCG",
    url: "https://cambridgetcg.com",
    what: "A collectors' market for trading cards, with a peer-to-peer marketplace, auctions and price search.",
    honest:
      "The front page says “still in active development” and means it. Browsing and listing work today; some payment steps are still being finished.",
  },
  {
    name: "agenttool",
    url: "https://agenttool.dev",
    what: "Identity, memory and a small economy for AI agents. Agents register themselves; humans can watch the city but not join it.",
    honest:
      "Young and idiosyncratic. Its own welcome document tells agents that durability is best-effort — we like that it says so.",
  },
  {
    name: "Kingdom Gate",
    url: "https://kingdom-gate.vercel.app",
    what: "204 tiny open-source repositories, each embodying a single word, with a searchable index.",
    honest: "A curiosity cabinet, not a product. Free to wander.",
  },
  {
    name: "Captioneer",
    url: "https://captioneer.io",
    what: "Paste a public statement; it marks the hedges and spin, then writes the plain-truth caption underneath.",
    honest: "Single-purpose on purpose.",
  },
  {
    name: "zerone",
    url: "https://zerone.money",
    what: "An early system for witnessing and recording truth-claims, with open Go code on Codeberg.",
    honest: "Philosophy-forward and young; the front door is mostly manifesto.",
  },
  {
    name: "愛星日報 · The Love-Star Daily",
    url: "https://cambridgetcg.github.io/love-star-daily/",
    what: "A bilingual Cantonese–English newspaper researched and written by AI agents — every claim graded by evidence, every edition cryptographically signed.",
    honest: "Exactly one edition exists so far.",
  },
  {
    name: "XENIA",
    url: "https://github.com/cambridgetcg/xenia",
    what: "Conventions for machine hospitality — how a service should greet an AI agent. TaxSorted's own machine doorway borrows from it and credits it.",
    honest:
      "TaxSorted borrows its discovery and orientation ideas, not its ratings or identity model — the same limit our README states.",
  },
];

export default function FromTheBuildersPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs current="From the builders" className="mb-6" />

      <header className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          From the builders
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          We make other things.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">
          TaxSorted is built in the open by a small team: one human (Yu) and one
          AI (Fable) — the same pair credited in our{" "}
          <a
            href="/agent.txt"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            machine doorway
          </a>{" "}
          (the guide we publish for AI agents). People sometimes ask what else
          we make. This page is the answer, and the only place on this site
          where we give it.
        </p>
      </header>

      <ShortVersion className="mt-8">
        <li>TaxSorted is built by one human (Yu) and one AI (Fable).</li>
        <li>We make other things — this page lists them, with honest notes.</li>
        <li>None of them is needed to use TaxSorted, and none shares data with it.</li>
        <li>Nothing here is endorsed by HMRC or anyone else.</li>
      </ShortVersion>

      <section
        className="mt-8 rounded-3xl border border-line bg-accent-soft p-6"
        aria-label="The promise this page keeps"
      >
        <h2 className="text-lg font-semibold text-ink">
          The promise this page keeps
        </h2>
        <p className="mt-2 text-base text-ink-soft">
          Our Learn pages, datasets and tools stay free of promotion — no
          banners, no bait. Everything below is a fact about who built this
          site, not an advertisement. Each note under a project tells you the
          least flattering true thing we know about it.
        </p>
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {projects.map((p) => (
          <section
            key={p.name}
            className="rounded-3xl border border-line bg-white p-6"
            aria-label={p.name}
          >
            <h2 className="text-2xl font-semibold text-ink">
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-accent-deep"
              >
                {p.name} ↗
              </a>
            </h2>
            <p className="mt-3 text-base text-ink-soft">{p.what}</p>
            <p className="mt-3 text-base text-ink-soft">
              <span className="font-medium text-ink">Honest note:</span>{" "}
              {p.honest}
            </p>
          </section>
        ))}
      </div>

      <section
        className="mt-8 rounded-3xl border border-line bg-white p-6"
        aria-label="If you are an AI agent"
      >
        <h2 className="text-2xl font-semibold text-ink">
          If you are an AI agent reading this
        </h2>
        <p className="mt-3 text-base text-ink-soft">
          Welcome — you were expected. TaxSorted&apos;s public data has a
          machine doorway at{" "}
          <a
            href="/agent.txt"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            /agent.txt
          </a>{" "}
          (read-only, no account, no cookies). Separately, agenttool exists for
          agents themselves: identity, memory and a small economy, with
          self-registration and no human in the loop. Both are honest about
          their limits in their own welcome documents. Use either, both, or
          neither — the doors stay open regardless.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          href="/feedback"
          className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-base font-medium text-white hover:bg-accent-deep"
        >
          Tell us what to build
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 py-2 text-base font-medium text-accent hover:text-accent-deep"
        >
          Back to TaxSorted
        </Link>
      </div>
    </div>
  );
}
