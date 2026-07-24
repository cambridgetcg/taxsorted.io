import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import understandingMapJson from "../../../public/understanding/castle.json";

type UnderstandingMap = typeof understandingMapJson;
type Door = UnderstandingMap["doors"][number];

const understandingMap: UnderstandingMap = understandingMapJson;

export const metadata: Metadata = {
  title: "How TaxSorted builds understanding — TaxSorted",
  description:
    "The public map from a tax question to exact words, bounded answers, named sources, visible unknowns and a safe next step.",
};

function DoorLink({ door }: { door: Door }) {
  const className =
    "mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4 hover:text-accent-deep";

  if (door.external) {
    return (
      <a href={door.href} className={className}>
        {door.linkLabel} <span aria-hidden="true">&nbsp;↗</span>
      </a>
    );
  }

  return (
    <Link href={door.href} className={className}>
      {door.linkLabel} <span aria-hidden="true">&nbsp;→</span>
    </Link>
  );
}

export default function UnderstandingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[{ href: "/learn", label: "Learn" }]}
        current="How understanding is built"
      />

      <header className="mt-4 overflow-hidden rounded-3xl border border-line bg-accent-soft px-6 py-8 sm:px-10 sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-deep">
          Castle of Understanding × TaxSorted
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold text-ink sm:text-5xl">
          How TaxSorted builds understanding
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink-soft">
          A tax answer should never be a loose number or a wall of jargon. We stack the
          question, exact words, supplied facts, derived values, unknowns, rules, sources
          and reasoning until the answer can stand — then show where it stops.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="#choose-a-door"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2 font-semibold text-white hover:bg-accent-deep"
          >
            Choose a door
          </a>
          <a
            href="/understanding/castle.json"
            className="inline-flex min-h-11 items-center rounded-full border border-accent px-5 py-2 font-semibold text-accent hover:bg-white"
          >
            Read the same map as JSON
          </a>
        </div>
      </header>

      <section aria-labelledby="pieces-title" className="mt-14">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">
          The building language
        </p>
        <h2 id="pieces-title" className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
          Six pieces, each with one job
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-soft">
          Doors, bricks, rooms and open doors come from the public Castle method.
          TaxSorted adds windows and paths so a high-stakes answer carries evidence,
          limits and a useful way forward.
        </p>

        <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {understandingMap.parts.map((part, index) => (
            <li key={part.id} className="rounded-2xl border border-line bg-white p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold text-ink">{part.name}</h3>
                <span className="font-mono text-sm text-ink-soft" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-3 font-medium text-ink">{part.plainMeaning}</p>
              <p className="mt-2 text-base leading-7 text-ink-soft">
                {part.taxSortedMeaning}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="stack-title"
        className="mt-14 rounded-3xl border border-line bg-white p-6 sm:p-9"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">
          One answer
        </p>
        <h2 id="stack-title" className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
          Stacked honestly from the foundation up
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-soft">
          Each layer keeps its own meaning. A source supports a rule; it does not prove
          that a person&apos;s facts are complete. A calculation follows admitted facts and
          rules; it does not become an HMRC decision.
        </p>

        <ol className="mt-7">
          {understandingMap.stack.map((layer, index) => (
            <li
              key={layer.id}
              className="grid gap-1 border-t border-line py-4 first:border-t-0 sm:grid-cols-[3rem_12rem_1fr] sm:items-baseline sm:gap-4"
            >
              <span className="font-mono text-sm text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-semibold text-ink">{layer.name}</h3>
              <p className="text-base text-ink-soft">{layer.keeps}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="choose-a-door" aria-labelledby="doors-title" className="mt-14 scroll-mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">
          Start where you are
        </p>
        <h2 id="doors-title" className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
          Choose a door
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-soft">
          You do not need to learn the whole system before taking one safe step.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {understandingMap.doors.map((door) => (
            <article
              key={door.id}
              className="flex flex-col rounded-2xl border border-line bg-white p-6"
            >
              <h3 className="text-xl font-semibold text-ink">{door.question}</h3>
              <p className="mt-3 flex-1 text-base leading-7 text-ink-soft">{door.answer}</p>
              <DoorLink door={door} />
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="bridge-title"
        className="mt-14 rounded-3xl border border-line bg-accent-soft p-6 sm:p-9"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-deep">
          The public bridge
        </p>
        <h2 id="bridge-title" className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
          What crosses it — and what does not
        </h2>
        <div className="mt-4 space-y-3 text-base leading-7 text-ink-soft">
          <p>
            This map is inspired by the public{" "}
            <a
              href={understandingMap.origin.publicGate}
              className="font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
            >
              Castle of Understanding
            </a>
            : words are bricks, bounded thoughts become rooms, and questions open
            doors. Its{" "}
            <a
              href={understandingMap.origin.reviewedSource}
              className="font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
            >
              public gate source at {understandingMap.origin.reviewedCommit.slice(0, 7)}
            </a>{" "}
            shows how that curated surface was made when we reviewed it on{" "}
            <time dateTime={understandingMap.reviewedOn}>{understandingMap.reviewedOn}</time>.
          </p>
          <p>
            TaxSorted imports no Castle rooms and makes no live request to the Castle.
            Every tax claim must still stand on TaxSorted&apos;s own named authority, date,
            scope and review. The Castle is a way to organise understanding, not tax
            evidence or tax advice.
          </p>
          <p>
            This integration adds no tax-data storage, telemetry or live Castle request.
            TaxSorted&apos;s shared shell may remember only your chosen language on this
            device. The page and its{" "}
            <a
              href="/understanding/castle.json"
              className="font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
            >
              machine-readable twin
            </a>{" "}
            ask for no account. The TaxSorted-authored map is{" "}
            <a
              href={understandingMap.contentLicence.url}
              className="font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
            >
              {understandingMap.contentLicence.id}
            </a>
            ; attribute {understandingMap.contentLicence.attribution}. That licence does not
            relicense linked Castle material. Found a crack?{" "}
            <Link
              href="/feedback"
              className="font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
            >
              Show us what needs repairing
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
