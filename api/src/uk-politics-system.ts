// Curated, source-linked facts about the UK political system.
//
// This module contains no personal data. It deliberately separates an
// office's published legal/institutional powers from the person who happens
// to hold that office, and separates evidence of a relationship from any
// claim about influence or wrongdoing.

export type PoliticsSystemSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: "legislation" | "official-guidance" | "official-data" | "official-explanation";
  retrievedAt: string;
  supports: string;
};

export const politicsSystemSources: PoliticsSystemSource[] = [
  {
    id: "ec-election-role",
    title: "What we do in elections",
    publisher: "Electoral Commission",
    url: "https://www.electoralcommission.org.uk/about-us/our-role-and-responsibilities/what-we-do-elections",
    kind: "official-explanation",
    retrievedAt: "2026-07-10",
    supports:
      "The Commission guides and regulates, but local Returning Officers run polling stations, count votes and declare results in Great Britain; the Chief Electoral Officer does so in Northern Ireland.",
  },
  {
    id: "ec-ukpge-roles",
    title: "Who does what at a UK Parliamentary general election",
    publisher: "Electoral Commission",
    url: "https://www.electoralcommission.org.uk/guidance-candidates-and-agents-uk-parliamentary-general-elections-great-britain/what-you-need-know-you-stand-a-candidate/who-does-what-a-uk-parliamentary-general-election-and-how-contact-them",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "The separate responsibilities of Acting Returning Officers in England and Wales, Returning Officers in Scotland, Electoral Registration Officers and the Electoral Commission at a UK Parliamentary general election.",
  },
  {
    id: "ec-candidate-spending",
    title: "Campaign spending: candidates",
    publisher: "Electoral Commission",
    url: "https://www.electoralcommission.org.uk/political-registration-and-regulation/financial-reporting/campaign-spending-candidates",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "Candidate spending limits, returns to the local Returning Officer, publication for major elections, and police responsibility for potential candidate-spending breaches.",
  },
  {
    id: "ec-party-spending",
    title: "Party spending and pre-poll donations and loans: UK Parliamentary general election",
    publisher: "Electoral Commission",
    url: "https://www.electoralcommission.org.uk/full-guidance/party-spending-and-pre-poll-donations-and-loans-uk-parliamentary-general-election",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "The regulated period, current party spending-limit formula, responsible party officer, reporting duties and enforcement approach.",
  },
  {
    id: "ec-non-party-campaigners",
    title: "Non-party campaigners: UK Parliamentary general elections",
    publisher: "Electoral Commission",
    url: "https://www.electoralcommission.org.uk/full-guidance/non-party-campaigners-uk-parliamentary-general-elections",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "Eligibility, notification and reporting thresholds for regulated campaigning by people and organisations that are not political parties or candidates.",
  },
  {
    id: "ec-permissible-sources",
    title: "Permissible sources",
    publisher: "Electoral Commission",
    url: "https://www.electoralcommission.org.uk/political-registration-and-regulation/financial-reporting/donations-and-loans/permissible-sources",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "Who may give regulated donations or loans, and the recipient's duty to check whether a source is permissible.",
  },
  {
    id: "ec-donations-reporting",
    title: "Donations and loans reporting",
    publisher: "Electoral Commission",
    url: "https://www.electoralcommission.org.uk/political-registration-and-regulation/financial-reporting/donations-and-loans",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "Current reporting routes and thresholds for political parties, candidates, non-party campaigners, regulated individuals and other regulated recipients.",
  },
  {
    id: "ec-candidate-donations",
    title: "What counts as a candidate donation",
    publisher: "Electoral Commission",
    url: "https://www.electoralcommission.org.uk/guidance-candidates-and-agents-uk-parliamentary-general-elections-great-britain/candidate-donations/what-counts-a-donation",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports: "The candidate-donation threshold and what must be handled under the candidate regime.",
  },
  {
    id: "rpa-1983",
    title: "Representation of the People Act 1983",
    publisher: "The National Archives",
    url: "https://www.legislation.gov.uk/ukpga/1983/2/contents",
    kind: "legislation",
    retrievedAt: "2026-07-10",
    supports:
      "Core law for UK Parliamentary election administration, candidate spending, election offences and election petitions, as amended.",
  },
  {
    id: "ppera-2000",
    title: "Political Parties, Elections and Referendums Act 2000",
    publisher: "The National Archives",
    url: "https://www.legislation.gov.uk/ukpga/2000/41/contents",
    kind: "legislation",
    retrievedAt: "2026-07-10",
    supports:
      "Political-party registration and the framework for regulated donations, loans, party spending, non-party campaigning and Electoral Commission oversight.",
  },
  {
    id: "dcpa-2022",
    title: "Dissolution and Calling of Parliament Act 2022",
    publisher: "The National Archives",
    url: "https://www.legislation.gov.uk/ukpga/2022/11/contents",
    kind: "legislation",
    retrievedAt: "2026-07-10",
    supports:
      "The current statutory framework restoring dissolution of Parliament by the Sovereign and providing automatic dissolution at the five-year limit.",
  },
  {
    id: "parliament-mps",
    title: "What do MPs do?",
    publisher: "UK Parliament",
    url: "https://www.parliament.uk/about/mps-and-lords/members/mps/",
    kind: "official-explanation",
    retrievedAt: "2026-07-10",
    supports:
      "MPs represent constituents and collectively examine and approve laws and taxes, scrutinise government and debate public questions.",
  },
  {
    id: "parliament-scrutiny",
    title: "How do MPs hold government to account?",
    publisher: "UK Parliament",
    url: "https://www.parliament.uk/about/how/role/scrutiny/commons-checking-work-of-government/",
    kind: "official-explanation",
    retrievedAt: "2026-07-10",
    supports:
      "Questions, urgent questions, written questions and select-committee scrutiny, including requests for information and public evidence sessions.",
  },
  {
    id: "parliament-spending",
    title: "Check and approve Government spending and taxation",
    publisher: "UK Parliament",
    url: "https://www.parliament.uk/about/how/role/check-and-approve-government-spending-and-taxation/",
    kind: "official-explanation",
    retrievedAt: "2026-07-10",
    supports:
      "The House of Commons approves departmental Estimates and tax legislation; select committees and the Public Accounts Committee scrutinise spending.",
  },
  {
    id: "pm-responsibilities",
    title: "Prime Minister: responsibilities",
    publisher: "UK Government",
    url: "https://www.gov.uk/government/ministers/prime-minister",
    kind: "official-explanation",
    retrievedAt: "2026-07-10",
    supports:
      "The Prime Minister leads the government, is ultimately responsible for its policy and decisions, oversees the Civil Service and agencies, and chooses government members.",
  },
  {
    id: "ministerial-code",
    title: "Ministerial Code",
    publisher: "Cabinet Office",
    url: "https://www.gov.uk/government/publications/ministerial-code/ministerial-code",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "Ministerial accountability, collective responsibility, conduct, interests, appointments and the limits attached to ministerial office.",
  },
  {
    id: "select-committee-powers",
    title: "Powers of select committees",
    publisher: "UK Parliament",
    url: "https://guidetoprocedure.parliament.uk/collections/luhXGjBq/powers-of-select-committees",
    kind: "official-explanation",
    retrievedAt: "2026-07-10",
    supports:
      "Select-committee powers belong to the committee collectively; chairs organise and lead scrutiny but do not personally inherit every committee power.",
  },
  {
    id: "main-estimates-2026-27",
    title: "Main Estimates: Government spending plans for 2026/27",
    publisher: "House of Commons Library",
    url: "https://commonslibrary.parliament.uk/research-briefings/cbp-10647/",
    kind: "official-data",
    retrievedAt: "2026-07-10",
    supports:
      "The 2026/27 departmental spending plans, aggregate budget categories, and the Commons process that gives voted spending legal authority.",
  },
  {
    id: "supply-estimates-manual-2026",
    title: "Supply Estimates: a guidance manual 2026",
    publisher: "HM Treasury",
    url: "https://www.gov.uk/government/publications/supply-estimates-guidance-manual/supply-estimates-a-guidance-manual-2026",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "Treasury controls, departmental Estimates, Parliament's authority, and the separate responsibilities of ministers and departmental Accounting Officers.",
  },
  {
    id: "public-spending-accountability",
    title: "Public spending: the accountability framework",
    publisher: "HM Treasury",
    url: "https://www.gov.uk/government/publications/public-spending-the-accountability-framework/public-spending-the-accountability-framework",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "Accounting Officer assessments and published ministerial directions when a spending proposal does not meet regularity, propriety, value-for-money or feasibility tests.",
  },
  {
    id: "ipsa-publication",
    title: "How your funding is published",
    publisher: "Independent Parliamentary Standards Authority",
    url: "https://www.ipsaonline.org.uk/guidance/how-your-funding-is-published",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "How IPSA publishes MPs' staffing and business-cost data under the Funding Scheme for MPs.",
  },
  {
    id: "ministerial-gifts",
    title: "Register of Ministers' Gifts and Hospitality",
    publisher: "Cabinet Office",
    url: "https://www.gov.uk/government/collections/register-of-ministers-gifts-and-hospitality",
    kind: "official-data",
    retrievedAt: "2026-07-10",
    supports:
      "Monthly ministerial gifts and hospitality; departments separately publish quarterly ministerial meetings and overseas travel.",
  },
  {
    id: "consultant-lobbyists",
    title: "Register of Consultant Lobbyists",
    publisher: "Office of the Registrar of Consultant Lobbyists",
    url: "https://registrarofconsultantlobbyists.org.uk/",
    kind: "official-data",
    retrievedAt: "2026-07-10",
    supports:
      "Registered consultant lobbyists, their declared clients and quarterly returns under the statutory register.",
  },
  {
    id: "contracts-finder-ocds",
    title: "Publishing contract data",
    publisher: "Cabinet Office",
    url: "https://www.gov.uk/government/publications/open-standards-for-government/open-contracting-data-standard-profile",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "The Open Contracting Data Standard and official Contracts Finder API for buyers, suppliers, notices and awards.",
  },
  {
    id: "companies-house-profile",
    title: "Companies House Public Data API: company profile",
    publisher: "Companies House",
    url: "https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/company-profile/company-profile",
    kind: "official-data",
    retrievedAt: "2026-07-10",
    supports:
      "Company identity, number, status, incorporation date, classifications and filing dates for identifier-based corporate cross-checks.",
  },
  {
    id: "commons-standards",
    title: "Accountability and Standards",
    publisher: "UK Parliament",
    url: "https://www.parliament.uk/about/mps-and-lords/members/standards/",
    kind: "official-explanation",
    retrievedAt: "2026-07-10",
    supports:
      "The public record and bodies that enforce different rules applying to MPs, including Parliamentary standards, IPSA, the ICO and the Electoral Commission.",
  },
  {
    id: "ec-election-api",
    title: "Election Information API",
    publisher: "Electoral Commission",
    url: "https://api.electoralcommission.org.uk/docs/",
    kind: "official-data",
    retrievedAt: "2026-07-10",
    supports:
      "Upcoming ballots, candidates, voting systems, supplied polling-place information and institutional electoral-services contacts, subject to the API's coverage and attribution terms.",
  },
  {
    id: "commons-election-results",
    title: "UK Parliament election results",
    publisher: "House of Commons Library",
    url: "https://electionresults.parliament.uk/",
    kind: "official-data",
    retrievedAt: "2026-07-10",
    supports:
      "Structured UK Parliamentary general- and by-election history, with stated coverage, a data dictionary and an Open Parliament Licence source database.",
  },
  {
    id: "ec-enforcement",
    title: "Our enforcement work",
    publisher: "Electoral Commission",
    url: "https://www.electoralcommission.org.uk/political-registration-and-regulation/our-enforcement-work",
    kind: "official-explanation",
    retrievedAt: "2026-07-10",
    supports:
      "The Commission's current political-finance investigation, civil-sanction, undertaking, restoration, forfeiture and referral functions.",
  },
  {
    id: "representation-people-bill-2026",
    title: "Representation of the People Bill",
    publisher: "UK Parliament",
    url: "https://bills.parliament.uk/bills/4080",
    kind: "official-data",
    retrievedAt: "2026-07-10",
    supports:
      "The live Parliamentary status and stages of proposed electoral and political-finance changes; a bill is not current law until enacted and commenced.",
  },
  {
    id: "policy-development-grants",
    title: "Public funding for political parties",
    publisher: "Electoral Commission",
    url: "https://www.electoralcommission.org.uk/political-registration-and-regulation/financial-reporting/donations-and-loans/public-funding-political-parties",
    kind: "official-guidance",
    retrievedAt: "2026-07-10",
    supports:
      "The Policy Development Grants scheme and the distinction between public support and private donations.",
  },
  {
    id: "short-money",
    title: "Short Money",
    publisher: "House of Commons Library",
    url: "https://commonslibrary.parliament.uk/research-briefings/SN01663/",
    kind: "official-explanation",
    retrievedAt: "2026-07-10",
    supports:
      "Commons financial assistance for opposition parties and the scheme's calculation and accountability rules.",
  },
  {
    id: "cranborne-money",
    title: "Financial assistance for opposition parties in the House of Lords",
    publisher: "UK Parliament",
    url: "https://www.parliament.uk/mps-lords-and-offices/members-allowances/house-of-lords/financial-assistance-for-opposition-parties/",
    kind: "official-data",
    retrievedAt: "2026-07-10",
    supports: "Cranborne Money allocations and reporting for opposition parties in the House of Lords.",
  },
  {
    id: "returning-officer-charges-2024",
    title: "Returning Officers' Charges Order 2024",
    publisher: "The National Archives",
    url: "https://www.legislation.gov.uk/uksi/2024/693/contents/made",
    kind: "legislation",
    retrievedAt: "2026-07-10",
    supports:
      "Maximum recoverable amounts and qualifying services or expenses for delivery of the 2024 UK Parliamentary general election; a cap is not the same as final cost.",
  },
];

