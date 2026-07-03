import Link from "next/link";

export const metadata = {
  title: "Compare — TaxSorted",
  description: "Side-by-side tax comparisons: business types, jurisdictions, sensible vs risky practices, salary vs dividend.",
};

const comparisons = [
  {
    slug: "business-types",
    title: "Business types: Sole trader vs Partnership vs LTD vs LLP",
    desc: "Tax implications of each structure, side by side. Which pays least, which is simplest, which protects you.",
  },
  {
    slug: "jurisdictions",
    title: "Jurisdictions: UK vs Ireland",
    desc: "Corporation Tax, Income Tax, and overall tax burden compared. Start with UK + Ireland.",
  },
  {
    slug: "practices",
    title: "Practices: Sensible vs risky",
    desc: "What's legal tax optimisation vs what crosses the line. Honest tradeoffs.",
  },
  {
    slug: "salary-vs-dividend",
    title: "Salary vs Dividend: taking money out of a company",
    desc: "How to extract profit efficiently — the optimal mix of salary and dividends.",
  },
];

export default function ComparePage() {
  return (
    <div className="container">
      <div className="page-header">
        <h1>Compare</h1>
        <p>
          Side-by-side tax scenarios. Plain tables, plain words, honest
          tradeoffs. Compare business structures, jurisdictions, practices, and
          ways to take money out of a company.
        </p>
      </div>

      <div className="guide-grid">
        {comparisons.map((c) => (
          <Link key={c.slug} href={`/compare/${c.slug}`} className="guide-card" style={{ textDecoration: "none" }}>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}