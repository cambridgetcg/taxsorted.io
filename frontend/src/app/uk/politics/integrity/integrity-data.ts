export const politicsApiBase = "https://api.taxsorted.io/v1/politics/uk";

export type DatasetStatus = "Live" | "Review gate" | "Mapped" | "Licence gate";

export interface FinanceDataset {
  id: string;
  title: string;
  status: DatasetStatus;
  summary: string;
  published: string;
  withheld: string;
  sourceUrl: string;
  endpoint?: string;
}

export const financeDatasets: FinanceDataset[] = [
  {
    id: "contracts",
    title: "Public contract awards",
    status: "Live",
    summary: "Contracts Finder award releases, projected into organisation-first records.",
    published: "Buyer, verified organisation supplier, OCID, value, dates and classification.",
    withheld: "Addresses, contact people, direct contacts, attachment bodies and unverified supplier names.",
    sourceUrl: "https://www.contractsfinder.service.gov.uk/apidocumentation/home",
    endpoint: "/relationships/contracts?from=2026-06-01&to=2026-06-30&take=10",
  },
  {
    id: "ministerial-benefits",
    title: "Ministerial gifts and hospitality",
    status: "Review gate",
    summary: "The monthly central-government CSV parser is built, but named records are not open yet.",
    published: "When approved: minister, department, date, published benefit, direction, counterparty and value.",
    withheld: "Name-based joins, private contacts and any claim that a reported benefit bought influence.",
    sourceUrl: "https://www.gov.uk/government/collections/register-of-ministers-gifts-and-hospitality",
    endpoint: "/relationships/ministerial-benefits",
  },
  {
    id: "commons-interests",
    title: "Commons financial interests",
    status: "Mapped",
    summary: "The official register is mapped; its sensitive free text still needs a field-level parser and review.",
    published: "Planned: member ID, category, dates, corporate organisation, company number and declared value.",
    withheld: "Family categories, addresses, residence clues, natural-person counterparties and unreviewed free text.",
    sourceUrl: "https://interests-api.parliament.uk/index.html",
  },
  {
    id: "lobbying",
    title: "Consultant-lobbyist client returns",
    status: "Mapped",
    summary: "The official register is identified; reuse terms and normalisation still need review.",
    published: "Planned: registered organisation, company number, quarter, organisation client and nil return.",
    withheld: "Name-only entity joins and claims about what lobbying achieved.",
    sourceUrl: "https://registrarofconsultantlobbyists.org.uk/",
  },
  {
    id: "ministerial-meetings-travel",
    title: "Ministerial meetings and travel",
    status: "Mapped",
    summary: "Department meeting, overseas-travel and related transparency returns need a reviewed shared parser.",
    published: "Planned: minister, department, period, organisation counterparty, published purpose and reported cost.",
    withheld: "Unreviewed free text, natural-person enrichment, name-only joins and any claim that a meeting produced an agreement.",
    sourceUrl: "https://www.gov.uk/government/collections/how-to-publish-central-government-transparency-data",
  },
  {
    id: "appg-benefits",
    title: "APPG benefits",
    status: "Mapped",
    summary: "The official All-Party Parliamentary Group register reports officers, secretariats and qualifying benefits.",
    published: "Planned: group, purpose, Parliamentary officers, secretariat organisation, benefit source, value band and dates.",
    withheld: "Private-person enrichment and unsupported claims that a group acted for a benefit source.",
    sourceUrl: "https://www.parliament.uk/mps-lords-and-offices/standards-and-financial-interests/parliamentary-commissioner-for-standards/registers-of-interests/register-of-all-party-party-parliamentary-groups/",
  },
  {
    id: "companies",
    title: "Company identity",
    status: "Mapped",
    summary: "Companies House can verify an organisation by its exact public identifier.",
    published: "Planned: company number, name, status, type, SIC and incorporation or filing dates.",
    withheld: "Officer and individual PSC data, addresses, birth data, signatures and filing images.",
    sourceUrl: "https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference",
  },
  {
    id: "grants-subsidies",
    title: "Government grants and subsidies",
    status: "Mapped",
    summary: "Official grant and subsidy registers are mapped; a shared organisation-first format is next.",
    published: "Planned: verified recipient organisation, authority, programme, value or band, dates and legal basis.",
    withheld: "Natural-person recipients and unsupported claims of political involvement.",
    sourceUrl: "https://www.gov.uk/government/collections/government-grants-data-and-statistics",
  },
  {
    id: "payments-ipsa",
    title: "Department payments and MPs' costs",
    status: "Mapped",
    summary: "Monthly department spending files and IPSA bulk publications remain separate public-money records.",
    published: "Planned: public body, corporate supplier, amount, date, expense type, reference and business-cost category.",
    withheld: "Staff identities or pay, accommodation detail, security-sensitive costs and unsanctioned website crawling.",
    sourceUrl: "https://www.ipsaonline.org.uk/guidance/how-your-funding-is-published",
  },
  {
    id: "charities",
    title: "Charity identity",
    status: "Mapped",
    summary: "The Charity Commission register can verify an organisation through its exact charity number.",
    published: "Planned: charity number, name, status, classification, organisation finances and return dates.",
    withheld: "Trustee or contact-person enrichment, addresses and name-only joins.",
    sourceUrl: "https://register-of-charities.charitycommission.gov.uk/en/documentation-on-the-api",
  },
  {
    id: "corporate-land",
    title: "Corporate land in England and Wales",
    status: "Licence gate",
    summary: "HM Land Registry corporate ownership data has its own licence and is not open in this API yet.",
    published: "After approval: verified company proprietor, title ID, tenure, broad geography and reported price.",
    withheld: "Natural-person ownership, reverse person search, residential targeting and proprietor addresses.",
    sourceUrl: "https://www.gov.uk/guidance/hm-land-registry-uk-companies-that-own-property-in-england-and-wales",
  },
  {
    id: "electoral-finance",
    title: "Electoral Commission political finance",
    status: "Licence gate",
    summary: "The normalized donation door stays closed until database-reuse terms are confirmed in writing.",
    published: "After approval: corporate donor or lender, company number, recipient, amount, type and dates.",
    withheld: "Addresses, postcodes, sole traders and individual donors without a separate lawful-basis review.",
    sourceUrl: "https://search.electoralcommission.org.uk/",
    endpoint: "/funding/donations",
  },
];