export const politicsSystemScope = {
  jurisdiction: "United Kingdom",
  release: "Westminster foundation",
  lawAsAt: "2026-07-10",
  included: [
    "UK Parliamentary general-election process and responsibility hand-offs",
    "Party, candidate and non-party campaign-finance rules",
    "Westminster office-power method and first calibrated office assessments",
    "Public-money accountability and official budget source map",
    "Public political-funding scheme map and election-delivery funding distinction",
    "Official evidence lanes for corporate and organisational relationships",
    "Current-versus-proposed law status and an honest historical coverage map",
  ],
  notYetComplete: [
    "Devolved, mayoral, local-authority and police-and-crime-commissioner election variants",
    "A complete effective-dated ledger of every office, office-holder and historical assessment",
    "Normalized ministerial meetings, lobbying, procurement and company records",
    "Portfolio-specific statutory powers for every minister",
    "Per-department budget rows and outturn reconciliations",
  ],
  rule:
    "An omitted topic is a declared coverage gap, not an implied absence of power, money, a relationship or a record.",
};

export const sourceUsePolicy = {
  rule:
    "A public source, permission to reuse a database, and a data-protection lawful basis are separate questions. A source link in this curation does not claim a blanket licence over the upstream dataset.",
  curatedFacts:
    "The system endpoints use short TaxSorted summaries linked to official pages. Raw or normalized source records need the separate status below.",
  dataFamilies: [
    {
      id: "uk-parliament-members",
      status: "blocked-pending-people-publication-review",
      reuse: "Open Parliament Licence v3.0, subject to its exclusions and separate personal-data duties",
      termsUrl: "https://www.parliament.uk/site-information/copyright/open-parliament-licence/",
    },
    {
      id: "commons-election-results",
      status: "licensed-source-mapped-not-ingested",
      reuse: "Open Parliament Licence v3.0, subject to its personal-data exclusion",
      termsUrl: "https://www.parliament.uk/site-information/copyright/open-parliament-licence/",
    },
    {
      id: "ec-election-api",
      status: "licensed-source-mapped-tokenized-lookup-not-built",
      reuse:
        "Published API terms permit commercial reuse with Electoral Commission, Ordnance Survey and Royal Mail attribution",
      termsUrl: "https://api.electoralcommission.org.uk/terms/",
    },
    {
      id: "electoral-commission-political-finance-online",
      status: "blocked-pending-written-reuse-confirmation",
      reuse:
        "The Election Information API terms are not assumed to cover Political Finance Online, candidate-return spreadsheets or enforcement tables",
      termsUrl: "https://search.electoralcommission.org.uk/",
    },
    {
      id: "companies-house-profile",
      status: "official-source-mapped-profile-lookup-not-built",
      reuse: "Companies House-created material is generally Crown copyright/Open Government Licence; field and privacy review still applies",
      termsUrl:
        "https://www.gov.uk/government/publications/companies-house-accreditation-to-information-fair-traders-scheme/public-task-copyright-and-crown-copyright",
    },
  ],
};

