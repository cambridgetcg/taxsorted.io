// Data discipline: entries are re-verified against their sourceUrl; staleness
// >90d turns the UI badge amber (see gov pages). Never add an entry without a
// fetched source.
//
// Every fact below is transcribed from the live-verified research corpus at
// regs/research/gov/{treasury,hmrc-anatomy,parliament,transparency-tools}.md
// (fetched 2026-07-06). A fact not present in that corpus does not appear
// here — no fresh research happens at implementation time. Office-holder
// names are role-anchored: they carry an `asOf` date because names change
// and roles don't; prose elsewhere must say "the Exchequer Secretary to the
// Treasury (the tax minister)", never hard-code a person as a timeless fact.
//
// Responsible publishing: every entry here is an official, public contact
// route (a gov.uk/parliament.uk-published line, form, email inbox or postal
// address) — never a named individual's personal contact details.

export interface VerifiedFact {
  sourceUrl: string
  verifiedOn: string // ISO date, e.g. '2026-07-06'
}

export interface RoleEntry extends VerifiedFact {
  id: string // 'exchequer-secretary'
  body: 'hmrc' | 'hmt' | 'parliament' | 'independent'
  role: string // 'Exchequer Secretary to the Treasury'
  whatTheyDo: string // one plain-words sentence
  holder?: { name: string; asOf: string }
  contactRoute?: string // plain-words HOW to reach the office (route, not personal details)
  contactUrl?: string
}

export interface ContactChannel extends VerifiedFact {
  id: string
  audience: string
  channel: string
  details: string
  hours?: string
}

const VERIFIED_ON = '2026-07-06'

