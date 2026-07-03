import Link from "next/link";

export const metadata = {
  title: "Tools — TaxSorted",
  description: "Instant UK tax calculators: VAT, take-home pay, and dividend. Type and see, no account needed.",
};

const tools = [
  {
    slug: "vat-calculator",
    title: "VAT Calculator",
    desc: "Enter an amount — see net, VAT, and gross instantly. Add or remove VAT at 20%.",
  },
  {
    slug: "take-home-calculator",
    title: "Take-Home Pay Calculator",
    desc: "Enter your salary — see after-tax income with a full breakdown: Income Tax, NI, take-home.",
  },
  {
    slug: "dividend-calculator",
    title: "Dividend Calculator",
    desc: "Enter company profit — see Corporation Tax, dividend tax, and what you take home.",
  },
];

export default function ToolsPage() {
  return (
    <div className="container">
      <div className="page-header">
        <h1>Tools</h1>
        <p>
          Instant calculators. Type a number, see the result. No account, no
          page reload, no tracking. Each one shows the math so you can verify
          it yourself.
        </p>
      </div>

      <div className="guide-grid">
        {tools.map((t) => (
          <Link key={t.slug} href={`/tools/${t.slug}`} className="guide-card" style={{ textDecoration: "none" }}>
            <h3>{t.title}</h3>
            <p>{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}