export const electionActors = [
  {
    id: "prime-minister-and-crown",
    name: "Prime Minister and the Crown",
    kind: "constitutional-election-calling-roles",
    chosenBy:
      "The Prime Minister holds office by constitutional appointment and confidence; the Sovereign is hereditary head of state.",
    responsibleFor: [
      "The Prime Minister may request dissolution; the Sovereign dissolves Parliament under the restored constitutional framework",
      "Automatic dissolution also occurs at the statutory five-year limit if no earlier dissolution has taken place",
    ],
    notResponsibleFor: ["Administering nominations", "Running polling stations", "Counting votes"],
    sourceIds: ["dcpa-2022", "pm-responsibilities"],
  },
  {
    id: "uk-parliament",
    name: "UK Parliament",
    kind: "legislature",
    chosenBy: "Commons members are elected; Lords membership follows separate appointment, hereditary and office routes.",
    responsibleFor: [
      "Making the primary law that governs elections and political finance",
      "Authorising changes to statutory rules and public spending",
    ],
    notResponsibleFor: ["Running polling stations", "Counting votes", "Investigating every alleged offence"],
    sourceIds: ["rpa-1983", "ppera-2000", "parliament-spending"],
  },
  {
    id: "electoral-commission",
    name: "Electoral Commission",
    kind: "independent-regulator",
    chosenBy: "A statutory independent body accountable to the UK Parliament.",
    responsibleFor: [
      "Guidance and performance standards for electoral administrators",
      "Registering political parties and regulated campaigners",
      "Regulating and publishing party and non-party political-finance records",
      "Monitoring candidate returns sent by Returning Officers at major elections",
    ],
    notResponsibleFor: [
      "Operating Great Britain polling stations",
      "Counting Great Britain votes or declaring those results",
      "Handling potential criminal breaches of candidate-spending law, which the Commission says are for police",
    ],
    sourceIds: ["ec-election-role", "ec-candidate-spending", "ppera-2000"],
  },
  {
    id: "electoral-registration-officer",
    name: "Electoral Registration Officer",
    kind: "statutory-local-election-officer",
    chosenBy: "Designated under electoral law for each registration area.",
    responsibleFor: [
      "Maintaining the electoral register",
      "Processing registration applications and absent-voting records within the statutory framework",
    ],
    notResponsibleFor: ["Campaigning for candidates", "Regulating party donations"],
    sourceIds: ["rpa-1983", "ec-election-role"],
  },
  {
    id: "returning-officer-gb",
    name: "Returning Officer / Acting Returning Officer (Great Britain)",
    kind: "independent-election-administrator",
    chosenBy: "The statutory office is attached to the relevant local authority or designated office; detailed titles vary by poll and nation.",
    responsibleFor: [
      "Administering nominations and the poll",
      "Appointing polling and counting staff",
      "Counting votes and declaring the constituency result",
      "Receiving candidate spending returns and making them available as the law requires",
    ],
    notResponsibleFor: ["Setting campaign-finance law", "Regulating national party spending"],
    sourceIds: ["ec-election-role", "ec-candidate-spending", "rpa-1983"],
  },
  {
    id: "chief-electoral-officer-ni",
    name: "Chief Electoral Officer for Northern Ireland",
    kind: "independent-election-administrator",
    chosenBy: "Statutory office for Northern Ireland.",
    responsibleFor: ["Running elections and electoral registration in Northern Ireland"],
    notResponsibleFor: ["Setting political-finance law"],
    sourceIds: ["ec-election-role", "rpa-1983"],
  },
  {
    id: "candidate-and-agent",
    name: "Candidate and election agent",
    kind: "regulated-campaign-participant",
    chosenBy: "A person becomes a validly nominated candidate and appoints an election agent under the election rules.",
    responsibleFor: [
      "Authorising and recording candidate campaign spending within the candidate rules",
      "Submitting the required candidate spending and donation return and declarations",
    ],
    notResponsibleFor: ["Party-wide national spending unless separately authorised in a party role"],
    sourceIds: ["ec-candidate-spending", "rpa-1983"],
  },
  {
    id: "party-responsible-person",
    name: "Registered party treasurer or campaigns officer",
    kind: "regulated-campaign-participant",
    chosenBy: "Registered by the political party with the Electoral Commission.",
    responsibleFor: [
      "Controlling, recording and reporting regulated party campaign spending",
      "Authorising people who may incur or pay party campaign expenses",
    ],
    notResponsibleFor: ["Candidate spending that belongs in a candidate return"],
    sourceIds: ["ec-party-spending", "ppera-2000"],
  },
  {
    id: "non-party-responsible-person",
    name: "Non-party campaigner and responsible person",
    kind: "regulated-campaign-participant",
    chosenBy: "Self-notified to the Electoral Commission where the statutory threshold and eligibility rules require it.",
    responsibleFor: [
      "Checking eligibility before regulated spending",
      "Notification, spending, donation and reporting duties that apply at the relevant threshold",
    ],
    notResponsibleFor: ["Speaking for a candidate or party unless separately and lawfully authorised"],
    sourceIds: ["ec-non-party-campaigners", "ppera-2000"],
  },
  {
    id: "police-prosecutors-courts",
    name: "Police, prosecutors and courts",
    kind: "enforcement-and-adjudication",
    chosenBy: "Separate statutory institutions; exact police force, prosecutor and court depend on territory and matter.",
    responsibleFor: [
      "Police handling of potential candidate-spending breaches identified in candidate returns",
      "Criminal investigation and prosecution decisions within the relevant legal system",
      "Court determination of prosecutions and election petitions",
    ],
    notResponsibleFor: ["Replacing the Electoral Commission's civil regulation of party and non-party finance"],
    sourceIds: ["ec-candidate-spending", "rpa-1983"],
  },
];

export const electionContactRoutes = [
  {
    actorIds: ["prime-minister-and-crown"],
    label: "Prime Minister's Office correspondence",
    url: "https://www.gov.uk/government/organisations/prime-ministers-office-10-downing-street",
    contactType: "institutional-office",
    note: "Use the published office route; the Sovereign has a separate constitutional role and is not an election-help desk.",
  },
  {
    actorIds: ["uk-parliament"],
    label: "Contact an MP or member of the House of Lords",
    url: "https://www.parliament.uk/get-involved/contact-an-mp-or-lord/",
    contactType: "institutional-directory",
    note: "For legislation or Parliamentary representation, not local administration of a poll.",
  },
  {
    actorIds: ["electoral-commission"],
    label: "Electoral Commission contact routes",
    url: "https://www.electoralcommission.org.uk/contact-us",
    contactType: "regulator",
    note: "Advice and regulatory questions; the Commission does not run Great Britain polling stations or counts.",
  },
  {
    actorIds: ["electoral-registration-officer", "returning-officer-gb", "candidate-and-agent"],
    label: "Local electoral-services and election-office lookup",
    url: "https://www.electoralcommission.org.uk/i-am-a/voter/your-election-information",
    contactType: "postcode-selected-institutional-office",
    note:
      "A postcode selects the responsible local office. TaxSorted does not store postcode lookups, UPRNs or polling-address results.",
  },
  {
    actorIds: ["chief-electoral-officer-ni"],
    label: "Electoral Office for Northern Ireland",
    url: "https://www.eoni.org.uk/contact-us/",
    contactType: "institutional-office",
    note: "Northern Ireland's central election and registration office.",
  },
  {
    actorIds: ["party-responsible-person", "non-party-responsible-person"],
    label: "Electoral Commission registration searches",
    url: "https://search.electoralcommission.org.uk/Search/Registrations",
    contactType: "official-register",
    note:
      "Use registered entity and officer records only within confirmed reuse terms; do not redistribute personal agent addresses.",
  },
  {
    actorIds: ["police-prosecutors-courts"],
    label: "Report electoral fraud or malpractice",
    url: "https://www.electoralcommission.org.uk/voting-and-elections/campaigning-your-vote/report-electoral-fraud",
    contactType: "territory-dependent-enforcement-route",
    note: "The correct police force, prosecutor or court depends on location, alleged conduct and procedural stage.",
  },
];