export const ROLES: RoleEntry[] = [
  // --- HM Treasury ministerial team ---------------------------------------
  // Source: https://www.gov.uk/government/organisations/hm-treasury and each
  // role's own gov.uk ministers page (regs/research/gov/treasury.md §2).
  {
    id: 'chancellor-of-the-exchequer',
    body: 'hmt',
    role: 'Chancellor of the Exchequer',
    whatTheyDo:
      "The government's chief financial minister: sets fiscal policy, including presenting the annual Budget.",
    holder: { name: 'Rt Hon Rachel Reeves MP', asOf: VERIFIED_ON },
    contactRoute:
      'Write to HM Treasury (the Correspondence and Enquiry Unit) yourself and an official replies, or ask your own MP to write on your behalf and a minister must sign the reply.',
    contactUrl: 'https://www.gov.uk/government/ministers/chancellor-of-the-exchequer',
    sourceUrl: 'https://www.gov.uk/government/ministers/chancellor-of-the-exchequer',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'chief-secretary-to-the-treasury',
    body: 'hmt',
    role: 'Chief Secretary to the Treasury',
    whatTheyDo:
      'Runs public spending, spending reviews and in-year spending controls; also public sector pay, welfare spending and tax credits.',
    holder: { name: 'Lucy Rigby KC MP', asOf: VERIFIED_ON },
    contactUrl: 'https://www.gov.uk/government/ministers/chief-secretary-to-the-treasury',
    sourceUrl: 'https://www.gov.uk/government/ministers/chief-secretary-to-the-treasury',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'financial-secretary-to-the-treasury',
    body: 'hmt',
    role: 'Financial Secretary to the Treasury',
    whatTheyDo:
      "Currently covers the growth mission, business regulation and Treasury business in the House of Lords — this role's current gov.uk page lists no tax responsibilities.",
    holder: { name: 'Lord Livermore', asOf: VERIFIED_ON },
    contactUrl: 'https://www.gov.uk/government/ministers/financial-secretary-to-the-treasury',
    sourceUrl: 'https://www.gov.uk/government/ministers/financial-secretary-to-the-treasury',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'exchequer-secretary-to-the-treasury',
    body: 'hmt',
    role: 'Exchequer Secretary to the Treasury',
    whatTheyDo:
      'The tax minister right now: owns the whole UK tax system (direct, indirect, business, property and personal taxation), tax administration policy, the Finance Bill, customs and VAT at the border — and chairs the HMRC Board.',
    holder: { name: 'Daniel Tomlinson MP', asOf: VERIFIED_ON },
    contactRoute:
      'Write to HM Treasury yourself (official reply) or ask your own MP to write for you (ministerial reply, ~20 working days).',
    contactUrl: 'https://www.gov.uk/government/ministers/exchequer-secretary-to-the-treasury',
    sourceUrl: 'https://www.gov.uk/government/ministers/exchequer-secretary-to-the-treasury',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'economic-secretary-to-the-treasury',
    body: 'hmt',
    role: 'Economic Secretary to the Treasury',
    whatTheyDo:
      'Covers financial-services regulation and markets, including personal savings and pensions tax policy (ISAs) and financial-services taxes such as the bank levy and insurance premium tax.',
    holder: { name: 'Rachel Blake MP', asOf: VERIFIED_ON },
    contactUrl: 'https://www.gov.uk/government/people/rachel-blake',
    sourceUrl: 'https://www.gov.uk/government/people/rachel-blake',
    verifiedOn: VERIFIED_ON,
  },

  // --- HMRC governance / Commissioners ------------------------------------
  // Source: https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance
  // (regs/research/gov/hmrc-anatomy.md §1.2).
  {
    id: 'hmrc-first-permanent-secretary',
    body: 'hmrc',
    role: 'First Permanent Secretary and Chief Executive',
    whatTheyDo: 'Runs HMRC day to day and is accountable to Parliament for it.',
    holder: { name: 'John-Paul Marks CB', asOf: VERIFIED_ON },
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'hmrc-second-permanent-secretary',
    body: 'hmrc',
    role: 'Second Permanent Secretary and Deputy Chief Executive',
    whatTheyDo: "Deputises for HMRC's Chief Executive across the department's operations.",
    holder: { name: 'Angela MacDonald', asOf: VERIFIED_ON },
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'hmrc-cfo-tax-assurance-commissioner',
    body: 'hmrc',
    role: 'Chief Finance Officer and Tax Assurance Commissioner',
    whatTheyDo: "Signs off HMRC's largest tax settlements and gives assurance the law is applied evenly.",
    holder: { name: 'Justin Holliday', asOf: VERIFIED_ON },
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'hmrc-dg-customer-compliance',
    body: 'hmrc',
    role: 'Director General Customer Compliance',
    whatTheyDo:
      'Runs enquiries, checks and investigations — the part of HMRC that opens a compliance check on your affairs.',
    holder: { name: 'Penny Ciniewicz', asOf: VERIFIED_ON },
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'hmrc-dg-customer-services',
    body: 'hmrc',
    role: 'Director General Customer Services',
    whatTheyDo: 'Runs the helplines, post, webchat and online accounts most sole traders and landlords use.',
    holder: { name: 'Myrtle Lloyd', asOf: VERIFIED_ON },
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'hmrc-dg-customer-strategy-and-tax-design',
    body: 'hmrc',
    role: 'Director General Customer Strategy and Tax Design',
    whatTheyDo:
      'Designs how taxes are administered day to day, working the "policy partnership" with HM Treasury.',
    holder: { name: 'Jonathan Athow', asOf: VERIFIED_ON },
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'hmrc-dg-borders-and-trade',
    body: 'hmrc',
    role: 'Director General Borders and Trade',
    whatTheyDo: 'Runs customs, excise and border-tax administration.',
    holder: { name: 'Carol Bristow', asOf: VERIFIED_ON },
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'hmrc-chief-people-officer',
    body: 'hmrc',
    role: 'Chief People Officer',
    whatTheyDo: "Runs HMRC's workforce and people strategy.",
    holder: { name: 'Helen Pickles', asOf: VERIFIED_ON },
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'hmrc-chief-digital-and-information-officer',
    body: 'hmrc',
    role: 'Chief Digital and Information Officer',
    whatTheyDo: "Runs the systems behind Making Tax Digital, HMRC's APIs and the developer hub.",
    holder: { name: 'Daljit Rehal', asOf: VERIFIED_ON },
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'hmrc-lead-non-executive-director',
    body: 'hmrc',
    role: 'Lead Non-Executive Director, HMRC Board',
    whatTheyDo: 'Leads the independent, non-executive members who advise and challenge the HMRC Board.',
    holder: { name: 'Dame Jayne-Anne Gadhia', asOf: VERIFIED_ON },
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/about/our-governance',
    verifiedOn: VERIFIED_ON,
  },

  // --- Independent scrutiny -------------------------------------------------
  {
    id: 'adjudicators-office',
    body: 'independent',
    role: "The Adjudicator's Office",
    whatTheyDo:
      "Free and independent of HMRC: investigates whether HMRC (or the Valuation Office Agency) applied its rules, standards, guidance and codes of practice fairly and consistently, once HMRC's own tier 1 and tier 2 complaint reviews are done.",
    holder: { name: 'Mike McMahon', asOf: VERIFIED_ON },
    contactRoute:
      'Phone 0300 057 1111, write to The Adjudicator\'s Office, PO Box 11222, Nottingham, NG2 9AD, or use the online form — after completing HMRC\'s tier 1 and tier 2 reviews.',
    contactUrl: 'https://www.gov.uk/guidance/contact-the-adjudicators-office',
    sourceUrl: 'https://www.gov.uk/government/organisations/the-adjudicator-s-office',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'office-for-budget-responsibility',
    body: 'independent',
    role: 'Office for Budget Responsibility',
    whatTheyDo:
      "Gives independent and authoritative analysis of the UK's public finances, forecasting at least twice every financial year; by law it may consider government policy but may not model what alternative policies would do.",
    sourceUrl: 'https://www.gov.uk/government/organisations/office-for-budget-responsibility',
    verifiedOn: VERIFIED_ON,
  },

  // --- Parliament ------------------------------------------------------------
  {
    id: 'your-mp',
    body: 'parliament',
    role: 'Your MP',
    whatTheyDo:
      "Can make confidential enquiries with officials or a government minister on your behalf and refer individual cases to the Parliamentary Ombudsman — but generally only acts for people in their own constituency.",
    contactRoute:
      'Write via House of Commons, London SW1A 0AA (include your own address so they know you\'re a constituent); phone the Commons switchboard 020 7219 3000 and ask for their office; or find them via members.parliament.uk/FindYourMP or WriteToThem.',
    contactUrl: 'https://members.parliament.uk/FindYourMP',
    sourceUrl: 'https://www.parliament.uk/get-involved/contact-an-mp-or-lord/contact-your-mp/',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'treasury-committee-chair',
    body: 'parliament',
    role: 'Chair, Treasury Committee',
    whatTheyDo:
      'Chairs the Commons committee appointed to examine the expenditure, administration and policy of HM Treasury, HMRC and associated public bodies — it does not look at individual cases or complaints.',
    holder: { name: 'Dame Meg Hillier MP', asOf: VERIFIED_ON },
    contactRoute:
      'Email treascom@parliament.uk or write to Treasury Committee, House of Commons, London, SW1A 0AA; the committee reads all submissions on policy/administration but does not reply to everyone.',
    contactUrl: 'https://committees.parliament.uk/committee/158/treasury-committee/',
    sourceUrl: 'https://committees.parliament.uk/committee/158/treasury-committee/',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'public-accounts-committee-chair',
    body: 'parliament',
    role: 'Chair, Public Accounts Committee',
    whatTheyDo:
      "Chairs the Commons committee that examines the value for money of HMRC's spending and programmes, drawing on National Audit Office reports.",
    holder: { name: 'Sir Geoffrey Clifton-Brown MP', asOf: VERIFIED_ON },
    contactRoute:
      'Email pubaccom@parliament.uk or write to Public Accounts Committee, House of Commons, London, SW1A 0AA.',
    contactUrl: 'https://committees.parliament.uk/committee/127/public-accounts-committee/',
    sourceUrl: 'https://committees.parliament.uk/committee/127/public-accounts-committee/',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'lords-finance-bill-subcommittee-chair',
    body: 'parliament',
    role: 'Chair, Lords Economic Affairs Finance Bill Sub-Committee',
    whatTheyDo:
      "Chairs the Lords sub-committee that scrutinises each year's Finance Bill from the point of view of technical tax-administration issues, clarification and simplification (not the tax rates themselves — that's Commons business).",
    holder: { name: 'Lord Liddle', asOf: VERIFIED_ON },
    contactRoute:
      'Email financebill@parliament.uk or write to Economic Affairs Finance Bill Sub-Committee, House of Lords, London SW1A 0PW; the sub-committee issues its own calls for written evidence each autumn.',
    contactUrl: 'https://committees.parliament.uk/committee/230/finance-bill-subcommittee/',
    sourceUrl: 'https://committees.parliament.uk/committee/230/finance-bill-subcommittee/',
    verifiedOn: VERIFIED_ON,
  },
]