export interface AccountabilityMap {
  id: string;
  jurisdiction: string;
  summary: string;
  steps: Array<{ office: string; responsibility: string; boundary: string }>;
  checks: string;
}

export const accountabilityMaps: AccountabilityMap[] = [
  {
    id: "england-wales",
    jurisdiction: "England & Wales",
    summary: "Local strategy and operational command are deliberately held by different offices.",
    steps: [
      {
        office: "PCC or policing mayor",
        responsibility: "Sets the police and crime plan, budget and precept; appoints the chief constable through the statutory process.",
        boundary: "Does not direct an investigation, arrest, deployment or incident.",
      },
      {
        office: "Chief constable",
        responsibility: "Directs and controls the territorial force and its operations within law.",
        boundary: "Does not decide whether the CPS prosecutes or whether a court convicts.",
      },
      {
        office: "Crown Prosecution Service",
        responsibility: "Makes independent charging decisions in serious or complex cases and conducts prosecutions.",
        boundary: "A police referral is not a prosecution decision or a finding of guilt.",
      },
    ],
    checks: "Police and crime panels scrutinise core PCC decisions; IOPC oversees complaints and serious conduct matters; HMICFRS inspects forces.",
  },
  {
    id: "scotland",
    jurisdiction: "Scotland",
    summary: "Scotland has one national police service with separate governance, command, oversight and prosecution.",
    steps: [
      {
        office: "Scottish Police Authority",
        responsibility: "Maintains policing, allocates resources and holds the Chief Constable to account.",
        boundary: "Governance does not make the Authority an incident commander.",
      },
      {
        office: "Chief Constable",
        responsibility: "Directs and controls Police Scotland and its resources.",
        boundary: "Remains accountable to the Authority and subject to lawful prosecutorial instructions where relevant.",
      },
      {
        office: "COPFS",
        responsibility: "Independently decides and conducts prosecutions and can direct relevant investigations in law.",
        boundary: "A police report does not decide prosecution or the court outcome.",
      },
    ],
    checks: "PIRC independently investigates specified matters and reviews complaint handling; other inspection and court routes remain separate.",
  },
  {
    id: "northern-ireland",
    jurisdiction: "Northern Ireland",
    summary: "The Policing Board scrutinises; PSNI commands operations; PPSNI decides prosecutions.",
    steps: [
      {
        office: "Northern Ireland Policing Board",
        responsibility: "Sets the policing plan, appoints senior leadership through statute and scrutinises performance.",
        boundary: "Does not issue operational orders or direct investigations.",
      },
      {
        office: "PSNI Chief Constable",
        responsibility: "Directs and controls PSNI operations.",
        boundary: "Operational command does not decide an independent prosecution or court outcome.",
      },
      {
        office: "PPSNI",
        responsibility: "Independently decides whether to prosecute referred investigations and conducts prosecutions.",
        boundary: "Referral, charge, prosecution and conviction remain separate states.",
      },
    ],
    checks: "The public institutional map links each responsibility to its official contact and governance source.",
  },
  {
    id: "nca",
    jurisdiction: "UK serious & organised crime",
    summary: "National accountability does not silently become political direction of an operation or case.",
    steps: [
      {
        office: "Home Secretary",
        responsibility: "Carries strategy, governance, funding and Parliamentary accountability within the statutory framework.",
        boundary: "Political accountability is not a power to order an individual investigation or prosecution.",
      },
      {
        office: "NCA Director General",
        responsibility: "Leads the NCA and makes operational decisions independently within its legal remit.",
        boundary: "Territorial arrangements and statutory powers define its reach.",
      },
      {
        office: "Prosecution authority",
        responsibility: "The independent authority for the relevant UK jurisdiction decides prosecution.",
        boundary: "Law-enforcement action does not establish guilt; courts adjudicate.",
      },
    ],
    checks: "The Director General is accountable to the Home Secretary and Parliament while operational decisions remain independent.",
  },
];