export const electionProcess = [
  {
    order: 1,
    id: "rules-register-boundaries",
    title: "Rules, register and constituencies",
    summary:
      "Parliament sets the legal framework; registration officers maintain voter registers; separate boundary processes define constituencies.",
    responsibleActorIds: ["uk-parliament", "electoral-registration-officer"],
    publicRecords: ["Legislation", "Electoral register statistics", "Boundary recommendations and orders"],
    sourceIds: ["rpa-1983", "ec-election-role"],
  },
  {
    order: 2,
    id: "election-called",
    title: "Election called and timetable starts",
    summary:
      "Dissolution and writs activate a statutory timetable. Election administrators publish notices and deadlines for each constituency.",
    responsibleActorIds: ["prime-minister-and-crown", "returning-officer-gb", "chief-electoral-officer-ni"],
    publicRecords: ["Proclamation and writ", "Notice of election", "Election timetable"],
    sourceIds: ["dcpa-2022", "rpa-1983", "ec-election-role"],
  },
  {
    order: 3,
    id: "nominations",
    title: "Candidates are nominated",
    summary:
      "The relevant election administrator receives nomination papers, applies the statutory nomination rules and publishes the statement of persons nominated.",
    responsibleActorIds: ["returning-officer-gb", "chief-electoral-officer-ni", "candidate-and-agent"],
    publicRecords: ["Statement of persons nominated", "Notice of poll", "Candidate and agent notices"],
    sourceIds: ["rpa-1983", "ec-election-role"],
  },
  {
    order: 4,
    id: "regulated-campaign",
    title: "Campaigns spend, communicate and keep records",
    summary:
      "Candidate, party and non-party spending are separate legal lanes with different responsible people, periods, limits and returns.",
    responsibleActorIds: ["candidate-and-agent", "party-responsible-person", "non-party-responsible-person", "electoral-commission"],
    publicRecords: ["Digital and printed imprints", "Donation reports", "Post-election spending returns"],
    sourceIds: ["ec-candidate-spending", "ec-party-spending", "ec-non-party-campaigners"],
  },
  {
    order: 5,
    id: "polling",
    title: "Votes are cast",
    summary:
      "Election administrators provide polling stations and absent-voting processes; voters cast ballots under the statutory rules.",
    responsibleActorIds: ["returning-officer-gb", "chief-electoral-officer-ni", "electoral-registration-officer"],
    publicRecords: ["Polling-station notices", "Official poll cards", "Election-day incident records where publishable"],
    sourceIds: ["ec-election-role", "rpa-1983"],
  },
  {
    order: 6,
    id: "count-result",
    title: "Votes are counted and the result is declared",
    summary:
      "The election administrator supervises verification and counting, then declares the constituency result. The Electoral Commission does not perform this count.",
    responsibleActorIds: ["returning-officer-gb", "chief-electoral-officer-ni"],
    publicRecords: ["Declared result", "Candidate vote totals", "Rejected-ballot accounting"],
    sourceIds: ["ec-election-role", "rpa-1983"],
  },
  {
    order: 7,
    id: "finance-returns",
    title: "Campaign finance is returned and published",
    summary:
      "Candidate agents submit locally; party and registered non-party campaigners report under their own regimes. Publication routes and deadlines differ.",
    responsibleActorIds: ["candidate-and-agent", "party-responsible-person", "non-party-responsible-person", "returning-officer-gb", "electoral-commission"],
    publicRecords: ["Candidate spending return", "Party spending return", "Non-party campaigner return", "Donation and loan reports"],
    sourceIds: ["ec-candidate-spending", "ec-party-spending", "ec-non-party-campaigners"],
  },
  {
    order: 8,
    id: "compliance-challenge",
    title: "Compliance, enforcement and challenge",
    summary:
      "The Electoral Commission uses its political-finance powers; police handle potential candidate-spending breaches; courts determine criminal cases and election petitions. An investigation is not a finding.",
    responsibleActorIds: ["electoral-commission", "police-prosecutors-courts"],
    publicRecords: ["Commission case outcomes", "Court judgments", "Election-petition decisions"],
    sourceIds: ["ec-candidate-spending", "ec-party-spending", "rpa-1983", "ppera-2000"],
  },
];

export const campaignFinanceRules = [
  {
    id: "candidate-spending",
    lane: "candidate",
    responsibleActorId: "candidate-and-agent",
    currentRuleSnapshot: {
      asAt: "2026-07-10",
      election: "Next UK Parliamentary general election; re-check official guidance when called",
      limit:
        "Current Electoral Commission formula: county constituency £11,390 + 12p per registered elector; borough/burgh constituency £11,390 + 8p per registered elector.",
      reporting:
        "Candidate donations over £50 enter the regulated candidate regime. Candidate and agent submit the return and declarations to the local Returning Officer; major-election returns are passed to the Electoral Commission for publication.",
      enforcement:
        "The Commission monitors published returns; its guidance states that police deal with potential candidate-spending breaches.",
    },
    sourceIds: ["ec-candidate-spending", "ec-candidate-donations", "rpa-1983"],
  },
  {
    id: "party-spending",
    lane: "registered-party",
    responsibleActorId: "party-responsible-person",
    currentRuleSnapshot: {
      asAt: "2026-07-10",
      election: "Next UK Parliamentary general election; re-check official guidance when called",
      limit:
        "In each part of Great Britain, the greater of the current fixed minimum (England £1,458,440; Scotland £216,060; Wales £108,030) or £54,010 multiplied by seats contested; in Northern Ireland, £54,010 multiplied by seats contested.",
      reporting:
        "The registered treasurer, or campaigns officer if appointed, controls and reports regulated party spending after the election.",
      enforcement:
        "The Electoral Commission may investigate and use civil sanctions; criminal sanctions may also apply under the legislation.",
    },
    sourceIds: ["ec-party-spending", "ppera-2000"],
  },
  {
    id: "non-party-spending",
    lane: "non-party-campaigner",
    responsibleActorId: "non-party-responsible-person",
    currentRuleSnapshot: {
      asAt: "2026-07-10",
      election: "UK Parliamentary general elections",
      limit:
        "Up to £700 is outside the spending and donation regime, though imprint rules still apply. Eligible UK-linked campaigners may spend up to £10,000 UK-wide without notification; intending to exceed £10,000 requires notification before crossing it.",
      reporting:
        "Registered campaigners spending above £20,000 in England or £10,000 in Scotland, Wales or Northern Ireland must report spending and donations; declaration choices can affect duties below those reporting thresholds.",
      enforcement:
        "Eligibility, constituency limits and registration duties remain separate checks; exceeding a threshold unlawfully may be an offence.",
    },
    sourceIds: ["ec-non-party-campaigners", "ppera-2000"],
  },
  {
    id: "donations-and-loans",
    lane: "regulated-funding",
    responsibleActorId: "recipient",
    currentRuleSnapshot: {
      asAt: "2026-07-10",
      election: "Ongoing political-finance regulation",
      limit:
        "There is no general cap on the amount a permissible source may give. That does not remove the recipient's permissibility, due-diligence, return-or-accept, recording and reporting duties.",
      reporting:
        "Current GB party rules bring benefits over £500 into the donation regime. Central parties report the first same-source aggregate over £11,180 and later same-source amounts over £2,230; accounting units use £2,230. Other recipients and Northern Ireland have separate rules.",
      enforcement:
        "Recipients must check the source before acceptance. Publication of a lawful donation is evidence of the reported transfer, not proof of control, a favour or wrongdoing.",
    },
    sourceIds: ["ec-permissible-sources", "ec-donations-reporting", "ppera-2000"],
  },
];

