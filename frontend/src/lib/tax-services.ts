import { withBooksActivity } from "@/lib/books-navigation";

/** Navigation and capability descriptions only. Tax rules stay in the shared engine. */
export interface TaxService {
  id: string;
  name: string;
  description: string;
  href: string;
  action: string;
  availability: "available" | "guidance" | "sandbox";
  boundary: string;
}

export const SERVICES = [
  {
    id: "return-preparation",
    name: "Prepare my tax return",
    description: "Choose a tax year, gather the evidence for your circumstances and check employment figures against a P60.",
    href: "/prepare",
    action: "Start or resume preparation",
    availability: "available",
    boundary: "A local evidence checklist and preparation summary. It does not calculate a complete return, decide whether you must file or submit to HMRC.",
  },
  {
    id: "personal-income",
    name: "Check your personal income",
    description: "See how adjusted net income affects Personal Allowance, Child Benefit and Tax-Free Childcare.",
    href: "/uk/personal-tax#threshold-check",
    action: "Check personal income",
    availability: "available",
    boundary: "A bounded income check in your browser. It does not calculate your complete tax bill or decide every eligibility condition.",
  },
  {
    id: "mtd-check",
    name: "Check whether Making Tax Digital applies",
    description: "Start with your self-employment and property income to see the main MTD Income Tax entry rules.",
    href: "/itsa/am-i-in",
    action: "Check MTD requirements",
    availability: "available",
    boundary: "A first check of the main rules. Return history, exemptions and more complex circumstances need the detailed check.",
  },
  {
    id: "mtd-detail",
    name: "Check a more complex MTD position",
    description: "Work through return history, residence, exemptions and unknown facts with source-linked explanations.",
    href: "/uk/tax-expert#first-deep-path",
    action: "Open the detailed MTD check",
    availability: "available",
    boundary: "Uses its stated facts and reviewed source coverage. It identifies unresolved cases; it does not issue an HMRC decision.",
  },
  {
    id: "sole-trader-records",
    name: "Organise your sole-trader records",
    description: "Add income and expenses, review each suggestion and keep trading records separate from property records.",
    href: "/books/workspace",
    action: "Open sole-trader books",
    availability: "available",
    boundary: "For one supported sole trade, alongside a separate UK property business. Records stay in this browser; signing in does not back them up.",
  },
  {
    id: "property-records",
    name: "Organise your property records",
    description: "Add rental income and costs to the UK property record path, separate from sole-trader activity.",
    href: "/books/workspace/money?activity=uk-property",
    action: "Open property records",
    availability: "available",
    boundary: "For the supported UK property business in pounds. Foreign property and company accounts need a different route.",
  },
  {
    id: "csv-import",
    name: "Import a bank CSV",
    description: "Bring in existing money movements, check the suggested categories and resolve duplicates.",
    href: "/books/workspace/money?start=csv",
    action: "Import a CSV",
    availability: "available",
    boundary: "The file is read in your browser. Importing does not confirm that your records are complete or ready to file.",
  },
  {
    id: "sole-trader-choices",
    name: "Compare sole-trader profit choices",
    description: "Compare a full-year trading-allowance projection with the ordinary expense method.",
    href: "/plan#first-comparison",
    action: "Compare sole-trader choices",
    availability: "available",
    boundary: "For one supported sole trade. It does not accept property or partnership figures, calculate final tax, or choose for you.",
  },
  {
    id: "quarter-figures",
    name: "Prepare quarterly figures",
    description: "Turn reviewed records into separate business totals, inspect the figures and export them.",
    href: "/itsa/quarter",
    action: "Review quarterly figures",
    availability: "available",
    boundary: "Local preparation is available. Sending requires a separate HMRC test connection and approval; production filing is not live.",
  },
  {
    id: "tax-summary",
    name: "Prepare a tax summary and handover",
    description: "Keep income sources, unknown facts and named evidence together in a printable or downloadable Tax Passport.",
    href: "/passport",
    action: "Build a tax summary",
    availability: "available",
    boundary: "Saved only when you choose. This is a local handover, not a shared adviser workspace or proof that evidence has been checked.",
  },
  {
    id: "prepare-return",
    name: "Plan how to file and pay",
    description: "Find the preparation tools and official filing and payment routes for your next step.",
    href: "/file",
    action: "Find filing and payment routes",
    availability: "guidance",
    boundary: "TaxSorted production filing and year-end Income Tax submission are not live. Preparation, sending and a receipt remain separate.",
  },
  {
    id: "fix-problem",
    name: "Correct a problem or get payment help",
    description: "Find the right route for a record correction, return amendment, appeal, complaint or payment difficulty.",
    href: "/put-it-right",
    action: "Find help with a tax problem",
    availability: "guidance",
    boundary: "Official help and guidance. TaxSorted does not accept confidential case files, represent you or decide an appeal.",
  },
  {
    id: "income-guide",
    name: "Understand your Income Tax",
    description: "Read the plain-language guide to income, tax bands and how the parts fit together.",
    href: "/learn/income-tax",
    action: "Read the Income Tax guide",
    availability: "guidance",
    boundary: "General guidance with sources. Your complete return and circumstances still need checking.",
  },
  {
    id: "property-guide",
    name: "Understand the property tax rules",
    description: "Check the landlord guide for property income, costs, allowances and record keeping.",
    href: "/learn/for-landlords",
    action: "Read the landlord guide",
    availability: "guidance",
    boundary: "Property guidance is available. A personalised property-profit comparison and a complete property tax return are not available.",
  },
  {
    id: "professional-tools",
    name: "Inspect professional and software tools",
    description: "See the supported assessments, public sources and API access boundaries for professional use.",
    href: "/uk/tax-expert#coverage-map",
    action: "See professional tool coverage",
    availability: "guidance",
    boundary: "No client list, shared records or authority to act for a client. API access and a client's permission are separate.",
  },
  {
    id: "organisation-scope",
    name: "Understand your organisation's tax position",
    description: "Explore how legal form, activities, registrations and reporting obligations differ.",
    href: "/uk/tax-identity",
    action: "Explore organisation types",
    availability: "guidance",
    boundary: "A source-backed map, not an organisation-specific assessment. Company, charity and trust returns are not available to file here.",
  },
  {
    id: "charity-guide",
    name: "Understand charity tax and reporting",
    description: "Explore charity legal forms, conditional tax reliefs, reporting duties and official help routes.",
    href: "/uk/charities",
    action: "Read the charity guide",
    availability: "guidance",
    boundary: "General charity-sector guidance. It does not assess an organisation's eligibility for relief, prepare charity accounts or file returns.",
  },
  {
    id: "vat",
    name: "Prepare and practise a VAT return",
    description: "Review VAT figures and explore the separate HMRC VAT test connection.",
    href: "/vat",
    action: "Open the VAT workspace",
    availability: "sandbox",
    boundary: "HMRC submissions use the test system. Starter Books does not yet derive a VAT return, and production VAT filing is not live.",
  },
  {
    id: "record-connections",
    name: "Bring existing records into TaxSorted",
    description: "Use CSV import now and inspect the current accounting-software connection options.",
    href: "/books/connect",
    action: "See record import options",
    availability: "guidance",
    boundary: "CSV is available for supported local books. Public Xero, QuickBooks, FreeAgent and Sage record imports are not live.",
  },
] as const satisfies readonly TaxService[];

