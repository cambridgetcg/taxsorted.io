export type DeliveryState = "open-now" | "partly-open" | "next" | "planned" | "sandbox-only";

export interface OfficialLink {
  label: string;
  href: string;
  publisher: "GOV.UK" | "HMRC" | "Xero" | "Intuit" | "FreeAgent" | "Sage";
  checkedOn: "2026-08-01";
}

export interface AccountingSourceSummary {
  id: "csv" | "xero" | "quickbooks" | "freeagent" | "sage";
  name: string;
  state: "open-now" | "planned";
  stateLabel: string;
  plain: string;
  keeps: readonly string[];
  boundary: string;
  action?: { label: string; href: string };
  needSoftware?: { label: string; href: string };
  official: readonly OfficialLink[];
}

export const ACCOUNTING_SOURCES: readonly AccountingSourceSummary[] = [
  {
    id: "csv",
    name: "Bank CSV",
    state: "open-now",
    stateLabel: "Open now",
    plain: "Import a signed-amount CSV into local Starter Books, then review every row before it enters a tax figure.",
    keeps: ["stable file and row identity", "source wording", "review state", "later corrections"],
    boundary:
      "GBP and one activity per import. Separate Debit and Credit columns, automatic bank matching and cloud backup are not live.",
    action: { label: "Import a bank CSV", href: "/books/workspace?start=csv" },
    official: [
      {
        label: "Digital records and bank-feed checks",
        href: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records",
        publisher: "GOV.UK",
        checkedOn: "2026-08-01",
      },
    ],
  },
  {
    id: "xero",
    name: "Xero",
    state: "planned",
    stateLabel: "Connector not live",
    plain: "The first planned read-only connection: choose one Xero organisation, bring in visible changes and keep the original Xero record IDs.",
    keeps: [
      "chosen Xero organisation",
      "source change markers",
      "original tax codes",
      "source timestamps",
    ],
    boundary:
      "Xero's standard accounting connection does not expose unreconciled statement lines or let an app reconcile them. Attachments are also outside TaxSorted's first pilot. Both gaps will stay visible.",
    needSoftware: {
      label: "View official Xero plans",
      href: "https://www.xero.com/uk/pricing-plans/",
    },
    official: [
      {
        label: "Choosing a Xero organisation",
        href: "https://developer.xero.com/documentation/guides/oauth2/tenants/",
        publisher: "Xero",
        checkedOn: "2026-08-01",
      },
      {
        label: "Bank-statement access limit",
        href: "https://developer.xero.com/documentation/api/accounting/bankstatements",
        publisher: "Xero",
        checkedOn: "2026-08-01",
      },
    ],
  },
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    state: "planned",
    stateLabel: "Connector not live",
    plain: "A later read-only connection will link one company, use change notices as prompts and check again for anything it missed.",
    keeps: [
      "chosen QuickBooks company",
      "source change markers",
      "original tax codes",
      "source attachment links",
    ],
    boundary:
      "QuickBooks gives an app one broad accounting permission, so TaxSorted's planned connection must permit reads only. Its Change Data Capture check looks back 30 days and returns at most 1,000 records, so missed changes need prompt repair.",
    needSoftware: {
      label: "View official QuickBooks plans",
      href: "https://quickbooks.intuit.com/uk/pricing/",
    },
    official: [
      {
        label: "Automatic change notices",
        href: "https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks/best-practices",
        publisher: "Intuit",
        checkedOn: "2026-08-01",
      },
      {
        label: "Change Data Capture",
        href: "https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api/change-data-capture",
        publisher: "Intuit",
        checkedOn: "2026-08-01",
      },
    ],
  },
  {
    id: "freeagent",
    name: "FreeAgent",
    state: "planned",
    stateLabel: "Connector not live",
    plain: "A later read-only connection will keep bank transactions, their explanations and FreeAgent return states distinct.",
    keeps: [
      "original bank transaction",
      "one or more explanations",
      "return status",
      "filing reference",
    ],
    boundary:
      "FreeAgent gives an app the permissions held by the person who connects it; it does not offer a separate read-only permission. TaxSorted's planned connection must make only read requests and respect the 120-per-minute and 3,600-per-hour limits.",
    needSoftware: {
      label: "View official FreeAgent plans",
      href: "https://www.freeagent.com/pricing/",
    },
    official: [
      {
        label: "VAT return states",
        href: "https://dev.freeagent.com/docs/vat_returns",
        publisher: "FreeAgent",
        checkedOn: "2026-08-01",
      },
      {
        label: "Bank transaction explanations",
        href: "https://dev.freeagent.com/docs/bank_transaction_explanations",
        publisher: "FreeAgent",
        checkedOn: "2026-08-01",
      },
    ],
  },
  {
    id: "sage",
    name: "Sage Accounting (UK)",
    state: "planned",
    stateLabel: "Connector not live",
    plain: "A planned UK connection will link one Sage business, preserve its original record IDs and show what changes TaxSorted cannot detect automatically.",
    keeps: [
      "chosen Sage business",
      "original Sage record IDs",
      "tax treatment",
      "links to source attachments",
    ],
    boundary:
      "Country, product, plan and user role change what is available. No supported public Sage Accounting change-notification service has been found, so regular complete change checks remain necessary.",
    needSoftware: {
      label: "View official Sage plans",
      href: "https://www.sage.com/en-gb/accounting-software/",
    },
    official: [
      {
        label: "Accounting API v3.1",
        href: "https://developer.sage.com/accounting/apis/sagebusinesscloudaccounting/3.1.0/accounting",
        publisher: "Sage",
        checkedOn: "2026-08-01",
      },
      {
        label: "Authentication",
        href: "https://developer.sage.com/accounting/guides/authenticating/authentication/",
        publisher: "Sage",
        checkedOn: "2026-08-01",
      },
    ],
  },
] as const;