export const relationshipEvidenceLanes = [
  {
    id: "declared-interest",
    label: "Declared financial or other interest",
    proves: "The office-holder made the declaration shown in the official register for the stated period.",
    doesNotProve: "That the interest changed a vote or decision, or that any rule was broken.",
    joinRule: "Use the Parliament member ID and the register entry; preserve category, dates and source text after privacy review.",
    sourceIds: ["commons-standards"],
    apiStatus: "live behind people-publication review",
  },
  {
    id: "political-donation",
    label: "Reported donation or loan",
    proves: "A regulated recipient reported an accepted donation or loan from the named source.",
    doesNotProve: "A policy favour, lobbying contact or improper influence.",
    joinRule: "Use Electoral Commission record IDs; never join donors to company or person records by name alone.",
    sourceIds: ["ec-permissible-sources", "ppera-2000"],
    apiStatus: "blocked pending Political Finance Online reuse confirmation",
  },
  {
    id: "ministerial-meeting-gift",
    label: "Ministerial meeting, gift or hospitality",
    proves: "A department or the Cabinet Office published the recorded meeting, gift or hospitality entry.",
    doesNotProve: "The content or outcome of a meeting beyond what the official record states.",
    joinRule: "Keep ministerial-capacity records separate from Parliamentary and party-capacity declarations.",
    sourceIds: ["ministerial-gifts", "ministerial-code"],
    apiStatus: "source mapped; normalization not yet built",
  },
  {
    id: "consultant-lobbying-client",
    label: "Consultant lobbyist client declaration",
    proves: "A registered consultant lobbyist declared the client for the quarter shown.",
    doesNotProve: "That a particular minister was contacted or that the client obtained a result.",
    joinRule: "Use register and return identifiers plus effective quarter; do not infer direct lobbying from co-occurrence.",
    sourceIds: ["consultant-lobbyists"],
    apiStatus: "source mapped; normalization and reuse review not yet built",
  },
  {
    id: "public-contract",
    label: "Public procurement notice or award",
    proves: "A public buyer published the notice, award or contract relationship represented in the official record.",
    doesNotProve: "Political involvement in the procurement or a connection to a donation, meeting or interest.",
    joinRule: "Use OCDS identifiers and supplied Companies House numbers; keep buyer, supplier, award and contract as separate entities.",
    sourceIds: ["contracts-finder-ocds"],
    apiStatus: "source mapped; normalization not yet built",
  },
  {
    id: "company-identity",
    label: "Companies House identity cross-check",
    proves:
      "The company profile source reported the name, number, status and other selected company facts at retrieval time.",
    doesNotProve:
      "That the company was legally permissible as a donor on a past date, was carrying on business in the UK, or is connected to a political decision.",
    joinRule:
      "Join a company donor only on a normalized Companies House number supplied in the Electoral Commission record; preserve both retrieval dates and never join by name alone.",
    sourceIds: ["companies-house-profile", "ec-permissible-sources"],
    apiStatus: "company number exposed after finance-reuse gate; profile lookup not yet built",
  },
];

export const budgetAccountability = {
  principle:
    "A departmental budget is allocated to a public body and authorised for stated purposes; it is not personal money allocated to the minister. Budget authority, budget size and actual spending are three different facts.",
  currentAggregateSnapshot: {
    period: "2026/27 Main Estimates",
    status: "plan seeking or receiving Parliamentary authority, not outturn",
    currency: "GBP",
    nominal: true,
    figures: [
      { category: "Resource DEL", amountGbp: 520_000_000_000 },
      { category: "Capital DEL", amountGbp: 135_300_000_000 },
      { category: "Resource AME", amountGbp: 424_100_000_000 },
      { category: "Capital AME", amountGbp: 75_300_000_000 },
    ],
    warning:
      "These categories overlap neither with a politician's pay nor with a simple cash total. Use the source tables for departmental lines, non-cash items, revisions and net cash requirements.",
    sourceIds: ["main-estimates-2026-27"],
  },
  lanes: [
    {
      id: "government-policy",
      name: "Ministerial policy responsibility",
      answer:
        "The minister is accountable to Parliament for policy and the department's business, subject to collective government, law, Treasury controls and Parliamentary authority.",
      sourceIds: ["ministerial-code", "supply-estimates-manual-2026"],
    },
    {
      id: "parliamentary-authority",
      name: "Commons spending authority",
      answer:
        "The government proposes departmental Estimates; MPs collectively may approve, reject or reduce them. Supply and Appropriation legislation gives the voted limits legal authority.",
      sourceIds: ["parliament-spending", "main-estimates-2026-27"],
    },
    {
      id: "accounting-officer",
      name: "Accounting Officer stewardship",
      answer:
        "The senior official is personally accountable to Parliament for regularity, propriety, value for money and feasibility. A ministerial direction should be published when a minister orders a proposal forward despite an Accounting Officer objection, subject to limited public-interest exceptions.",
      sourceIds: ["public-spending-accountability", "supply-estimates-manual-2026"],
    },
    {
      id: "mp-business-costs",
      name: "MP staffing and business costs",
      answer:
        "IPSA's Funding Scheme and publication data cover the resources used to run Parliamentary and constituency work. They are not a departmental programme budget or a personal political fund.",
      sourceIds: ["ipsa-publication"],
    },
  ],
};

export const publicPoliticalFunding = {
  principle:
    "Public support for democratic work is not a private donation and is not automatically campaign spending. Store the scheme, legal basis, allocation, claim, payment and reporting treatment separately.",
  amountKinds: ["statutory cap", "formula allocation", "advance", "claim", "payment", "actual cost"],
  schemes: [
    {
      id: "policy-development-grants",
      name: "Policy Development Grants",
      recipient: "Eligible registered political parties",
      currentSnapshot: {
        asAt: "2026-07-10",
        annualPoolGbp: 2_000_000,
        amountKind: "formula allocation",
      },
      purpose: "Support development of policies for inclusion in party manifestos.",
      sourceIds: ["policy-development-grants"],
    },
    {
      id: "short-money",
      name: "Short Money",
      recipient: "Qualifying opposition parties in the House of Commons",
      currentSnapshot: {
        asAt: "2026-07-10",
        annualPoolGbp: null,
        amountKind: "formula allocation",
      },
      purpose: "Parliamentary business, travel and the office of the Leader of the Opposition under the Commons scheme.",
      sourceIds: ["short-money"],
    },
    {
      id: "cranborne-money",
      name: "Cranborne Money",
      recipient: "Qualifying opposition parties and the Convenor of the Crossbench Peers in the House of Lords",
      currentSnapshot: {
        asAt: "2026-07-10",
        annualPoolGbp: null,
        amountKind: "formula allocation",
      },
      purpose: "Financial assistance for Parliamentary work in the Lords.",
      sourceIds: ["cranborne-money"],
    },
    {
      id: "election-delivery-charges",
      name: "Returning Officer election-delivery funding",
      recipient: "Returning Officers and local authorities delivering the specified poll",
      currentSnapshot: {
        asAt: "2026-07-10",
        annualPoolGbp: null,
        amountKind: "statutory cap",
      },
      purpose:
        "Reimbursement of qualifying election-delivery services and expenses. The 2024 Order is a historical poll-specific cap, not a reusable future budget or final outturn.",
      sourceIds: ["returning-officer-charges-2024"],
    },
  ],
};

