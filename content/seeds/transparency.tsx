export const metadata = {
  title: "Transparency — TaxSorted",
  description: "Where does your tax go? A visual breakdown of UK government spending by category, with sources from HM Treasury.",
};

// UK Government spending breakdown — sourced from HM Treasury Public Expenditure Statistical Analyses (PESA) 2024
// and the OBR Economic and Fiscal Outlook March 2024. Figures are for 2023/24 financial year (April 2023 – March 2024).
// Total managed expenditure approximately £1,220 billion.
// Percentages are of Total Expenditure (TME). Pence per pound rounded to nearest penny.

const spending2023_24 = [
  { name: "Social Protection / Welfare", pct: 21.7, pence: 22, color: "#2d8659", desc: "State pensions, universal credit, child benefit, disability, housing support", source: "PESA 2024, OBR Mar 2024" },
  { name: "Health (NHS)", pct: 20.1, pence: 20, color: "#3a9b6f", desc: "NHS England + devolved health services, public health", source: "PESA 2024, DHSC spending" },
  { name: "Education", pct: 10.8, pence: 11, color: "#5cb88a", desc: "Schools, further education, higher education, early years", source: "PESA 2024, DfE spending" },
  { name: "Debt Interest", pct: 7.3, pence: 7, color: "#c4732a", desc: "Interest on government borrowing (debt to bondholders)", source: "OBR Mar 2024, central gov't debt interest" },
  { name: "Defense", pct: 5.2, pence: 5, color: "#b0682a", desc: "Armed forces, defense equipment, MOD operations", source: "PESA 2024, MOD spending" },
  { name: "Transport", pct: 4.1, pence: 4, color: "#3a7bc7", desc: "Rail, roads, local transport, aviation infrastructure", source: "PESA 2024, DfT spending" },
  { name: "Public Order & Safety", pct: 3.8, pence: 4, color: "#6b5cb8", desc: "Police, courts, prisons, fire services, border control", source: "PESA 2024, HO/MOJ spending" },
  { name: "Business & Industry", pct: 3.2, pence: 3, color: "#5a8fb0", desc: "Business support, energy, innovation, regional development", source: "PESA 2024, DBT/BEIS spending" },
  { name: "Local Government Grants", pct: 7.0, pence: 7, color: "#8a7a6a", desc: "Grants to local authorities for services not categorised above", source: "PESA 2024, local authority grants" },
  { name: "Other (admin, env, intl)", pct: 6.8, pence: 7, color: "#a0a0a0", desc: "Central admin, environment, international aid, overseas, culture, media", source: "PESA 2024, various departments" },
  { name: "Net Investment (capital)", pct: 10.0, pence: 10, color: "#4a7a5a", desc: "Infrastructure, schools, hospitals, roads — capital spending", source: "OBR Mar 2024, net investment" },
];

const historicalData = [
  { year: "2009/10", segments: [
    { label: "Welfare", pct: 28, color: "#2d8659" },
    { label: "Health", pct: 18, color: "#3a9b6f" },
    { label: "Education", pct: 12, color: "#5cb88a" },
    { label: "Defense", pct: 5, color: "#b0682a" },
    { label: "Other", pct: 37, color: "#a0a0a0" },
  ]},
  { year: "2014/15", segments: [
    { label: "Welfare", pct: 25, color: "#2d8659" },
    { label: "Health", pct: 19, color: "#3a9b6f" },
    { label: "Education", pct: 11, color: "#5cb88a" },
    { label: "Defense", pct: 5, color: "#b0682a" },
    { label: "Other", pct: 40, color: "#a0a0a0" },
  ]},
  { year: "2019/20", segments: [
    { label: "Welfare", pct: 24, color: "#2d8659" },
    { label: "Health", pct: 20, color: "#3a9b6f" },
    { label: "Education", pct: 10, color: "#5cb88a" },
    { label: "Defense", pct: 5, color: "#b0682a" },
    { label: "Other", pct: 41, color: "#a0a0a0" },
  ]},
  { year: "2023/24", segments: [
    { label: "Welfare", pct: 22, color: "#2d8659" },
    { label: "Health", pct: 20, color: "#3a9b6f" },
    { label: "Education", pct: 11, color: "#5cb88a" },
    { label: "Defense", pct: 5, color: "#b0682a" },
    { label: "Other", pct: 42, color: "#a0a0a0" },
  ]},
];