export const powerDimensions = [
  { id: "coercive", label: "Coercive authority" },
  { id: "operational", label: "Operational direction" },
  { id: "prosecution", label: "Prosecution discretion" },
  { id: "rulesSanctions", label: "Rules & sanctions" },
  { id: "resources", label: "Money & resources" },
  { id: "appointments", label: "Appointments & removal" },
  { id: "scope", label: "Geographic scope" },
] as const;

export type EnforcementPowerDimension = (typeof powerDimensions)[number]["id"];
export type PowerScore = 0 | 1 | 2 | 3 | 4 | 5;

export interface EnforcementPowerCard {
  officeId: string;
  office: string;
  family: string;
  jurisdiction: string;
  methodVersion: string;
  rating: number;
  scores: Record<EnforcementPowerDimension, PowerScore>;
  constraints: string[];
  sourceIds: string[];
}

export const enforcementPowerCards: EnforcementPowerCard[] = [
  {
    officeId: "ew:office:chief-constable",
    office: "Territorial Chief Constable baseline",
    family: "England & Wales territorial policing",
    jurisdiction: "One territorial force area",
    methodVersion: "taxsorted.uk.enforcement-office-power/1.0.0-draft",
    rating: 65,
    scores: { coercive: 5, operational: 5, prosecution: 0, rulesSanctions: 2, resources: 4, appointments: 3, scope: 3 },
    constraints: ["PCC or mayor sets strategy and budget but cannot command operations.", "CPS makes independent prosecution decisions; courts adjudicate."],
    sourceIds: ["chief-constable-profile", "pcc-panel-guidance", "cps-role", "iopc-role", "hmicfrs-role"],
  },
  {
    officeId: "ew:office:pcc-mayor-baseline",
    office: "PCC / policing mayor baseline",
    family: "England & Wales democratic accountability",
    jurisdiction: "One police area",
    methodVersion: "taxsorted.uk.enforcement-office-power/1.0.0-draft",
    rating: 40,
    scores: { coercive: 0, operational: 0, prosecution: 0, rulesSanctions: 2, resources: 4, appointments: 5, scope: 3 },
    constraints: ["Cannot direct investigations, arrests, deployments or incident command.", "A police and crime panel scrutinises core decisions."],
    sourceIds: ["pcc-panel-guidance", "chief-constable-profile"],
  },
  {
    officeId: "ew:office:director-of-public-prosecutions",
    office: "Director of Public Prosecutions",
    family: "England & Wales prosecution",
    jurisdiction: "England and Wales",
    methodVersion: "taxsorted.uk.enforcement-office-power/1.0.0-draft",
    rating: 65,
    scores: { coercive: 1, operational: 4, prosecution: 5, rulesSanctions: 3, resources: 3, appointments: 3, scope: 4 },
    constraints: ["Police investigate; courts decide guilt and sentence.", "Attorney General superintendence is not day-to-day direction of individual cases."],
    sourceIds: ["cps-role", "cps-accountability"],
  },
  {
    officeId: "uk:office:home-secretary-law-enforcement-baseline",
    office: "Home Secretary law-enforcement baseline",
    family: "UK government sponsorship and policing policy",
    jurisdiction: "UK, varying by devolution and statute",
    methodVersion: "taxsorted.uk.enforcement-office-power/1.0.0-draft",
    rating: 50,
    scores: { coercive: 1, operational: 0, prosecution: 0, rulesSanctions: 4, resources: 4, appointments: 3, scope: 5 },
    constraints: ["Funding and political accountability do not create case-direction power.", "Devolved policing systems have separate ministers and institutions."],
    sourceIds: ["police-grants-ew-2026", "nca-governance", "chief-constable-profile", "cps-accountability"],
  },
  {
    officeId: "uk:office:nca-director-general",
    office: "NCA Director General",
    family: "UK national law enforcement",
    jurisdiction: "UK, with territorial arrangements",
    methodVersion: "taxsorted.uk.enforcement-office-power/1.0.0-draft",
    rating: 70,
    scores: { coercive: 5, operational: 5, prosecution: 0, rulesSanctions: 2, resources: 4, appointments: 4, scope: 5 },
    constraints: ["Prosecution authorities make independent prosecution decisions.", "Accountable to the Home Secretary and Parliament while operational decisions remain independent."],
    sourceIds: ["nca-governance", "cps-role", "ppsni-governance", "copfs-role"],
  },
  {
    officeId: "scotland:office:chief-constable",
    office: "Chief Constable of Police Scotland",
    family: "Scottish policing",
    jurisdiction: "Scotland",
    methodVersion: "taxsorted.uk.enforcement-office-power/1.0.0-draft",
    rating: 70,
    scores: { coercive: 5, operational: 5, prosecution: 0, rulesSanctions: 2, resources: 4, appointments: 3, scope: 5 },
    constraints: ["The Scottish Police Authority governs and holds the office to account.", "COPFS independently prosecutes and may give lawful instructions in relevant investigations."],
    sourceIds: ["scotland-police-act-2012", "spa-governance", "copfs-role", "pirc-role"],
  },
  {
    officeId: "ni:office:psni-chief-constable",
    office: "PSNI Chief Constable",
    family: "Northern Ireland policing",
    jurisdiction: "Northern Ireland",
    methodVersion: "taxsorted.uk.enforcement-office-power/1.0.0-draft",
    rating: 70,
    scores: { coercive: 5, operational: 5, prosecution: 0, rulesSanctions: 2, resources: 4, appointments: 3, scope: 5 },
    constraints: ["The Policing Board appoints and scrutinises but does not direct operations.", "PPSNI independently decides prosecutions."],
    sourceIds: ["ni-policing-map", "ppsni-governance"],
  },
];