export const historyCoverage = {
  model:
    "History is an effective-dated event ledger: office terms, seats, party affiliations, candidacies, results and power assessments keep valid-from and valid-to dates. Old contact or staff payloads are not retained as historical facts.",
  availableNow: [
    {
      record: "Current Parliament member biography",
      coverage:
        "Representations, elections contested, House memberships, party affiliations and past/current Parliamentary roles returned on the current-member detail endpoint.",
      endpoint: "/v1/politics/uk/people/:id",
      limits: "Only current members are exposed; upstream Parliament coverage controls completeness.",
    },
    {
      record: "Latest constituency election result for a current member",
      coverage: "Candidates, party, votes, vote share, electorate, turnout and majority when Parliament supplies it.",
      endpoint: "/v1/politics/uk/people/:id",
      limits: "This is one latest result, not a full election-results database.",
    },
  ],
  licensedSourceMapped: [
    {
      record: "Commons general- and by-election results",
      coverage: "The source states coverage from 2010, plus 2005 and notional datasets; consult its live coverage page.",
      ingestionStatus: "Open Parliament Licence source identified; normalized historical endpoint not yet built.",
      sourceIds: ["commons-election-results"],
    },
  ],
  privacy:
    "Election results and aggregates are public records, but candidate names and political affiliation still require a documented lawful basis and Article 9 condition before bulk republication.",
};

export const legislativeWatch = [
  {
    id: "representation-people-bill-2026",
    title: "Representation of the People Bill",
    statusAt: "2026-07-10",
    lawStatus: "proposed-not-law",
    nextKnownStage: "Further House of Commons stages were scheduled for 14 July 2026 when checked.",
    rule:
      "Do not expose a proposal as a current threshold, power or offence. Create a new effective-dated rule only after enactment and any required commencement.",
    sourceIds: ["representation-people-bill-2026"],
  },
];

export const enforcementSnapshot = {
  asAt: "2026-07-10",
  electoralCommission: {
    remit:
      "Current civil powers cover specified party, donor, loan and non-party political-finance offences. The Commission can investigate, impose civil sanctions where authorised, accept undertakings, require compliance or restoration, seek forfeiture and refer criminal or out-of-remit matters.",
    civilFineRangeGbp: { minimum: 200, maximumPerOffence: 20_000 },
    candidateBoundary:
      "Potential candidate-spending breaches under the Representation of the People Act remain police matters under current Electoral Commission guidance.",
    sourceIds: ["ec-enforcement", "ec-candidate-spending", "rpa-1983", "ppera-2000"],
  },
  caseStateRule:
    "Keep allegation, investigation, finding, sanction, correction, referral and appeal as separate, dated states. Never call an allegation or open investigation a breach.",
};

export const formalPowerMethod = {
  schema: "taxsorted.uk.office-power/1",
  version: "1.0.0-draft",
  name: "Formal office power",
  warning:
    "This rates published powers of an office, not a person's character, performance, popularity, informal influence, donors or alleged corporate pull.",
  dimensions: [
    { id: "executive", label: "Executive", meaning: "Setting policy and directing administration or public services." },
    { id: "legislative", label: "Law-making", meaning: "Making, proposing, amending or approving laws and rules." },
    { id: "oversight", label: "Oversight", meaning: "Formally demanding information, investigating or holding bodies to account." },
    { id: "enforcement", label: "Enforcement", meaning: "Compelling compliance, correcting breaches, sanctioning or directing enforcement." },
    { id: "budget", label: "Public money", meaning: "Proposing, approving, allocating or vetoing public money or taxation." },
    { id: "appointments", label: "Appointments", meaning: "Appointing, nominating, dismissing or voting on public leadership offices." },
  ],
  rubric: [
    { score: 0, meaning: "Reviewed: no formal authority identified in this dimension." },
    { score: 1, meaning: "May advise, request, recommend or perform routine procedure; no material decision alone." },
    { score: 2, meaning: "One vote in a collective body, or narrow binding or delegated authority." },
    { score: 3, meaning: "Material authority in a defined domain, tightly constrained or dependent on co-decision." },
    { score: 4, meaning: "Primary authority across a substantial portfolio or body, with meaningful institutional checks." },
    { score: 5, meaning: "Primary formal decision-maker across most of the dimension in scope; never above the law." },
  ],
  calculation:
    "Add six assessed dimensions for a raw score out of 30, convert to 100, then round to the nearest 5. If any dimension is not assessed, withhold the total.",
  bands: [
    { raw: "0", label: "no authority identified" },
    { raw: "1-6", label: "limited or procedural" },
    { raw: "7-12", label: "bounded authority" },
    { raw: "13-18", label: "substantial authority" },
    { raw: "19-24", label: "major authority" },
    { raw: "25-30", label: "system-level authority" },
  ],
  comparisonRules: [
    "Jurisdiction and competence are displayed beside the score and are never converted into bonus points.",
    "No global leaderboard or global power sort: compare only offices in a fixed jurisdiction and office family.",
    "Collective power belongs to the body; one member receives only the collective-member score described by the rubric.",
    "Multiple offices held by one person are listed separately and never added together.",
    "Budget power is not budget size, and relationships or funding never change the score.",
  ],
  depthPolicy: [
    { dimensionScore: "0-1", coverage: "Source, office function, legal limit and official contact route." },
    { dimensionScore: "2", coverage: "Also cover collective body, votes, delegation and checks." },
    { dimensionScore: "3-5", coverage: "Also cover decisions, appointees, budgets, enforcement interfaces and historical changes in that domain." },
  ],
};

type PowerDimension = "executive" | "legislative" | "oversight" | "enforcement" | "budget" | "appointments";
type Score = 0 | 1 | 2 | 3 | 4 | 5;
type Exercise = "none" | "individual" | "collective-member" | "co-decision" | "delegated" | "advisory" | "procedural";
type Basis = "statute" | "regulation" | "standing-order" | "prerogative" | "convention" | "delegation";

type DimensionAssessment = {
  score: Score;
  exercise: Exercise;
  basis: Basis[];
  reason: string;
  limits: string[];
  sourceIds: string[];
};

type PowerAssessmentInput = {
  officeId: string;
  officeName: string;
  officeFamily: string;
  jurisdiction: {
    level: "uk" | "constituency" | "institution" | "election";
    territories: string[];
    competence: string;
    activeWhen?: string;
  };
  dimensions: Record<PowerDimension, DimensionAssessment>;
  checks: Array<{ description: string; sourceIds: string[] }>;
  sourceIds: string[];
  calibrationStatus: "provisional-screened-example";
};

function powerBand(raw: number): string {
  if (raw === 0) return "no authority identified";
  if (raw <= 6) return "limited or procedural";
  if (raw <= 12) return "bounded authority";
  if (raw <= 18) return "substantial authority";
  if (raw <= 24) return "major authority";
  return "system-level authority";
}

function makePowerAssessment(input: PowerAssessmentInput) {
  const scores = Object.values(input.dimensions).map((dimension) => dimension.score);
  const raw = scores.reduce<number>((sum, value) => sum + value, 0);
  const display = Math.round((raw / 30) * 20) * 5;
  const deepDomains = (Object.entries(input.dimensions) as Array<[PowerDimension, DimensionAssessment]>)
    .filter(([, dimension]) => dimension.score >= 3)
    .map(([id]) => id);
  return {
    schema: formalPowerMethod.schema,
    assessmentId: `taxsorted:power:${input.officeId}:1`,
    methodVersion: formalPowerMethod.version,
    ...input,
    calculation: { raw, maximum: 30, display, band: powerBand(raw) },
    researchDepth: {
      rule: "Depth follows each dimension, not the person's fame.",
      deepDomains,
    },
    evidenceStatus: "partial" as const,
    lawAsAt: "2026-07-10",
    reviewedAt: "2026-07-10",
  };
}