export default function TransparencyPage() {
  return (
    <div className="container-wide">
      <div className="page-header">
        <h1>Transparency</h1>
        <p>
          Where does your tax go? For every £1 collected, here's how much goes
          to the NHS, education, defense, welfare, and everything else. Sourced
          from HM Treasury and the OBR — every figure carries its source.
        </p>
      </div>

      <section className="section">
        <h2>For every £1 you pay in tax…</h2>
        <p style={{ color: "var(--fg-muted)", marginBottom: "30px" }}>
          Based on 2023/24 total managed expenditure of approximately £1,220
          billion. Rounded to the nearest penny.
        </p>
        <div className="pound-breakdown">
          {spending2023_24.map((item, i) => (
            <div key={i} className="pound-item">
              <div className="p">{item.pence}p</div>
              <div className="label">{item.name}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Full breakdown (2023/24)</h2>
        {spending2023_24.map((item, i) => (
          <div key={i} className="transp-bar-row">
            <div className="transp-bar-label">
              <span className="name">{item.name}</span>
              <span className="amount">{item.pct}% · {item.pence}p per £1</span>
            </div>
            <div className="transp-bar-track">
              <div
                className="transp-bar-fill"
                style={{
                  width: `${item.pct * 4}%`,
                  background: item.color,
                }}
              >
                {item.pct}%
              </div>
            </div>
            <div style={{ fontSize: "13px", color: "var(--fg-muted)", marginTop: "4px" }}>
              {item.desc} · <em>Source: {item.source}</em>
            </div>
          </div>
        ))}
      </section>

      <section className="section">
        <h2>How the split has changed over time</h2>
        <p style={{ color: "var(--fg-muted)", marginBottom: "30px" }}>
          Key categories as a share of total spending, from 2009/10 through
          2023/24. The story: welfare's share has fallen slightly, health has
          risen, and "other" (including debt interest and capital investment)
          has grown.
        </p>
        <div className="historical-chart">
          {historicalData.map((row, i) => (
            <div key={i} className="historical-row">
              <div className="year">{row.year}</div>
              <div className="bars">
                {row.segments.map((seg, j) => (
                  <div
                    key={j}
                    className="bar-seg"
                    style={{ width: `${seg.pct}%`, background: seg.color }}
                  >
                    {seg.pct >= 8 ? `${seg.label} ${seg.pct}%` : seg.pct >= 5 ? `${seg.pct}%` : ""}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="source" style={{ marginTop: "20px" }}>
          Sources: HM Treasury Public Expenditure Statistical Analyses (PESA)
          2010–2024, Office for Budget Responsibility (OBR) Economic and Fiscal
          Outlook March 2024. Historical percentages are approximate —
          category definitions have shifted over time. See{" "}
          <a href="https://www.gov.uk/government/collections/public-expenditure-statistical-analyses-pesa" target="_blank" rel="noopener">
            gov.uk PESA collections
          </a>{" "}
          and{" "}
          <a href="https://obr.uk/efo/economic-and-fiscal-outlook-march-2024/" target="_blank" rel="noopener">
            obr.uk EFO March 2024
          </a>.
        </div>
      </section>

      <section className="section">
        <h2>What this means in plain words</h2>
        <div className="callout callout-do">
          <h4>The honest picture</h4>
          <p>
            For every £1 of tax you pay, roughly 22p goes to welfare and
            pensions, 20p goes to the NHS, 11p goes to education, 7p pays
            interest on government debt, 5p goes to defense, and the remaining
            35p covers transport, policing, business support, local government
            grants, and capital investment in infrastructure.
          </p>
        </div>
        <div className="callout" style={{ background: "var(--accent-light)", borderLeft: "3px solid var(--accent)" }}>
          <h4 style={{ color: "var(--accent-dark)" }}>The biggest items</h4>
          <p>
            Welfare (including the state pension) and health together account
            for over 40% of all spending. They're also the fastest-growing
            categories. The state pension alone — paid to 12 million people —
            is the single largest line item in the budget, at roughly £125bn.
          </p>
        </div>
        <div className="callout" style={{ background: "var(--warning-light)", borderLeft: "3px solid var(--warning)" }}>
          <h4 style={{ color: "var(--warning)" }}>Debt interest</h4>
          <p>
            7p in every £1 goes to servicing government debt — paying interest
            to bondholders. This is money that doesn't build schools, fix roads,
            or fund hospitals. It's the cost of past borrowing, and it rises
            when interest rates rise.
          </p>
        </div>
      </section>

      <div className="source" style={{ marginTop: "40px" }}>
        <p>
          <strong>About these figures:</strong> The spending breakdown uses
          Total Managed Expenditure (TME) — the broadest measure of public
          spending, including central and local government. Percentages are
          rounded; some categories overlap with local government grants.
          Category names follow HM Treasury's Classification of the Functions
          of Government (COFOG) framework. Figures are for financial year
          2023/24 (April 2023 to March 2024) unless otherwise stated. Always
          verify against the latest PESA publication before relying on these
          numbers.
        </p>
      </div>
    </div>
  );
}