export const integrityApiDoors = [
  { path: "/integrity", label: "Scope, truth rule and publication gates" },
  { path: "/integrity/sources", label: "Official source and reuse ledger" },
  { path: "/integrity/corrections", label: "Correction, restriction and urgent-safety method" },
  { path: "/relationships/schema", label: "Evidence-event schema and joining rules" },
  { path: "/relationships/datasets", label: "Finance and relationship dataset status" },
  { path: "/relationships/contracts?from=2026-06-01&to=2026-06-30&take=10", label: "Live, redacted contract awards" },
  { path: "/enforcement/institutions", label: "UK enforcement institutions and contacts" },
  { path: "/enforcement/governance", label: "Accountability and command relationships" },
  { path: "/enforcement/forces", label: "Live police-force directory" },
  { path: "/enforcement/pay-benefits", label: "Official pay and benefits sources" },
  { path: "/enforcement/workforce", label: "Aggregate workforce and demographics sources" },
  { path: "/enforcement/vacancies", label: "Official recruitment routes" },
  { path: "/enforcement/activities", label: "Safe public-activity coverage" },
  { path: "/enforcement/private-security", label: "SIA and private-security publication boundary" },
  { path: "/enforcement/power/offices", label: "Mapped formal office-power cards" },
  { path: "/enforcement/communication-method", label: "Observable official-language method" },
] as const;