export const officePowerAssessments = [
  makePowerAssessment({
    officeId: "uk:office:prime-minister",
    officeName: "Prime Minister",
    officeFamily: "UK executive",
    jurisdiction: {
      level: "uk",
      territories: ["United Kingdom"],
      competence: "Leadership of the UK government, subject to law, Parliament, courts, collective government and devolution.",
    },
    dimensions: {
      executive: {
        score: 5,
        exercise: "individual",
        basis: ["convention", "prerogative"],
        reason: "Leads the government and oversees the Civil Service and government agencies.",
        limits: ["Departments exercise powers under law; devolution and judicial review remain separate constraints."],
        sourceIds: ["pm-responsibilities", "ministerial-code"],
      },
      legislative: {
        score: 2,
        exercise: "co-decision",
        basis: ["convention", "standing-order"],
        reason: "Leads a government that normally controls much Commons business, but Parliament makes law and each MP has one vote.",
        limits: ["Cannot personally enact a bill or tax."],
        sourceIds: ["pm-responsibilities", "parliament-mps"],
      },
      oversight: {
        score: 4,
        exercise: "individual",
        basis: ["convention"],
        reason: "Oversees the operation of the Civil Service, agencies and the work of government ministers.",
        limits: ["The Prime Minister is also subject to Commons questions, committees, standards and courts."],
        sourceIds: ["pm-responsibilities", "parliament-scrutiny", "ministerial-code"],
      },
      enforcement: {
        score: 0,
        exercise: "none",
        basis: ["convention"],
        reason: "No general personal power to decide police investigations, prosecutions or court outcomes was identified for the office.",
        limits: ["Portfolio-specific emergency or statutory powers must be assessed separately rather than inferred."],
        sourceIds: ["pm-responsibilities", "ministerial-code"],
      },
      budget: {
        score: 3,
        exercise: "co-decision",
        basis: ["convention", "standing-order"],
        reason: "Leads the government that proposes spending and taxation, while Treasury controls and Commons authorisation are required.",
        limits: ["A government budget is not the Prime Minister's money; Parliament grants legal authority."],
        sourceIds: ["parliament-spending", "supply-estimates-manual-2026"],
      },
      appointments: {
        score: 5,
        exercise: "individual",
        basis: ["convention", "prerogative"],
        reason: "Chooses members of the government and controls whether ministers remain in ministerial office.",
        limits: ["Some public appointments follow statute, regulated processes, independent panels or Parliamentary scrutiny."],
        sourceIds: ["pm-responsibilities", "ministerial-code"],
      },
    },
    checks: [
      { description: "Must retain the confidence needed to govern through the House of Commons.", sourceIds: ["ministerial-code"] },
      { description: "Government spending and taxation require Parliamentary authority.", sourceIds: ["parliament-spending"] },
      { description: "Government action remains subject to law and court review.", sourceIds: ["ministerial-code"] },
    ],
    sourceIds: ["pm-responsibilities", "ministerial-code", "parliament-spending", "parliament-scrutiny"],
    calibrationStatus: "provisional-screened-example",
  }),
  makePowerAssessment({
    officeId: "uk:office:member-of-parliament",
    officeName: "Member of Parliament",
    officeFamily: "House of Commons member",
    jurisdiction: {
      level: "constituency",
      territories: ["One UK Parliamentary constituency", "House of Commons"],
      competence: "Constituency representation and one member's participation in the Commons' collective powers.",
    },
    dimensions: {
      executive: {
        score: 0,
        exercise: "none",
        basis: ["convention"],
        reason: "An ordinary MP does not direct a government department or public service by virtue of being an MP.",
        limits: ["A separate ministerial or local executive office must be assessed separately."],
        sourceIds: ["parliament-mps"],
      },
      legislative: {
        score: 2,
        exercise: "collective-member",
        basis: ["standing-order"],
        reason: "May propose, examine, amend and vote on laws and taxes as one member of the Commons.",
        limits: ["The Commons' collective authority does not belong to one MP personally."],
        sourceIds: ["parliament-mps", "parliament-spending"],
      },
      oversight: {
        score: 2,
        exercise: "collective-member",
        basis: ["standing-order"],
        reason: "May question ministers, seek urgent questions, submit written questions and participate in committee scrutiny.",
        limits: ["A lone MP generally cannot compel an answer, implement a recommendation or direct a public body."],
        sourceIds: ["parliament-scrutiny"],
      },
      enforcement: {
        score: 0,
        exercise: "none",
        basis: ["convention"],
        reason: "An ordinary MP has no general power to direct police, prosecutors, courts or regulators in individual cases.",
        limits: ["MPs may legislate and scrutinise collectively, or raise a constituent's case without deciding it."],
        sourceIds: ["parliament-mps", "commons-standards"],
      },
      budget: {
        score: 2,
        exercise: "collective-member",
        basis: ["standing-order"],
        reason: "Votes as one Commons member on Estimates, Supply and tax legislation.",
        limits: ["MPs cannot individually allocate a department's budget; the government proposes Estimates."],
        sourceIds: ["parliament-spending", "main-estimates-2026-27"],
      },
      appointments: {
        score: 2,
        exercise: "collective-member",
        basis: ["standing-order"],
        reason: "Participates in certain Commons elections and appointments, including the Speaker and committee roles.",
        limits: ["Most public and ministerial appointments do not belong to an ordinary MP."],
        sourceIds: ["parliament-mps", "select-committee-powers"],
      },
    },
    checks: [
      { description: "Accountable to constituents at elections and subject to the Commons Code and external law.", sourceIds: ["commons-standards"] },
      { description: "The Speaker and House rules govern Parliamentary proceedings.", sourceIds: ["parliament-mps"] },
    ],
    sourceIds: ["parliament-mps", "parliament-scrutiny", "parliament-spending", "commons-standards"],
    calibrationStatus: "provisional-screened-example",
  }),
  makePowerAssessment({
    officeId: "uk:office:departmental-secretary-of-state-baseline",
    officeName: "Departmental Secretary of State baseline",
    officeFamily: "UK executive department",
    jurisdiction: {
      level: "uk",
      territories: ["Varies by department and devolved/reserved competence"],
      competence: "Generic ministerial-department baseline only; actual statutory powers require a portfolio assessment.",
    },
    dimensions: {
      executive: { score: 4, exercise: "individual", basis: ["convention", "delegation"], reason: "Leads a ministerial department and is accountable for its policy and business.", limits: ["Civil servants act under law and the Accounting Officer has separate personal duties."], sourceIds: ["ministerial-code", "supply-estimates-manual-2026"] },
      legislative: { score: 2, exercise: "co-decision", basis: ["statute", "standing-order"], reason: "May lead bills and exercise delegated rulemaking where legislation grants it.", limits: ["Primary law requires Parliament; delegated powers vary by statute and procedure."], sourceIds: ["ministerial-code", "parliament-mps"] },
      oversight: { score: 3, exercise: "individual", basis: ["convention", "delegation"], reason: "Oversees a department and its sponsored bodies within the portfolio.", limits: ["Must account to Parliament and cannot absorb independent regulators' or courts' powers."], sourceIds: ["ministerial-code", "parliament-scrutiny"] },
      enforcement: { score: 0, exercise: "none", basis: ["statute"], reason: "No generic enforcement power is assigned: any such score must be rebuilt from the portfolio's statutes and delegations.", limits: ["Do not infer power over operational decisions from political responsibility for a policy area."], sourceIds: ["ministerial-code"] },
      budget: { score: 3, exercise: "co-decision", basis: ["convention", "delegation"], reason: "Sets policy priorities within departmental settlements and may issue a transparent direction to the Accounting Officer.", limits: ["Parliament, Treasury controls and Accounting Officer duties constrain spending."], sourceIds: ["supply-estimates-manual-2026", "public-spending-accountability"] },
      appointments: { score: 3, exercise: "individual", basis: ["statute", "delegation"], reason: "Many portfolios include ministerial public-appointment or nomination functions.", limits: ["Actual offices, regulated processes and Parliamentary scrutiny vary; no generic appointment is assumed."], sourceIds: ["ministerial-code"] },
    },
    checks: [
      { description: "Remains in office only while retaining the Prime Minister's confidence.", sourceIds: ["ministerial-code"] },
      { description: "Answers to Parliament for the department and works with an independently accountable Accounting Officer.", sourceIds: ["ministerial-code", "public-spending-accountability"] },
    ],
    sourceIds: ["ministerial-code", "parliament-scrutiny", "supply-estimates-manual-2026", "public-spending-accountability"],
    calibrationStatus: "provisional-screened-example",
  }),
  makePowerAssessment({
    officeId: "uk:office:commons-select-committee-chair-baseline",
    officeName: "Commons select-committee chair baseline",
    officeFamily: "House of Commons scrutiny",
    jurisdiction: {
      level: "institution",
      territories: ["House of Commons", "The committee's stated remit"],
      competence: "Chairing and organising one select committee; includes the ordinary MP baseline where applicable.",
    },
    dimensions: {
      executive: { score: 0, exercise: "none", basis: ["standing-order"], reason: "A committee chair does not run the department being scrutinised.", limits: ["Committee recommendations do not implement themselves."], sourceIds: ["parliament-scrutiny"] },
      legislative: { score: 2, exercise: "collective-member", basis: ["standing-order"], reason: "Retains an MP's legislative vote and may lead committee reports relevant to legislation.", limits: ["The chair does not enact committee recommendations or law alone."], sourceIds: ["parliament-mps", "select-committee-powers"] },
      oversight: { score: 3, exercise: "procedural", basis: ["standing-order"], reason: "Leads a committee that can seek information, hold public evidence sessions and report findings.", limits: ["Formal powers belong to the committee collectively; recommendations are generally not binding."], sourceIds: ["select-committee-powers", "parliament-scrutiny"] },
      enforcement: { score: 0, exercise: "none", basis: ["standing-order"], reason: "A committee chair does not impose criminal, civil or regulatory sanctions.", limits: ["Contempt and House enforcement involve separate collective procedures."], sourceIds: ["select-committee-powers"] },
      budget: { score: 2, exercise: "collective-member", basis: ["standing-order"], reason: "Retains an MP's vote and may lead scrutiny of departmental spending.", limits: ["Scrutinising expenditure is not allocating the department's budget."], sourceIds: ["parliament-spending", "parliament-scrutiny"] },
      appointments: { score: 2, exercise: "collective-member", basis: ["standing-order"], reason: "May lead non-binding pre-appointment scrutiny and committee choices within its remit.", limits: ["The appointing authority normally remains elsewhere."], sourceIds: ["select-committee-powers"] },
    },
    checks: [
      { description: "The committee decides collectively and the House sets its remit and powers.", sourceIds: ["select-committee-powers"] },
      { description: "Published evidence and reports expose the chair's and committee's reasoning to public review.", sourceIds: ["parliament-scrutiny"] },
    ],
    sourceIds: ["select-committee-powers", "parliament-scrutiny", "parliament-mps"],
    calibrationStatus: "provisional-screened-example",
  }),
  makePowerAssessment({
    officeId: "uk:office:ukpge-returning-officer-gb",
    officeName: "UK Parliamentary election Returning Officer baseline (Great Britain)",
    officeFamily: "Independent election administration",
    jurisdiction: {
      level: "election",
      territories: ["One Great Britain UK Parliamentary constituency"],
      competence:
        "Administration of one UK Parliamentary constituency poll; the statutory title is normally Acting Returning Officer in England and Wales and Returning Officer in Scotland.",
      activeWhen: "During preparation, delivery, count, declaration and post-poll duties for the specified election",
    },
    dimensions: {
      executive: {
        score: 4,
        exercise: "individual",
        basis: ["statute", "regulation"],
        reason: "Personally directs nominations, polling, verification, counting and declaration for the constituency.",
        limits: ["Power is narrow, poll-specific and independent; it does not extend to general local-authority policy."],
        sourceIds: ["ec-ukpge-roles", "rpa-1983"],
      },
      legislative: {
        score: 0,
        exercise: "none",
        basis: ["statute"],
        reason: "Administers election law but does not make or amend it.",
        limits: ["Guidance and procedural decisions must remain within legislation and election rules."],
        sourceIds: ["ec-ukpge-roles", "rpa-1983"],
      },
      oversight: {
        score: 2,
        exercise: "delegated",
        basis: ["statute", "regulation"],
        reason: "Supervises appointed election staff and the constituency's administrative process.",
        limits: ["Does not oversee party finance nationally, police investigations or the Electoral Commission."],
        sourceIds: ["ec-ukpge-roles", "ec-election-role"],
      },
      enforcement: {
        score: 2,
        exercise: "procedural",
        basis: ["statute", "regulation"],
        reason: "Applies binding nomination, polling and counting rules and can reject or correct matters only where the legal procedure permits.",
        limits: ["Does not investigate electoral crime, prosecute offences or impose Electoral Commission sanctions."],
        sourceIds: ["ec-ukpge-roles", "ec-candidate-spending", "rpa-1983"],
      },
      budget: {
        score: 1,
        exercise: "delegated",
        basis: ["regulation"],
        reason: "Incurs qualifying delivery costs within a poll-specific reimbursement and charges framework.",
        limits: ["A recoverable cap is not a policy budget, personal allocation or final outturn."],
        sourceIds: ["returning-officer-charges-2024"],
      },
      appointments: {
        score: 3,
        exercise: "individual",
        basis: ["statute", "regulation"],
        reason: "Appoints and directs polling and counting staff needed to deliver the constituency election.",
        limits: ["Appointments are temporary, functional and bounded by election law and employment requirements."],
        sourceIds: ["ec-ukpge-roles", "rpa-1983"],
      },
    },
    checks: [
      {
        description: "The office-holder is independent in electoral duties and ultimately accountable through the courts.",
        sourceIds: ["ec-ukpge-roles", "rpa-1983"],
      },
      {
        description: "The Electoral Commission supplies guidance and performance standards but does not take over the local count or result.",
        sourceIds: ["ec-election-role", "ec-ukpge-roles"],
      },
    ],
    sourceIds: [
      "ec-ukpge-roles",
      "ec-election-role",
      "ec-candidate-spending",
      "rpa-1983",
      "returning-officer-charges-2024",
    ],
    calibrationStatus: "provisional-screened-example",
  }),
];

