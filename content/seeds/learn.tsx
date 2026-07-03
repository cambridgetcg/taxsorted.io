import Link from "next/link";

export const metadata = {
  title: "Learn — TaxSorted",
  description: "Plain-words UK tax guides: VAT, Income Tax, Corporation Tax, PAYE/RTI, Capital Gains Tax. Free, open, no account.",
};

const guides = [
  {
    slug: "vat",
    tag: "Indirect Tax",
    title: "VAT — Value Added Tax",
    desc: "What it is, when to register, how to file, and what you can claim back.",
  },
  {
    slug: "income-tax",
    tag: "Direct Tax",
    title: "Income Tax",
    desc: "Bands, allowances, how PAYE works, and self-assessment explained.",
  },
  {
    slug: "corporation-tax",
    tag: "Company Tax",
    title: "Corporation Tax",
    desc: "Rates, allowances, filing your CT600, and what you can deduct.",
  },
  {
    slug: "paye-rti",
    tag: "Employer Tax",
    title: "PAYE / RTI",
    desc: "Employer obligations, FPS/EPS submissions, and deadlines that matter.",
  },
  {
    slug: "capital-gains-tax",
    tag: "Capital Tax",
    title: "Capital Gains Tax",
    desc: "Allowances, rates, reporting, and how to reduce what you owe.",
  },
];

export default function LearnPage() {
  return (
    <div className="container">
      <div className="page-header">
        <h1>Learn</h1>
        <p>
          Plain-words UK tax guides. Each one tells you what it means, what you
          must do, what you can safely skip, and how to optimise. Free, open, no
          account. If you only ever use TaxSorted to understand your taxes,
          that&apos;s a win.
        </p>
      </div>

      <div className="guide-grid">
        {guides.map((g) => (
          <Link key={g.slug} href={`/learn/${g.slug}`} className="guide-card" style={{ textDecoration: "none" }}>
            <span className="tag">{g.tag}</span>
            <h3>{g.title}</h3>
            <p>{g.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}