export type ServiceId = (typeof SERVICES)[number]["id"];
export type AudienceId = "individuals" | "sole-traders" | "landlords" | "advisers" | "organisations";

export interface TaxAudience {
  id: AudienceId;
  name: string;
  shortName: string;
  description: string;
  scope: string;
  serviceIds: readonly ServiceId[];
  additionalServiceIds?: readonly ServiceId[];
}

export const AUDIENCES = [
  {
    id: "individuals",
    name: "Individuals and families",
    shortName: "Individuals",
    description: "Understand your income, family-related tax checks and the information you need to keep.",
    scope: "Prepare evidence for a chosen tax year, check personal income and keep a portable summary. Full Self Assessment and PAYE reconciliation are not available here. Trading and property records have their own tools.",
    serviceIds: ["return-preparation", "personal-income", "income-guide", "tax-summary", "prepare-return", "fix-problem"],
  },
  {
    id: "sole-traders",
    name: "Sole traders and freelancers",
    shortName: "Sole traders",
    description: "Keep business records, check MTD requirements and prepare figures you can explain.",
    scope: "The books support one UK sole trade and one separate UK property business in pounds. The profit comparison covers one sole trade; it does not cover partnerships, companies or property income.",
    serviceIds: ["mtd-check", "sole-trader-records", "sole-trader-choices", "quarter-figures", "tax-summary", "prepare-return"],
    additionalServiceIds: ["return-preparation", "csv-import", "record-connections", "mtd-detail", "fix-problem"],
  },
  {
    id: "landlords",
    name: "Landlords",
    shortName: "Landlords",
    description: "Separate property income and costs, understand the rules and prepare quarterly figures.",
    scope: "For the supported UK property business in pounds, held personally. Property records stay separate from sole-trader records. Foreign property and company-owned property need another route.",
    serviceIds: ["mtd-check", "property-records", "property-guide", "quarter-figures", "tax-summary", "prepare-return"],
    additionalServiceIds: ["return-preparation", "csv-import", "record-connections", "mtd-detail", "fix-problem"],
  },
  {
    id: "advisers",
    name: "Accountants and advisers",
    shortName: "Advisers",
    description: "Help someone understand their position, prepare a handover and inspect the sources behind an answer.",
    scope: "Use the source-backed checks and local handover format with your own review. This is not a client-management system: shared books, client invitations and delegated filing are not available.",
    serviceIds: ["professional-tools", "mtd-detail", "tax-summary", "fix-problem"],
  },
  {
    id: "organisations",
    name: "Companies, charities and other organisations",
    shortName: "Organisations",
    description: "Find your organisation's scope, explore VAT preparation and see which services are available.",
    scope: "Organisation guidance and the VAT test workspace are available. Company accounts, Corporation Tax, payroll, charity returns and trust returns are not available to prepare or file here.",
    serviceIds: ["organisation-scope", "vat", "fix-problem"],
    additionalServiceIds: ["charity-guide"],
  },
] as const satisfies readonly TaxAudience[];

export const SERVICE_AVAILABILITY_LABELS: Record<TaxService["availability"], string> = {
  available: "Available now",
  guidance: "Guidance and next steps",
  sandbox: "HMRC test system only",
};

export function getAudience(id: string | null | undefined): TaxAudience | undefined {
  return AUDIENCES.find((audience) => audience.id === id);
}

export function servicesForAudience(id: string | null | undefined): (typeof SERVICES)[number][] {
  const audience = getAudience(id);
  if (!audience) return [];
  return audience.serviceIds.map((serviceId) => SERVICES.find((service) => service.id === serviceId)!);
}

/** The directory also shows related tools without making the checklist longer. */
export function allServicesForAudience(id: string | null | undefined): (TaxService & { id: ServiceId })[] {
  const audience = getAudience(id);
  if (!audience) return [];
  const ids = [...new Set([...audience.serviceIds, ...(audience.additionalServiceIds ?? [])])];
  return ids.map((serviceId) => {
    const service = SERVICES.find((candidate) => candidate.id === serviceId)!;
    return audience.id === "landlords" && (service.id === "csv-import" || service.id === "record-connections")
      ? { ...service, href: withBooksActivity(service.href, "uk-property") }
      : service;
  });
}