export const integrityDistributionDoors = [
  { path: "/datasets", label: "After API deployment: browse release state and every catalogued distribution" },
  { path: "/datasets/schema", label: "After API deployment: validate the shared JSON dataset envelope" },
  { path: "/datasets/rights", label: "After API deployment: read the curation and source-rights boundary" },
  { path: "/datasets/admissions", label: "After API deployment: inspect every dataset admission and pending human decision" },
  { path: "/datasets/finance-dataset-catalog", label: "After human release approval: finance-source publication-status records" },
  { path: "/datasets/enforcement-governance", label: "After human release approval: enforcement governance JSON" },
  { path: "/datasets/enforcement-governance/download?format=csv", label: "After human release approval: enforcement governance CSV" },
  { path: "/datasets/enforcement-governance/download?format=ndjson", label: "After human release approval: enforcement governance NDJSON" },
] as const;

export const englandWalesPolicePay = {
  asAt: "10 July 2026",
  effectiveFrom: "1 September 2025",
  sourceUrl:
    "https://www.gov.uk/government/publications/home-office-evidence-to-the-police-remuneration-review-body-2026-to-2027/home-office-evidence-to-the-police-remuneration-review-body-2026-to-2027-accessible",
  ranks: [
    { rank: "Constable", minimum: 31_164, maximum: 50_256 },
    { rank: "Sergeant", minimum: 53_568, maximum: 56_208 },
    { rank: "Inspector", minimum: 63_768, maximum: 68_982 },
    { rank: "Chief Inspector", minimum: 70_344, maximum: 73_149 },
    { rank: "Superintendent", minimum: 84_177, maximum: 99_015 },
    { rank: "Chief Superintendent", minimum: 103_797, maximum: 115_785 },
  ],
  benefits: [
    "Defined-benefit, inflation-linked pension; the Home Office states a 35.3% employer contribution.",
    "Subject to the progression standard, constables typically reach the top point in six years; other ranks in three to four years.",
    "Eligible federated-rank hours from 20:00 to 06:00 receive an additional 10% of basic hourly pay.",
  ],
} as const;

export const excludedIntegrityMaterial = [
  "Private or residential addresses, direct personal contacts, family links and reverse person-to-property searches.",
  "Rank-and-file rosters, investigators, specialist-unit membership, shifts, deployments, tactics, protected sites or live incidents.",
  "Victim, witness, suspect, conviction, complaint or disciplinary dossiers.",
  "Guessed quid pro quo, influence, corruption, guilt, ideology, intent, personality or management style.",
];

export const gatedIntegrityMaterial = [
  "Parliament-published staff names, pending a separate necessity and reasonable-expectations review.",
  "Commons registered-interest text, pending the separate field, third-party and land-detail review.",
  "Named ministerial gift and hospitality rows, pending field-level lawful-basis, counterparty and correction review.",
  "Named senior police leadership rows, pending the senior-office threshold, correction route and safety review.",
  "Identifiable language analysis, pending a separate legitimate-interests and data-protection impact assessment.",
  "Corporate land and Electoral Commission mirrors, pending separate licence/reuse decisions and the political-finance privacy review.",
];
