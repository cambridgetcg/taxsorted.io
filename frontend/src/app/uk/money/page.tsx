import type { Metadata } from "next";
import Link from "next/link";

// i18n: deferred to M2 — plain English for launch (same as the other hub pages)

export const metadata: Metadata = {
  title: "Follow the money — TaxSorted",
  description:
    "Who runs UK tax, who funds them, and where public money goes — every fact cited.",
};

const PLACES = [
  {
    href: "/uk/politics",
    title: "UK politics",
    line: "Who runs tax and who funds them.",
  },
  {
    href: "/uk/public-funding",
    title: "Public money",
    line: "Where public money goes.",
  },
  {
    href: "/uk/charities",
    title: "Charities",
    line: "Their money and their tax.",
  },
  {
    href: "/uk/accountability",
    title: "Accountability",
    line: "When the state gets it wrong.",
  },
  {
    href: "/uk/tax-industry",
    title: "The tax industry",
    line: "The companies that run tax for you.",
  },
] as const;

export default function MoneyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">Follow the money</h1>
      <p className="mt-3 text-base text-ink-soft">
        Tax is public money. These pages show who decides it, who runs it, and where it
        goes — every fact cited, no side taken.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {PLACES.map((place) => (
          <Link
            key={place.href}
            href={place.href}
            className="block min-h-11 rounded-2xl border border-line bg-paper p-5 transition hover:border-accent"
          >
            <h2 className="text-lg font-semibold text-ink">{place.title}</h2>
            <p className="mt-1.5 text-base text-ink-soft">{place.line}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
