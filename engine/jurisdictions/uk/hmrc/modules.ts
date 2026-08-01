/**
 * The HMRC connection modules TaxSorted knows about.
 *
 * This is product truth, not an HMRC API catalogue: scopes and identifiers
 * describe the grant TaxSorted asks for, while capabilities say what this
 * product can do today. Sandbox work is kept visibly separate from live HMRC
 * production access.
 */

export const HMRC_RAILS = ["vat", "itsa"] as const;

export type HmrcRail = (typeof HMRC_RAILS)[number];

export type TaxSortedHmrcCapabilityState =
  | "available"
  | "sandbox-only"
  | "not-yet";

export interface TaxSortedHmrcCapability {
  id: string;
  name: string;
  state: TaxSortedHmrcCapabilityState;
}

export interface HmrcModuleDefinition {
  rail: HmrcRail;
  name: string;
  scopes: readonly string[];
  identifier: {
    required: true;
    name: string;
    abbreviation: string;
    entityField: "vrn" | "nino";
  };
  official: {
    guidanceUrl: string;
    developerUrl: string;
  };
  capabilities: readonly TaxSortedHmrcCapability[];
}

export const HMRC_MODULES = {
  vat: {
    rail: "vat",
    name: "Making Tax Digital for VAT",
    scopes: ["read:vat", "write:vat"],
    identifier: {
      required: true,
      name: "VAT registration number",
      abbreviation: "VRN",
      entityField: "vrn",
    },
    official: {
      guidanceUrl: "https://www.gov.uk/government/collections/making-tax-digital-for-vat",
      developerUrl: "https://developer.service.hmrc.gov.uk/guides/vat-mtd-end-to-end-service-guide/",
    },
    capabilities: [
      { id: "prepare-return", name: "Enter and validate VAT return figures", state: "available" },
      { id: "connect", name: "Connect to HMRC", state: "sandbox-only" },
      { id: "read-obligations", name: "Read VAT obligations from HMRC", state: "sandbox-only" },
      { id: "submit-return", name: "Submit a VAT return to HMRC", state: "sandbox-only" },
      { id: "keep-receipt", name: "Keep the HMRC submission receipt", state: "sandbox-only" },
      { id: "production-access", name: "Use the live HMRC service", state: "not-yet" },
    ],
  },
  itsa: {
    rail: "itsa",
    name: "Making Tax Digital for Income Tax",
    scopes: ["read:self-assessment", "write:self-assessment"],
    identifier: {
      required: true,
      name: "National Insurance number",
      abbreviation: "NINO",
      entityField: "nino",
    },
    official: {
      guidanceUrl: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax",
      developerUrl: "https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/",
    },
    capabilities: [
      { id: "prepare-quarterly-update", name: "Prepare quarterly figures", state: "available" },
      { id: "connect", name: "Connect to HMRC", state: "sandbox-only" },
      { id: "read-hmrc-details", name: "Read status, obligations and businesses from HMRC", state: "sandbox-only" },
      { id: "submit-quarterly-update", name: "Send a quarterly update to HMRC", state: "sandbox-only" },
      { id: "request-calculation", name: "Request an HMRC tax calculation", state: "sandbox-only" },
      { id: "keep-receipt", name: "Keep the HMRC update receipt", state: "sandbox-only" },
      { id: "submit-tax-return", name: "Submit the annual tax return", state: "not-yet" },
      { id: "production-access", name: "Use the live HMRC service", state: "not-yet" },
    ],
  },
} as const satisfies Record<HmrcRail, HmrcModuleDefinition>;

/** Stable VAT-then-Income-Tax order for public JSON and user interfaces. */
export const HMRC_MODULE_LIST: readonly HmrcModuleDefinition[] = HMRC_RAILS.map(
  (rail) => HMRC_MODULES[rail]
);

export function isHmrcRail(value: string): value is HmrcRail {
  return (HMRC_RAILS as readonly string[]).includes(value);
}

export function hmrcModuleFor(rail: HmrcRail): HmrcModuleDefinition {
  return HMRC_MODULES[rail];
}