export interface IntegrationStep {
  number: number;
  name: string;
  state: DeliveryState;
  stateLabel: string;
  plain: string;
  proof: string;
  action?: { label: string; href: string };
}

export const RECORDS_TO_RECEIPT: readonly IntegrationStep[] = [
  {
    number: 1,
    name: "Bring records in",
    state: "open-now",
    stateLabel: "CSV open now",
    plain: "Choose a source and one business. See what will be read before anything enters your books.",
    proof: "A connection is access, not completeness.",
    action: { label: "Import a CSV", href: "/books/workspace?start=csv" },
  },
  {
    number: 2,
    name: "Review the changes",
    state: "partly-open",
    stateLabel: "Inbox open; conflicts next",
    plain: "Resolve categorisation suggestions and possible duplicates in Money Inbox. Changed source rows are detected, but their dedicated resolution screen is still to build.",
    proof: "No suggestion changes a figure until you confirm it; a detected conflict is not called resolved.",
    action: { label: "Open my Money Inbox", href: "/books/workspace" },
  },
  {
    number: 3,
    name: "Check completeness",
    state: "next",
    stateLabel: "Next",
    plain: "Reconcile balances, unresolved items, evidence, late transactions and the source capabilities TaxSorted cannot see.",
    proof: "Signing in to a source never earns a reconciled badge.",
  },
  {
    number: 4,
    name: "Prepare the tax view",
    state: "partly-open",
    stateLabel: "Income Tax open",
    plain: "Trace each total back through categories, reviewed events and official guidance. Unknown facts remain unknown.",
    proof: "Starter Books derives Income Tax quarter totals; it does not yet derive a VAT return.",
    action: { label: "Review a quarterly update", href: "/itsa/quarter" },
  },
  {
    number: 5,
    name: "Connect one HMRC module",
    state: "sandbox-only",
    stateLabel: "Sandbox only",
    plain: "Connect VAT or Income Tax separately. Each module keeps its own permissions, status and off-switch.",
    proof: "Disconnecting one tax must not disconnect the other.",
    action: { label: "Open HMRC practice connection", href: "/dashboard" },
  },
  {
    number: 6,
    name: "Approve, send and keep the receipt",
    state: "sandbox-only",
    stateLabel: "Quarter practice open",
    plain: "Re-read the local books, show the exact totals, submit them to HMRC's test system, and keep the submission reference.",
    proof: "A sandbox receipt proves only that the test system accepted that send; payment tracking is not built.",
    action: { label: "Open the quarter flow", href: "/itsa/quarter" },
  },
] as const;

export const OFFICIAL_FILING_HELP: readonly OfficialLink[] = [
  {
    label: "Check if and when you must use MTD Income Tax",
    href: "https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax",
    publisher: "GOV.UK",
    checkedOn: "2026-08-01",
  },
  {
    label: "Connect software and choose update periods",
    href: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/get-your-software-ready",
    publisher: "GOV.UK",
    checkedOn: "2026-08-01",
  },
  {
    label: "Create and correct digital records",
    href: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records",
    publisher: "GOV.UK",
    checkedOn: "2026-08-01",
  },
  {
    label: "Send cumulative quarterly updates",
    href: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates",
    publisher: "GOV.UK",
    checkedOn: "2026-08-01",
  },
  {
    label: "Make year-end business adjustments",
    href: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/adjust-your-self-employment-and-property-income",
    publisher: "GOV.UK",
    checkedOn: "2026-08-01",
  },
  {
    label: "Complete and submit the tax return",
    href: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/submit-your-tax-return",
    publisher: "GOV.UK",
    checkedOn: "2026-08-01",
  },
  {
    label: "Pay a Self Assessment tax bill",
    href: "https://www.gov.uk/pay-self-assessment-tax-bill",
    publisher: "GOV.UK",
    checkedOn: "2026-08-01",
  },
  {
    label: "Correct a Self Assessment tax return",
    href: "https://www.gov.uk/self-assessment-tax-returns/corrections",
    publisher: "GOV.UK",
    checkedOn: "2026-08-01",
  },
  {
    label: "VAT digital records and digital links",
    href: "https://www.gov.uk/government/publications/vat-notice-70022-making-tax-digital-for-vat",
    publisher: "GOV.UK",
    checkedOn: "2026-08-01",
  },
  {
    label: "HMRC's MTD Income Tax software standards",
    href: "https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html",
    publisher: "HMRC",
    checkedOn: "2026-08-01",
  },
] as const;
