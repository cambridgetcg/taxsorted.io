import Link from "next/link";
import { Button } from "@/components/ui/button";

// The map: places light up as they're proven. Only doors that open are links.
const places = [
  { name: "United Kingdom", status: "open" as const, href: "/dashboard" },
  { name: "Ireland", status: "being drawn" as const },
  { name: "Germany", status: "being drawn" as const },
  { name: "United States", status: "being drawn" as const },
];

const kinds = ["a person", "a business", "a charity", "a trust"];

// Every pillar says plainly how open its door is today.
const pillars = [
  {
    name: "Learn",
    status: "being written",
    heading: "Start by understanding.",
    body: "Every rule we cover, explained in plain words: what it means, what you must do, what you can safely skip, how to optimise. Free, open, no account. The open book begins with the UK — and if you only ever use TaxSorted to understand your taxes, that's a win.",
  },
  {
    name: "File",
    status: "open as a preview",
    heading: "Records in. Return out.",
    body: "You never retype a number — every figure is derived, and shows where it came from. The answer comes first, and deadlines are facts to plan around, never scare tactics. Today you can walk the whole UK VAT journey on sample books.",
  },
  {
    name: "Connect",
    status: "being built",
    heading: "Straight to the tax office.",
    body: "A direct line to the authority itself — HMRC first — so a return you approve is actually delivered, with a receipt. And every answer a person can read here, software will be able to ask for: one engine, one truth.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        Tax, understood.
        <br />
        Then sorted.
      </h1>
      <p className="mt-5 text-lg text-ink-soft">
        Wherever you are, whoever you are — tax explained in plain words, and
        figures you never have to retype. We&apos;re at the start of the map,
        and we draw it honestly: your path begins with where you are, and who
        you are.
      </p>

      <section
        aria-label="Find your path"
        className="mt-12 rounded-lg border border-line bg-white p-6 sm:p-8"
      >
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-soft">
          Where are you?
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {places.map((place) =>
            place.status === "open" ? (
              <li key={place.name}>
                <Link
                  href={place.href!}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
                >
                  {place.name}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ) : (
              <li key={place.name}>
                <span className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft">
                  {place.name}
                  <span className="text-xs">· {place.status}</span>
                </span>
              </li>
            )
          )}
        </ul>

        <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-ink-soft">
          Who are you?
        </h2>
        <p className="mt-3 text-ink">
          {kinds.join(" · ")} — same door, same plain words, same engine.
        </p>
      </section>

      <section aria-label="What TaxSorted is" className="mt-16 space-y-10">
        {pillars.map((pillar) => (
          <div key={pillar.name}>
            <h2 className="text-xl font-semibold text-ink">
              <span className="text-accent">{pillar.name}</span> —{" "}
              {pillar.heading}
              <span className="ml-3 align-middle rounded-full border border-line px-2.5 py-0.5 text-xs font-normal text-ink-soft">
                {pillar.status}
              </span>
            </h2>
            <p className="mt-2 text-ink-soft">{pillar.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-14">
        <Button asChild size="lg">
          <Link href="/dashboard">Open the UK preview</Link>
        </Button>
      </div>

      <p className="mt-6 text-sm text-ink-soft">
        Honest by default: what&apos;s live today is a preview — the UK VAT
        journey end to end, on sample books. Connecting your own records and
        filing straight to HMRC are being built. Prepared means ready; filed
        means sent. We never blur the two.
      </p>

      <p className="mt-10 text-ink">
        The UK is our first country, not our last.
      </p>
    </div>
  );
}