export const politicsSystemData = {
  schema: "taxsorted.uk.political-system/1",
  updatedAt: "2026-07-10",
  scope: politicsSystemScope,
  sourceUsePolicy,
  actors: electionActors,
  electionContactRoutes,
  electionProcess,
  campaignFinanceRules,
  relationshipEvidenceLanes,
  budgetAccountability,
  publicPoliticalFunding,
  historyCoverage,
  legislativeWatch,
  enforcementSnapshot,
  formalPower: {
    method: formalPowerMethod,
    assessments: officePowerAssessments,
  },
  enforcementPrinciples: [
    "Record allegation, investigation, finding, sanction, correction and appeal as separate states.",
    "An investigation is not a finding; an adverse finding is not final while a live appeal can change it.",
    "Name the exact authority, legal provision, official case ID, dates and source for every published outcome.",
    "Do not imply that an elected office-holder controls an operational enforcement decision unless a cited law grants that exact power.",
  ],
  sources: politicsSystemSources,
};

export function findOfficePowerAssessment(officeId: string) {
  return officePowerAssessments.find((assessment) => assessment.officeId === officeId) ?? null;
}

type CurrentRole = { name: string; endDate: string | null };

export function formalPowerReferencesForPerson(
  house: "Commons" | "Lords",
  roles: {
    government: CurrentRole[];
    opposition: CurrentRole[];
    other: CurrentRole[];
    committees: CurrentRole[];
  }
) {
  const current = [
    ...roles.government,
    ...roles.opposition,
    ...roles.other,
    ...roles.committees,
  ].filter((role) => role.endDate === null);
  const assessmentIds: string[] = [];
  const assessedRoleNames = new Set<string>();

  if (house === "Commons") {
    assessmentIds.push("uk:office:member-of-parliament");
  }
  for (const role of current) {
    if (/^prime minister(?:\b|,)/i.test(role.name)) {
      if (!assessmentIds.includes("uk:office:prime-minister")) {
        assessmentIds.push("uk:office:prime-minister");
      }
      assessedRoleNames.add(role.name);
    }
  }

  return {
    basis: "office-not-person" as const,
    methodPath: "/v1/politics/uk/power/method",
    assessmentIds,
    unassessedCurrentRoles: current
      .map((role) => role.name)
      .filter((name) => !assessedRoleNames.has(name)),
    combinationRule:
      "A person may hold several offices. Their assessments are listed separately and never added together.",
    gap:
      house === "Lords"
        ? "A House of Lords member baseline has not yet completed the provisional calibration."
        : null,
  };
}