export const HMRC_CHANNELS: ContactChannel[] = [
  {
    id: 'self-assessment-webchat',
    audience: 'Self Assessment (sole traders, landlords)',
    channel: 'Webchat / digital assistant',
    details:
      'https://www.tax.service.gov.uk/ask-hmrc/chat/self-assessment — registrations, returns, penalties, refunds, activation codes.',
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/self-assessment',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'self-assessment-phone',
    audience: 'Self Assessment (sole traders, landlords)',
    channel: 'Phone',
    details: '0300 200 3310 (outside the UK: +44 161 931 9070).',
    hours: 'Monday to Friday, 8am to 6pm. Closed bank holidays.',
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/self-assessment',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'self-assessment-post',
    audience: 'Self Assessment (sole traders, landlords)',
    channel: 'Post',
    details:
      'Self Assessment, HM Revenue and Customs, BX9 1AS, United Kingdom (postal-only address — no public counter).',
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/self-assessment',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'income-tax-paye-phone',
    audience: 'Income Tax / PAYE',
    channel: 'Phone',
    details: '0300 200 3300 (textphone 0300 200 3319; fax +44 135 535 9022).',
    hours: 'Monday to Friday, 8am to 6pm.',
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/complain-about-hmrc',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'vat-customs-excise-phone',
    audience: 'VAT / customs / excise',
    channel: 'Phone',
    details: '0300 200 3700 (textphone 0300 200 3719; outside UK +44 2920 501 261).',
    hours: 'Monday to Friday, 8am to 6pm.',
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/complain-about-hmrc',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'national-insurance-phone',
    audience: 'National Insurance',
    channel: 'Phone',
    details: '0300 200 3500 (textphone 0300 200 3519; outside UK +44 191 203 7010).',
    hours: 'Monday to Friday, 8am to 6pm.',
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/complain-about-hmrc',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'agent-dedicated-line',
    audience: 'Agents and advisers formally authorised to act for clients',
    channel: 'Phone',
    details:
      '0300 200 3311 (Agent Dedicated Line: Self Assessment or PAYE for individuals) — not for progress-chasing before the promised reply date, or for information available online.',
    hours: 'Monday to Friday, 8am to 6pm. Closed bank holidays.',
    sourceUrl:
      'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/agent-dedicated-line-self-assessment-or-paye-for-individuals',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'extra-support-team',
    audience:
      'People whose health condition or personal circumstances make it difficult to contact HMRC (e.g. dyslexia, autism, reduced mobility, mental health conditions, financial hardship, domestic abuse, hospitalisation)',
    channel: 'Extra Support Team (phone/video appointments, textphone, webchat, BSL interpreting)',
    details:
      'First check eligibility at https://tax.service.gov.uk/guidance/check-if-you-can-get-help-from-hmrc-if-you-need-extra-support (have your National Insurance number ready), or ask any HMRC helpline adviser to refer you.',
    hours: 'Webchat: Monday to Friday, 8am to 7:30pm; Saturday, 8am to 4pm. Closed bank holidays.',
    sourceUrl: 'https://www.gov.uk/get-help-hmrc-extra-support',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'mtd-early-testers-support',
    audience: 'Making Tax Digital for Income Tax early testers (signed up for 2024-25 or 2025-26)',
    channel: 'Dedicated customer support team',
    details:
      "The phone number is in the letter confirming your MTD sign-up. Covers quarterly updates, the 2025-26 return, payments/refunds, deadlines, penalties and error reporting, SA and CGT — not 2026-27 onward, Corporation Tax, VAT, NI or software-product advice.",
    sourceUrl: 'https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/help-and-support',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'foi-hmrc',
    audience: 'Freedom of Information requests to HMRC',
    channel: 'Email / post',
    details:
      'foi.request@hmrc.gov.uk, or HMRC Freedom of Information Team, S1715, 6th Floor, Central Mail Unit, Newcastle Upon Tyne, NE98 1ZZ.',
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/about/publication-scheme',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'complaints-paye-self-assessment',
    audience: 'Complaints — PAYE and Self Assessment',
    channel: 'Post',
    details: 'PAYE and Self Assessment Complaints, HM Revenue and Customs, BX9 1AB, United Kingdom.',
    sourceUrl: 'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/complain-about-hmrc',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'adjudicators-office-contact',
    audience:
      "Complaints about HMRC's service or the Valuation Office Agency, after HMRC's tier 1 and tier 2 reviews",
    channel: 'Phone / post / online form',
    details:
      "Phone 0300 057 1111; post The Adjudicator's Office, PO Box 11222, Nottingham, NG2 9AD; online form at https://www.gov.uk/guidance/contact-the-adjudicators-office-online.",
    hours: 'Monday to Friday, 9am to 5pm. Closed weekends and bank holidays.',
    sourceUrl: 'https://www.gov.uk/guidance/contact-the-adjudicators-office',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'phso-via-mp',
    audience: "Complaints that remain unresolved after the Adjudicator's Office (the final tier)",
    channel: "Parliamentary and Health Service Ombudsman — via your MP only (the 'MP filter')",
    details:
      "PHSO helpline 0345 015 4033; complaint checker at https://complaintform.ombudsman.org.uk/complaintchecker. By law, complaints about UK government departments must be referred to PHSO by an MP.",
    hours: 'Monday to Thursday, 9am to 4pm; Friday, 8:30am to 12pm.',
    sourceUrl: 'https://www.ombudsman.org.uk/making-complaint',
    verifiedOn: VERIFIED_ON,
  },
  {
    id: 'software-developers-support-team',
    audience: 'Software developers building on HMRC APIs (including Making Tax Digital)',
    channel: 'Email',
    details:
      'SDSTeam@hmrc.gov.uk — technical documentation (schema/validation rules), vendor IDs and testing credentials, testing feedback, and product recognition.',
    sourceUrl: 'https://www.gov.uk/find-hmrc-contacts/software-developers-enquiries',
    verifiedOn: VERIFIED_ON,
  },
]

export const STALENESS_DAYS = 90

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime()
  const to = new Date(`${toIso}T00:00:00Z`).getTime()
  return Math.round((to - from) / 86_400_000)
}

/**
 * Returns every ROLES/HMRC_CHANNELS entry whose verifiedOn is more than
 * STALENESS_DAYS before `today` — the gov pages use this to turn a "verified"
 * badge amber and prompt re-verification against the entry's sourceUrl.
 */
export function staleEntries(today: string): Array<{ id: string; verifiedOn: string }> {
  const all: Array<{ id: string; verifiedOn: string }> = [
    ...ROLES.map((r) => ({ id: r.id, verifiedOn: r.verifiedOn })),
    ...HMRC_CHANNELS.map((c) => ({ id: c.id, verifiedOn: c.verifiedOn })),
  ]
  return all.filter((e) => daysBetween(e.verifiedOn, today) > STALENESS_DAYS)
}
