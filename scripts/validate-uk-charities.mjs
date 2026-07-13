// Independent safety check for the public charity-system corpus. This script
// intentionally does not import the runtime loader: CI gets a second parser and
// graph walk before any organisation data is ever considered for publication.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path =
  process.argv[2] ??
  fileURLToPath(new URL("../research/uk/charities/data/uk-charities.json", import.meta.url));
const corpus = JSON.parse(readFileSync(path, "utf8"));
const supplementPaths = process.argv[2]
  ? process.argv.slice(3)
  : [
      fileURLToPath(new URL(
        "../research/uk/charities/data/uk-charity-tax-law-additions.json",
        import.meta.url,
      )),
      fileURLToPath(new URL(
        "../research/uk/charities/data/uk-charity-tax-procedure-additions.json",
        import.meta.url,
      )),
    ];
const issues = [];
const collectionNames = [
  "sources",
  "regulators",
  "registers",
  "legalForms",
  "taxTreatments",
  "taxRules",
  "obligations",
  "fundingMechanisms",
  "financeDisclosures",
  "controlModels",
  "helpRoutes",
  "officialProcedures",
  "pipelineStages",
  "transparencyGaps",
];
const admittedTaxRuleIds = new Set([
  "rule-ita-2007-s539", "rule-ita-2007-s540", "rule-ita-2007-s541",
  "rule-ita-2007-s542", "rule-ita-2007-s543", "rule-ita-2007-s562",
  "rule-ita-2007-s563", "rule-ita-2007-s564", "rule-cta-2010-s492",
  "rule-cta-2010-s493", "rule-cta-2010-s494", "rule-cta-2010-s495",
  "rule-cta-2010-s496", "rule-cta-2010-s515", "rule-cta-2010-s516",
  "rule-cta-2010-s517",
  "rule-ita-2007-s544-loss-calculation",
  "rule-ita-2007-s544-miscellaneous-transaction",
  "rule-ita-2007-s545-expenditure-scope", "rule-ita-2007-s546-commitment-timing",
  "rule-ita-2007-s547-overseas-reasonable-steps", "rule-ita-2007-s548-same-year-recycling",
  "rule-ita-2007-s558-listed-purpose-gateway", "rule-ita-2007-s558-unlisted-claim-route",
  "rule-ita-2007-s558-allowable-purpose", "rule-ita-2007-s559-security-types",
  "rule-ita-2007-s560-security-conditions", "rule-ita-2007-s561-approved-loan",
  "rule-cta-2010-s497-loss-calculation", "rule-cta-2010-s497-miscellaneous-transaction",
  "rule-cta-2010-s498-expenditure-scope", "rule-cta-2010-s499-commitment-timing",
  "rule-cta-2010-s500-overseas-reasonable-steps", "rule-cta-2010-s501-same-period-recycling",
  "rule-cta-2010-s511-listed-purpose-gateway", "rule-cta-2010-s511-unlisted-claim-route",
  "rule-cta-2010-s511-allowable-purpose", "rule-cta-2010-s512-security-types",
  "rule-cta-2010-s513-security-conditions", "rule-cta-2010-s514-approved-loan",
  "rule-tcga-1992-s256-charitable-gain-exemption",
  "rule-tcga-1992-s256-cessation-deemed-disposal",
  "rule-tcga-1992-s256-attributed-gains-chargeable",
  "rule-tcga-1992-s256a-trust-gain-attribution",
  "rule-tcga-1992-s256b-trust-gain-specification",
  "rule-tcga-1992-s256c-company-gain-attribution",
  "rule-tcga-1992-s256d-company-gain-specification",
]);
const admittedTaxRuleInstruments = {
  "ita-2007": {
    title: "Income Tax Act 2007",
    legislationClass: "ukpga",
    year: 2007,
    number: 3,
  },
  "cta-2010": {
    title: "Corporation Tax Act 2010",
    legislationClass: "ukpga",
    year: 2010,
    number: 4,
  },
  "tcga-1992": {
    title: "Taxation of Chargeable Gains Act 1992",
    legislationClass: "ukpga",
    year: 1992,
    number: 12,
  },
};
function admittedTaxRuleAuthority(ruleId) {
  const match = /^rule-(ita-2007|cta-2010|tcga-1992)-s([0-9]+[a-z]?)(?:-|$)/.exec(ruleId);
  if (!match) throw new Error(`Tax rule lacks an admitted authority identity: ${ruleId}`);
  const instrument = admittedTaxRuleInstruments[match[1]];
  const sectionId = match[2];
  const section = sectionId.toUpperCase();
  return {
    authoritySourceId: `src-${match[1]}-s${sectionId}`,
    citation: `${instrument.title} s ${section}`,
    sourceTitlePrefix: `${instrument.title}, section ${section} —`,
    selector: {
      kind: "section",
      legislationClass: instrument.legislationClass,
      year: instrument.year,
      number: instrument.number,
      section,
    },
  };
}
const admittedTaxRuleAuthorityById = new Map(
  [...admittedTaxRuleIds].map((ruleId) => [ruleId, admittedTaxRuleAuthority(ruleId)]),
);
const admittedOfficialProcedureTreatmentById = new Map([
  ["procedure-ita-2007-s542-attribution-specification", "tax-non-charitable-expenditure"],
  ["procedure-cta-2010-s495-attribution-specification", "tax-non-charitable-expenditure"],
  ["procedure-trust-tma-1970-s7-chargeability-notification", "tax-income-and-gains"],
  ["procedure-trust-tma-1970-ss8a-9-return-self-assessment", "tax-income-and-gains"],
  ["procedure-trust-tma-1970-s9za-taxpayer-amendment", "tax-income-and-gains"],
  ["procedure-trust-tma-1970-s9zb-hmrc-correction-rejection", "tax-income-and-gains"],
  ["procedure-trust-tma-1970-s9a-enquiry-opening", "tax-income-and-gains"],
  ["procedure-trust-tma-1970-s9c-jeopardy-amendment", "tax-income-and-gains"],
  ["procedure-trust-tma-1970-s28a-closure-amendment", "tax-income-and-gains"],
  ["procedure-trust-tma-1970-s28c-no-return-determination", "tax-income-and-gains"],
  ["procedure-trust-tma-1970-ss29-34-36-discovery-assessment", "tax-income-and-gains"],
  ["procedure-trust-tma-1970-s59b-payment", "tax-income-and-gains"],
  ["procedure-trust-tma-1970-ss31-31a-appeal-initiation", "tax-income-and-gains"],
  ["procedure-company-fa-1998-sch18-p2-chargeability-notification", "tax-income-and-gains"],
  ["procedure-company-fa-1998-sch18-pp3-7-14-return-self-assessment", "tax-income-and-gains"],
  ["procedure-company-fa-1998-sch18-p15-taxpayer-amendment", "tax-income-and-gains"],
  ["procedure-company-fa-1998-sch18-p16-hmrc-correction-rejection", "tax-income-and-gains"],
  ["procedure-company-fa-1998-sch18-p24-enquiry-opening", "tax-income-and-gains"],
  ["procedure-company-fa-1998-sch18-p30-jeopardy-amendment", "tax-income-and-gains"],
  ["procedure-company-fa-1998-sch18-pp32-34-closure-amendment", "tax-income-and-gains"],
  ["procedure-company-fa-1998-sch18-pp36-39-40-no-return-determination", "tax-income-and-gains"],
  ["procedure-company-fa-1998-sch18-pp41-48-discovery-assessment", "tax-income-and-gains"],
  ["procedure-company-tma-1970-ss59d-59e-payment", "tax-income-and-gains"],
  ["procedure-company-fa-1998-sch18-pp30-34-48-appeal-initiation", "tax-income-and-gains"],
  ["procedure-charity-cross-tax-tma-1970-ss49a-49f-hmrc-review", "tax-income-and-gains"],
  ["procedure-charity-cross-tax-tma-1970-s49d-direct-tribunal-notification", "tax-income-and-gains"],
  ["procedure-charity-cross-tax-tma-1970-s49g-post-review-tribunal-notification", "tax-income-and-gains"],
  ["procedure-charity-cross-tax-tma-1970-s49h-unaccepted-review-offer-tribunal-notification", "tax-income-and-gains"],
  ["procedure-charity-cross-tax-tma-1970-s50-tribunal-outcome", "tax-income-and-gains"],
  ["procedure-charity-cross-tax-tma-1970-s55-payment-postponement", "tax-income-and-gains"],
  ["procedure-charity-cross-tax-fa-2008-s127-england-wales-goods-recovery", "tax-income-and-gains"],
  ["procedure-charity-cross-tax-fa-2008-s128-scotland-summary-warrant", "tax-income-and-gains"],
  ["procedure-charity-cross-tax-tma-1970-s61-northern-ireland-distraint", "tax-income-and-gains"],
  ["procedure-tcga-1992-s256b-gains-attribution-specification", "tax-non-charitable-expenditure"],
  ["procedure-tcga-1992-s256d-gains-attribution-specification", "tax-non-charitable-expenditure"],
]);
const admittedOfficialProcedureLegalBasisById = new Map([
  ["procedure-ita-2007-s542-attribution-specification", ["src-ita-2007-s542"]],
  ["procedure-cta-2010-s495-attribution-specification", ["src-cta-2010-s495"]],
  ["procedure-trust-tma-1970-s7-chargeability-notification", ["src-tma-1970-s7"]],
  ["procedure-trust-tma-1970-ss8a-9-return-self-assessment", ["src-tma-1970-s8a", "src-tma-1970-s9"]],
  ["procedure-trust-tma-1970-s9za-taxpayer-amendment", ["src-tma-1970-s9za"]],
  ["procedure-trust-tma-1970-s9zb-hmrc-correction-rejection", ["src-tma-1970-s9zb"]],
  ["procedure-trust-tma-1970-s9a-enquiry-opening", ["src-tma-1970-s9a"]],
  ["procedure-trust-tma-1970-s9c-jeopardy-amendment", ["src-tma-1970-s9c", "src-tma-1970-s31", "src-tma-1970-s31a"]],
  ["procedure-trust-tma-1970-s28a-closure-amendment", ["src-tma-1970-s28a", "src-tma-1970-s31", "src-tma-1970-s31a"]],
  ["procedure-trust-tma-1970-s28c-no-return-determination", ["src-tma-1970-s28c"]],
  ["procedure-trust-tma-1970-ss29-34-36-discovery-assessment", ["src-tma-1970-s29", "src-tma-1970-s34", "src-tma-1970-s36", "src-tma-1970-s31", "src-tma-1970-s31a", "src-tma-1970-s30a"]],
  ["procedure-trust-tma-1970-s59b-payment", ["src-tma-1970-s59b"]],
  ["procedure-trust-tma-1970-ss31-31a-appeal-initiation", ["src-tma-1970-s31", "src-tma-1970-s31a", "src-tma-1970-s49"]],
  ["procedure-company-fa-1998-sch18-p2-chargeability-notification", ["src-fa-1998-sch18-p2"]],
  ["procedure-company-fa-1998-sch18-pp3-7-14-return-self-assessment", ["src-fa-1998-sch18-p3", "src-fa-1998-sch18-p7", "src-fa-1998-sch18-p14"]],
  ["procedure-company-fa-1998-sch18-p15-taxpayer-amendment", ["src-fa-1998-sch18-p15"]],
  ["procedure-company-fa-1998-sch18-p16-hmrc-correction-rejection", ["src-fa-1998-sch18-p16"]],
  ["procedure-company-fa-1998-sch18-p24-enquiry-opening", ["src-fa-1998-sch18-p24"]],
  ["procedure-company-fa-1998-sch18-p30-jeopardy-amendment", ["src-fa-1998-sch18-p30"]],
  ["procedure-company-fa-1998-sch18-pp32-34-closure-amendment", ["src-fa-1998-sch18-p32", "src-fa-1998-sch18-p34"]],
  ["procedure-company-fa-1998-sch18-pp36-39-40-no-return-determination", ["src-fa-1998-sch18-p36", "src-fa-1998-sch18-p39", "src-fa-1998-sch18-p40"]],
  ["procedure-company-fa-1998-sch18-pp41-48-discovery-assessment", ["src-fa-1998-sch18-p41", "src-fa-1998-sch18-p42", "src-fa-1998-sch18-p43", "src-fa-1998-sch18-p44", "src-fa-1998-sch18-p45", "src-fa-1998-sch18-p46", "src-fa-1998-sch18-p48", "src-fa-1998-sch18-p47"]],
  ["procedure-company-tma-1970-ss59d-59e-payment", ["src-tma-1970-s59d", "src-tma-1970-s59e"]],
  ["procedure-company-fa-1998-sch18-pp30-34-48-appeal-initiation", ["src-fa-1998-sch18-p30", "src-fa-1998-sch18-p34", "src-fa-1998-sch18-p48", "src-tma-1970-s49"]],
  ["procedure-charity-cross-tax-tma-1970-ss49a-49f-hmrc-review", ["src-tma-1970-s49a", "src-tma-1970-s49b", "src-tma-1970-s49c", "src-tma-1970-s49e", "src-tma-1970-s49f"]],
  ["procedure-charity-cross-tax-tma-1970-s49d-direct-tribunal-notification", ["src-tma-1970-s49d"]],
  ["procedure-charity-cross-tax-tma-1970-s49g-post-review-tribunal-notification", ["src-tma-1970-s49g"]],
  ["procedure-charity-cross-tax-tma-1970-s49h-unaccepted-review-offer-tribunal-notification", ["src-tma-1970-s49h"]],
  ["procedure-charity-cross-tax-tma-1970-s50-tribunal-outcome", ["src-tma-1970-s50"]],
  ["procedure-charity-cross-tax-tma-1970-s55-payment-postponement", ["src-tma-1970-s55"]],
  ["procedure-charity-cross-tax-fa-2008-s127-england-wales-goods-recovery", ["src-fa-2008-s127", "src-tcea-2007-sch12-p2"]],
  ["procedure-charity-cross-tax-fa-2008-s128-scotland-summary-warrant", ["src-fa-2008-s128"]],
  ["procedure-charity-cross-tax-tma-1970-s61-northern-ireland-distraint", ["src-tma-1970-s61"]],
  ["procedure-tcga-1992-s256b-gains-attribution-specification", ["src-tcga-1992-s256b"]],
  ["procedure-tcga-1992-s256d-gains-attribution-specification", ["src-tcga-1992-s256d"]],
]);
const admittedOfficialProcedureIds = new Set(
  admittedOfficialProcedureTreatmentById.keys(),
);
const expectedTopLevel = new Set(["schema", "meta", ...collectionNames]);
const idPattern = /^[a-z0-9][a-z0-9-]*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const taxTypes = new Set(["income-tax", "capital-gains-tax", "corporation-tax"]);
const treatmentFieldPointers = new Set([
  "/taxType", "/position", "/eligibility", "/benefit", "/conditions",
  "/whenTaxOrClawbackCanArise", "/reasoningStatus", "/reasoning", "/notEquivalentTo",
]);
const taxpayerClasses = new Set([
  "charity-cross-tax",
  "charitable-trust-income-tax",
  "charitable-trust-capital-gains-tax",
  "charitable-trust-income-and-capital-gains-tax",
  "charitable-company-corporation-tax",
]);
const explanationScopes = new Set([
  "treatment-core",
  "supplementary-substantive",
  "administrative-procedure",
]);
const ruleRoles = new Set([
  "gateway", "restriction", "calculation", "attribution", "definition", "transition", "procedure",
]);
const temporalStatuses = new Set(["current", "prospective", "historical", "partly-current"]);
const temporalBases = new Set([
  "all-current-cases-subject-to-conditions",
  "event-date",
  "accounting-period",
  "legacy-contract-transition",
]);
const legislationClasses = new Set(["ukpga", "ukla", "asp", "asc", "anaw", "nia"]);
const evidenceMethods = new Set([
  "manual-review",
  "editorial-analysis",
  "derived-exact-id-mapping",
]);
const procedureTypes = new Set([
  "attribution-specification-determination",
  "chargeability-notification",
  "return-and-self-assessment",
  "taxpayer-return-amendment",
  "hmrc-return-correction-and-taxpayer-rejection",
  "enquiry-opening",
  "jeopardy-amendment",
  "closure-notice-and-amendment",
  "no-return-determination-and-superseding-return",
  "discovery-assessment",
  "tax-payment",
  "appeal-initiation",
  "hmrc-review",
  "tribunal-notification",
  "tribunal-outcome",
  "payment-postponement",
  "taking-control-of-goods-recovery",
  "summary-warrant-recovery",
  "distraint-recovery",
]);
const procedureStages = new Set([
  "attribution", "notification", "return", "amendment", "enquiry", "assessment", "payment", "appeal", "recovery",
]);
const procedureActorRoles = new Set([
  "taxpayer", "tax-authority", "tribunal", "enforcement-agent", "sheriff", "sheriff-officer", "collector",
]);
const procedureChallengeModes = new Set([
  "appeal", "reject-correction", "superseding-return", "separate-route", "none-in-this-provision",
]);
const procedureSelectors = new Set([
  "taxpayer-class", "tax-type", "tax-period", "jurisdiction", "document-or-decision-type",
  "notice-to-file-status", "notice-to-file-date", "notice-withdrawal-status",
  "notice-withdrawal-date-if-withdrawn", "tax-year-end", "return-filing-date",
  "return-filing-status", "filing-deadline", "amendment-date", "hmrc-correction-date",
  "enquiry-window-end", "enquiry-open-date", "closure-notice-date", "loss-of-tax-behaviour",
  "discovery-date", "hmrc-awareness-information-status", "prevailing-practice-status",
  "relevant-deadline", "payment-due-date", "amount-due", "appealable-decision",
  "decision-notice-date", "appeal-notice-date", "review-offer-or-request-status",
  "review-conclusion-date", "tribunal-notification-date", "postponement-request-status",
  "postponement-decision-status", "appeal-status", "payment-status", "recovery-territory",
  "demand-date", "neglect-or-refusal-status", "statutory-waiting-period-end", "warrant-status",
  "warrant-date", "control-or-distraint-date", "company-payment-regime", "accounting-period-end",
  "hmrc-requirement-made-date", "specification-notice-status", "specification-notice-date-if-given",
]);

function requireOwnFields(owner, item, fields) {
  for (const field of fields) {
    if (!Object.hasOwn(item, field)) fail(`${owner} is missing required v3 field: ${field}`);
  }
}

function valuesIn(owner, values, allowed, label) {
  for (const value of values ?? []) {
    if (!allowed.has(value)) fail(`${owner} has unknown ${label}: ${value}`);
  }
}

function isNonBlank(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function requireNonBlank(owner, value, label) {
  if (!isNonBlank(value)) fail(`${owner} needs non-blank ${label}`);
}

function requireNonBlankArray(owner, values, label, allowEmpty = false) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) {
    fail(`${owner} needs ${label}`);
    return;
  }
  for (const value of values) {
    if (!isNonBlank(value)) fail(`${owner} has blank ${label} item`);
  }
}

function validateAuthoritySelector(owner, selector) {
  if (!selector || typeof selector !== "object" || Array.isArray(selector)) {
    fail(`${owner} needs an authority-selector object`);
    return;
  }
  if (!["section", "schedule-paragraph"].includes(selector.kind)) {
    fail(`${owner} has unknown authority-selector kind: ${selector.kind}`);
  }
  if (!legislationClasses.has(selector.legislationClass)) {
    fail(`${owner} has unknown legislation class: ${selector.legislationClass}`);
  }
  if (!Number.isInteger(selector.year) || selector.year < 1000 || selector.year > 9999) {
    fail(`${owner} has invalid authority-selector year`);
  }
  if (!Number.isInteger(selector.number) || selector.number <= 0) {
    fail(`${owner} has invalid authority-selector number`);
  }
  if (selector.kind === "section") {
    requireNonBlank(owner, selector.section, "authority-selector section");
  } else if (selector.kind === "schedule-paragraph") {
    requireNonBlank(owner, selector.schedule, "authority-selector schedule");
    requireNonBlank(owner, selector.paragraph, "authority-selector paragraph");
  }
}

function validateTemporalApplicability(owner, temporal) {
  if (!temporal || typeof temporal !== "object" || Array.isArray(temporal)) {
    fail(`${owner} needs a temporal-applicability object`);
    return;
  }
  if (!temporalBases.has(temporal.basis)) {
    fail(`${owner} has unknown temporal basis: ${temporal.basis}`);
  }
  if (temporal.eventType !== null && !isNonBlank(temporal.eventType)) {
    fail(`${owner} has invalid temporal event type`);
  }
  for (const field of [
    "startsOnOrAfter",
    "endsBefore",
    "legacyContractSignedBefore",
    "legacyContractMustNotBeVariedOnOrAfter",
  ]) {
    if (temporal[field] !== null && !isCalendarDate(temporal[field])) {
      fail(`${owner} has invalid temporal date: ${field}`);
    }
  }
  if (!Array.isArray(temporal.transitionAuthoritySourceIds)) {
    fail(`${owner} needs transitionAuthoritySourceIds`);
  } else {
    requireNonBlankArray(
      owner,
      temporal.transitionAuthoritySourceIds,
      "transitionAuthoritySourceIds",
      true,
    );
  }
  if (
    isCalendarDate(temporal.startsOnOrAfter)
    && isCalendarDate(temporal.endsBefore)
    && temporal.startsOnOrAfter >= temporal.endsBefore
  ) {
    fail(`${owner} temporal applicability has an empty or reversed interval`);
  }
  if (
    temporal.basis === "event-date"
    && (!isNonBlank(temporal.eventType) || !isCalendarDate(temporal.startsOnOrAfter))
  ) {
    fail(`${owner} event-date applicability needs an event type and start date`);
  }
  if (temporal.basis === "legacy-contract-transition") {
    if (
      !isCalendarDate(temporal.legacyContractSignedBefore)
      || !isCalendarDate(temporal.legacyContractMustNotBeVariedOnOrAfter)
      || !Array.isArray(temporal.transitionAuthoritySourceIds)
      || temporal.transitionAuthoritySourceIds.length === 0
    ) {
      fail(`${owner} legacy-contract transition needs both cutoff dates and transition authority`);
    }
  } else if (
    temporal.legacyContractSignedBefore !== null
    || temporal.legacyContractMustNotBeVariedOnOrAfter !== null
  ) {
    fail(`${owner} declares legacy-contract dates outside a legacy transition`);
  }
}

function requireSubstantiveEvidenceCoverage(item) {
  const coveredRoots = new Set(
    (item.evidence ?? []).flatMap((entry) =>
      (entry.fields ?? []).map((pointer) => pointer.slice(1).split("/", 1)[0])
    )
  );
  for (const field of Object.keys(item)) {
    if (["id", "sourceIds", "evidence"].includes(field)) continue;
    if (!coveredRoots.has(field)) {
      fail(`${item.id} has no evidence pointer for public field: ${field}`);
    }
  }
}

function requireEvidenceMethod(item, pointer, method) {
  const supportingEntries = (item.evidence ?? []).filter((entry) =>
    (entry.fields ?? []).includes(pointer)
  );
  if (
    supportingEntries.length === 0
    || supportingEntries.some((entry) => entry.method !== method)
  ) {
    fail(`${item.id} must evidence ${pointer} with ${method}`);
  }
}

for (const supplementPath of supplementPaths) {
  const supplement = JSON.parse(readFileSync(supplementPath, "utf8"));
  if (supplement.schema !== "taxsorted.uk.charities.supplement/1") {
    fail(`unexpected supplement schema: ${supplementPath}`);
    continue;
  }
  for (const key of Object.keys(supplement)) {
    if (!["schema", "sources", "regulators", "taxRules", "officialProcedures", "transparencyGaps"].includes(key)) {
      fail(`unexpected supplement key ${key}: ${supplementPath}`);
    }
  }
  for (const collection of [
    "sources",
    "regulators",
    "taxRules",
    "officialProcedures",
    "transparencyGaps",
  ]) {
    if (supplement[collection]) corpus[collection].push(...supplement[collection]);
  }
}

function fail(message) {
  issues.push(message);
}

function isCalendarDate(value) {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function unique(owner, values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`${owner} repeats ${label}: ${value}`);
    seen.add(value);
  }
}

function pointerExists(item, pointer) {
  let current = item;
  for (const raw of pointer.slice(1).split("/")) {
    const part = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current)) {
      if (!/^\d+$/.test(part) || Number(part) >= current.length) return false;
      current = current[Number(part)];
    } else if (current && typeof current === "object" && Object.hasOwn(current, part)) {
      current = current[part];
    } else {
      return false;
    }
  }
  return true;
}

function expandJurisdictions(values) {
  const expanded = new Set();
  for (const value of values) {
    if (value === "United Kingdom") {
      for (const nation of ["England", "Wales", "Scotland", "Northern Ireland"]) {
        expanded.add(nation);
      }
    } else if (value === "England and Wales") {
      expanded.add("England");
      expanded.add("Wales");
    } else {
      expanded.add(value);
    }
  }
  return expanded;
}

if (corpus.schema !== "taxsorted.uk.charities/3") fail("unexpected schema identifier");
if (!corpus.meta || corpus.meta.reviewedOn !== "2026-07-13") {
  fail("meta.reviewedOn must be the reviewed snapshot date 2026-07-13");
}
for (const key of Object.keys(corpus)) {
  if (!expectedTopLevel.has(key)) fail(`unexpected top-level key: ${key}`);
}
for (const key of expectedTopLevel) {
  if (!Object.hasOwn(corpus, key)) fail(`missing top-level key: ${key}`);
}
for (const name of collectionNames) {
  if (!Array.isArray(corpus[name]) || corpus[name].length === 0) {
    fail(`${name} must be a non-empty array`);
  }
}
for (const forbidden of ["organisations", "people", "trustees", "grantRecipients"]) {
  if (Object.hasOwn(corpus, forbidden)) fail(`forbidden top-level collection: ${forbidden}`);
}

const allItems = collectionNames.flatMap((name) => corpus[name] ?? []);
const allIds = new Set();
for (const item of allItems) {
  if (!idPattern.test(item.id ?? "")) fail(`invalid id: ${item.id ?? "(missing)"}`);
  if (allIds.has(item.id)) fail(`duplicate id: ${item.id}`);
  allIds.add(item.id);
}

const sourceIds = new Set(corpus.sources.map((item) => item.id));
const sourcesById = new Map(corpus.sources.map((item) => [item.id, item]));
const sourceUrls = new Set();
for (const source of corpus.sources) {
  if (!source.url?.startsWith("https://")) fail(`${source.id} source URL must use HTTPS`);
  if (sourceUrls.has(source.url)) fail(`duplicate source URL: ${source.url}`);
  sourceUrls.add(source.url);
  for (const field of ["reviewedOn", "reviewAfter"]) {
    if (!isCalendarDate(source[field])) fail(`${source.id} has invalid ${field}`);
  }
  if (source.lastUpdated && !isCalendarDate(source.lastUpdated)) {
    fail(`${source.id} has invalid lastUpdated`);
  }
  if (source.reviewAfter < source.reviewedOn) fail(`${source.id} reviewAfter precedes reviewedOn`);
  if (source.reviewedOn > corpus.meta.reviewedOn) fail(`${source.id} reviewed after corpus`);
  if (source.lastUpdated && source.lastUpdated > corpus.meta.reviewedOn) {
    fail(`${source.id} lastUpdated after corpus review date`);
  }
  unique(source.id, source.jurisdictions ?? [], "jurisdiction");
}

const contentItems = collectionNames.slice(1).flatMap((name) => corpus[name] ?? []);
for (const item of contentItems) {
  requireNonBlank(item.id, item.name, "name");
  requireNonBlankArray(item.id, item.jurisdictions, "jurisdictions");
  if (!Array.isArray(item.sourceIds) || item.sourceIds.length === 0) {
    fail(`${item.id} needs sourceIds`);
    continue;
  }
  if (!Array.isArray(item.evidence) || item.evidence.length === 0) {
    fail(`${item.id} needs evidence`);
    continue;
  }
  unique(item.id, item.sourceIds, "sourceId");
  unique(item.id, item.jurisdictions ?? [], "jurisdiction");
  for (const sourceId of item.sourceIds) {
    if (!sourceIds.has(sourceId)) fail(`${item.id} refers to unknown source: ${sourceId}`);
    if (!item.evidence.some((entry) => entry.sourceId === sourceId)) {
      fail(`${item.id} source has no field evidence: ${sourceId}`);
    }
  }
  for (const entry of item.evidence) {
    requireNonBlank(item.id, entry.sourceId, "evidence sourceId");
    requireNonBlank(item.id, entry.locator, "evidence locator");
    if (!evidenceMethods.has(entry.method)) {
      fail(`${item.id} has unknown evidence method: ${entry.method}`);
    }
    if (!Array.isArray(entry.fields) || entry.fields.length === 0) {
      fail(`${item.id} evidence needs fields`);
      continue;
    }
    if (!sourceIds.has(entry.sourceId)) {
      fail(`${item.id} evidence refers to unknown source: ${entry.sourceId}`);
    }
    if (!item.sourceIds.includes(entry.sourceId)) {
      fail(`${item.id} evidence source missing from sourceIds: ${entry.sourceId}`);
    }
    if (!isCalendarDate(entry.observedOn) || entry.observedOn > corpus.meta.reviewedOn) {
      fail(`${item.id} has invalid or future evidence observedOn: ${entry.observedOn}`);
    }
    const evidenceSource = sourcesById.get(entry.sourceId);
    if (evidenceSource && entry.observedOn > evidenceSource.reviewedOn) {
      fail(`${item.id} evidence observed after source review: ${entry.sourceId} ${entry.observedOn}`);
    }
    unique(item.id, entry.fields, "evidence field pointer");
    for (const pointer of entry.fields) {
      if (typeof pointer !== "string" || !pointer.startsWith("/")) {
        fail(`${item.id} has invalid JSON pointer: ${pointer}`);
        continue;
      }
      const root = pointer.slice(1).split("/", 1)[0];
      if (root === "sourceIds" || root === "evidence") {
        fail(`${item.id} evidence points into provenance metadata: ${pointer}`);
      }
      if (!pointerExists(item, pointer)) fail(`${item.id} pointer does not exist: ${pointer}`);
    }
  }
  const declared = expandJurisdictions(item.jurisdictions ?? []);
  const supported = expandJurisdictions(
    item.sourceIds.flatMap((sourceId) => sourcesById.get(sourceId)?.jurisdictions ?? [])
  );
  for (const jurisdiction of declared) {
    if (!supported.has(jurisdiction)) {
      fail(`${item.id} lacks source coverage for jurisdiction: ${jurisdiction}`);
    }
  }
}

const known = {
  regulator: new Set(corpus.regulators.map((item) => item.id)),
  register: new Set(corpus.registers.map((item) => item.id)),
  legalForm: new Set(corpus.legalForms.map((item) => item.id)),
  taxTreatment: new Set(corpus.taxTreatments.map((item) => item.id)),
  taxRule: new Set(corpus.taxRules.map((item) => item.id)),
  officialProcedure: new Set(corpus.officialProcedures.map((item) => item.id)),
  pipelineStage: new Set(corpus.pipelineStages.map((item) => item.id)),
  corpusItem: allIds,
};
for (const [label, actual, expected] of [
  ["tax rule", known.taxRule, admittedTaxRuleIds],
  ["official procedure", known.officialProcedure, admittedOfficialProcedureIds],
]) {
  for (const expectedId of expected) {
    if (!actual.has(expectedId)) fail(`missing admitted ${label}: ${expectedId}`);
  }
  for (const actualId of actual) {
    if (!expected.has(actualId)) fail(`unadmitted ${label}: ${actualId}`);
  }
}
function refs(owner, values, target, label) {
  unique(owner, values, `${label} reference`);
  for (const value of values) {
    if (!target.has(value)) fail(`${owner} refers to unknown ${label}: ${value}`);
  }
}
for (const item of corpus.registers) refs(item.id, item.regulatorIds, known.regulator, "regulator");
for (const item of corpus.legalForms) refs(item.id, item.regulatorIds, known.regulator, "regulator");
for (const item of corpus.obligations) refs(item.id, item.regulatorIds, known.regulator, "regulator");
for (const item of corpus.fundingMechanisms) {
  refs(item.id, item.taxTreatmentIds, known.taxTreatment, "tax treatment");
}
const exactPrimaryLawUrl = /^https:\/\/www\.legislation\.gov\.uk\/(?:ukpga|uksi|ukla|asp|asc|anaw|nia|nisi)\/[^?#]+\/(?:section|regulation|article|rule|schedule\/[^/]+\/paragraph)\/[^/?#]+(?:\/[^?#]+)*$/;
function authoritySelectorUrl(selector) {
  if (!selector) return "";
  const root = `https://www.legislation.gov.uk/${selector.legislationClass}/${selector.year}/${selector.number}`;
  return selector.kind === "section"
    ? `${root}/section/${selector.section}`
    : `${root}/schedule/${selector.schedule}/paragraph/${selector.paragraph}`;
}
function authorityDisplayCitation(sourceTitle, selector) {
  if (!isNonBlank(sourceTitle) || !selector) return null;
  const marker = selector.kind === "section" ? ", section " : ", Schedule ";
  const markerIndex = sourceTitle.indexOf(marker);
  if (markerIndex <= 0) return null;
  const instrumentTitle = sourceTitle.slice(0, markerIndex);
  return selector.kind === "section"
    ? `${instrumentTitle} s ${selector.section}`
    : `${instrumentTitle} Sch ${selector.schedule} para ${selector.paragraph}`;
}
function taxpayerFamily(value) {
  if (value === "charity-cross-tax") return "cross";
  return value.startsWith("charitable-trust-") ? "trust" : "company";
}
function compatibleTaxpayerClasses(left, right) {
  const leftFamily = taxpayerFamily(left);
  const rightFamily = taxpayerFamily(right);
  return leftFamily === "cross" || rightFamily === "cross" || leftFamily === rightFamily;
}
function expectedTaxTypesForClass(taxpayerClass) {
  if (taxpayerClass === "charity-cross-tax") return null;
  if (taxpayerClass === "charitable-trust-income-tax") return ["income-tax"];
  if (taxpayerClass === "charitable-trust-capital-gains-tax") return ["capital-gains-tax"];
  if (taxpayerClass === "charitable-trust-income-and-capital-gains-tax") {
    return ["income-tax", "capital-gains-tax"];
  }
  return ["corporation-tax"];
}
function sameStringSet(left, right) {
  return [...left].sort().join("\u0000") === [...right].sort().join("\u0000");
}
const reasoningStepByTreatmentPointer = new Map([
  ["/taxType", "classification"],
  ["/position", "classification"],
  ["/eligibility", "conditions"],
  ["/conditions", "conditions"],
  ["/benefit", "effects"],
  ["/whenTaxOrClawbackCanArise", "effects"],
  ["/reasoningStatus", "source-reading"],
  ["/reasoning", "source-reading"],
  ["/notEquivalentTo", "source-reading"],
]);
for (const item of corpus.taxRules) {
  requireSubstantiveEvidenceCoverage(item);
  requireEvidenceMethod(item, "/authoritySelector", "derived-exact-id-mapping");
  requireEvidenceMethod(item, "/explanationScope", "editorial-analysis");
  requireEvidenceMethod(item, "/summaryAuthority", "editorial-analysis");
  requireOwnFields(item.id, item, [
    "taxTreatmentId", "treatmentFieldPointers", "reasoningStepIds", "citation",
    "authoritySourceId", "authoritySelector", "administeredByRegulatorIds",
    "taxpayerClass", "taxTypes", "explanationScope", "ruleRole", "ruleSummary",
    "summaryAuthority", "applicabilityConditions", "effectiveFrom", "effectiveTo",
    "temporalStatus", "temporalApplicability", "doesNotProve",
  ]);
  requireNonBlankArray(item.id, item.treatmentFieldPointers, "treatmentFieldPointers");
  requireNonBlankArray(item.id, item.reasoningStepIds, "reasoningStepIds");
  requireNonBlankArray(item.id, item.administeredByRegulatorIds, "administeredByRegulatorIds");
  requireNonBlankArray(item.id, item.taxTypes, "taxTypes");
  requireNonBlankArray(item.id, item.applicabilityConditions, "applicabilityConditions");
  requireNonBlankArray(item.id, item.doesNotProve, "doesNotProve");
  if (Object.hasOwn(item, "relatedTaxTreatmentIds")) {
    requireNonBlankArray(item.id, item.relatedTaxTreatmentIds, "relatedTaxTreatmentIds", true);
  }
  for (const [field, value] of [
    ["citation", item.citation],
    ["authoritySourceId", item.authoritySourceId],
    ["ruleSummary", item.ruleSummary],
    ["summaryAuthority", item.summaryAuthority],
  ]) {
    requireNonBlank(item.id, value, field);
  }
  validateAuthoritySelector(item.id, item.authoritySelector);
  validateTemporalApplicability(item.id, item.temporalApplicability);
  const admittedAuthority = admittedTaxRuleAuthorityById.get(item.id);
  if (
    !admittedAuthority
    || item.authoritySourceId !== admittedAuthority.authoritySourceId
    || item.citation !== admittedAuthority.citation
    || item.authoritySelector?.kind !== admittedAuthority.selector.kind
    || item.authoritySelector?.legislationClass !== admittedAuthority.selector.legislationClass
    || item.authoritySelector?.year !== admittedAuthority.selector.year
    || item.authoritySelector?.number !== admittedAuthority.selector.number
    || item.authoritySelector?.section !== admittedAuthority.selector.section
  ) {
    fail(`${item.id} authority does not match its admitted rule identity`);
  }
  for (const field of ["effectiveFrom", "effectiveTo"]) {
    if (item[field] !== null && !isCalendarDate(item[field])) {
      fail(`${item.id} has invalid ${field}`);
    }
  }
  valuesIn(item.id, item.taxTypes, taxTypes, "tax type");
  valuesIn(
    item.id,
    item.treatmentFieldPointers,
    treatmentFieldPointers,
    "treatment field pointer",
  );
  if (!taxpayerClasses.has(item.taxpayerClass)) {
    fail(`${item.id} has unknown taxpayer class: ${item.taxpayerClass}`);
  }
  if (!explanationScopes.has(item.explanationScope)) {
    fail(`${item.id} has unknown explanation scope: ${item.explanationScope}`);
  }
  if (!ruleRoles.has(item.ruleRole)) fail(`${item.id} has unknown rule role: ${item.ruleRole}`);
  if (!temporalStatuses.has(item.temporalStatus)) {
    fail(`${item.id} has unknown temporal status: ${item.temporalStatus}`);
  }
  if (item.summaryAuthority !== "taxsorted-analysis-of-primary-law") {
    fail(`${item.id} loses its summary-authority label`);
  }
  requireOwnFields(item.id, item.authoritySelector ?? {}, [
    "kind", "legislationClass", "year", "number",
    ...(item.authoritySelector?.kind === "schedule-paragraph"
      ? ["schedule", "paragraph"]
      : ["section"]),
  ]);
  requireOwnFields(item.id, item.temporalApplicability ?? {}, [
    "basis", "eventType", "startsOnOrAfter", "endsBefore", "legacyContractSignedBefore",
    "legacyContractMustNotBeVariedOnOrAfter", "transitionAuthoritySourceIds",
  ]);
  if (item.taxTreatmentId !== "tax-non-charitable-expenditure") {
    fail(`${item.id} is outside the admitted non-charitable-expenditure treatment`);
  }
  refs(item.id, [item.taxTreatmentId], known.taxTreatment, "tax treatment");
  refs(item.id, item.relatedTaxTreatmentIds ?? [], known.taxTreatment, "related tax treatment");
  unique(item.id, item.relatedTaxTreatmentIds ?? [], "related tax treatment");
  if ((item.relatedTaxTreatmentIds ?? []).includes(item.taxTreatmentId)) {
    fail(`${item.id} repeats its primary tax treatment as a related treatment`);
  }
  refs(item.id, item.administeredByRegulatorIds, known.regulator, "administering regulator");
  for (const regulatorId of item.administeredByRegulatorIds) {
    const regulator = corpus.regulators.find((candidate) => candidate.id === regulatorId);
    if (regulator && regulator.kind !== "tax-authority") {
      fail(`${item.id} administrator is not a tax authority: ${regulatorId}`);
    }
  }
  const treatment = corpus.taxTreatments.find((candidate) => candidate.id === item.taxTreatmentId);
  unique(item.id, item.treatmentFieldPointers ?? [], "treatment field pointer");
  unique(item.id, item.reasoningStepIds ?? [], "reasoning step");
  for (const pointer of item.treatmentFieldPointers ?? []) {
    if (!treatment || !pointerExists(treatment, pointer)) {
      fail(`${item.id} points to a missing treatment field: ${pointer}`);
    }
    const expectedStep = reasoningStepByTreatmentPointer.get(pointer);
    if (expectedStep && !(item.reasoningStepIds ?? []).includes(expectedStep)) {
      fail(`${item.id} omits reasoning step ${expectedStep} for ${pointer}`);
    }
  }
  const expectedSteps = new Set(
    (item.treatmentFieldPointers ?? []).flatMap((pointer) => {
      const step = reasoningStepByTreatmentPointer.get(pointer);
      return step ? [step] : [];
    })
  );
  for (const step of item.reasoningStepIds ?? []) {
    if (!expectedSteps.has(step)) {
      fail(`${item.id} declares unused reasoning step: ${step}`);
    }
  }
  const authority = sourcesById.get(item.authoritySourceId);
  if (!item.sourceIds.includes(item.authoritySourceId)) {
    fail(`${item.id} authority source missing from sourceIds: ${item.authoritySourceId}`);
  }
  if (
    !authority || authority.authorityLevel !== "primary-law" ||
    authority.status !== "current" || authority.reuseStatus !== "confirmed" ||
    authority.publicationMode !== "metadata-only" ||
    authority.publisher !== "legislation.gov.uk" || !exactPrimaryLawUrl.test(authority.url)
  ) {
    fail(`${item.id} authority is not an exact current primary-law provision`);
  }
  if (
    admittedAuthority
    && authority
    && !authority.title.startsWith(admittedAuthority.sourceTitlePrefix)
  ) {
    fail(`${item.id} authority title does not match its admitted rule identity`);
  }
  if (authority?.url !== authoritySelectorUrl(item.authoritySelector)) {
    fail(`${item.id} citation does not identify its exact authority source`);
  }
  const expectedCitation = authority
    ? authorityDisplayCitation(authority.title, item.authoritySelector)
    : null;
  if (!expectedCitation || item.citation !== expectedCitation) {
    fail(`${item.id} display citation conflicts with its machine authority selector`);
  }
  unique(item.id, item.taxTypes ?? [], "tax type");
  const expectedTaxTypes = expectedTaxTypesForClass(item.taxpayerClass);
  if (expectedTaxTypes && !sameStringSet(item.taxTypes ?? [], expectedTaxTypes)) {
    fail(`${item.id} tax types conflict with its taxpayer class`);
  }
  refs(
    item.id,
    item.temporalApplicability?.transitionAuthoritySourceIds ?? [],
    sourceIds,
    "transition authority source",
  );
  for (const sourceId of item.temporalApplicability?.transitionAuthoritySourceIds ?? []) {
    if (!item.sourceIds.includes(sourceId)) {
      fail(`${item.id} transition authority is missing from sourceIds: ${sourceId}`);
    }
  }
  if (
    (item.citation?.startsWith("Income Tax Act ") && taxpayerFamily(item.taxpayerClass) !== "trust") ||
    (item.citation?.startsWith("Corporation Tax Act ") && item.taxpayerClass !== "charitable-company-corporation-tax")
  ) {
    fail(`${item.id} taxpayer class conflicts with its cited instrument`);
  }
  if (item.effectiveFrom && item.effectiveTo && item.effectiveFrom > item.effectiveTo) {
    fail(`${item.id} effectiveFrom is after effectiveTo`);
  }
}
for (const item of corpus.financeDisclosures) refs(item.id, item.registerIds, known.register, "register");
for (const item of corpus.controlModels) refs(item.id, item.legalFormIds, known.legalForm, "legal form");
for (const item of corpus.helpRoutes) {
  refs(item.id, item.registerIds, known.register, "register");
  refs(item.id, item.regulatorIds, known.regulator, "regulator");
  if (!item.serviceUrl?.startsWith("https://")) fail(`${item.id} serviceUrl must use HTTPS`);
}
for (const item of corpus.officialProcedures) {
  requireSubstantiveEvidenceCoverage(item);
  requireEvidenceMethod(item, "/summaryAuthority", "editorial-analysis");
  requireEvidenceMethod(item, "/applicability", "editorial-analysis");
  requireEvidenceMethod(item, "/nextProcedureMeaning", "editorial-analysis");
  requireOwnFields(item.id, item, [
    "taxTreatmentId", "treatmentFieldPointers", "taxpayerClass", "taxTypes",
    "procedureStage", "procedureType", "graphNodeKind", "performedByRoles", "trigger",
    "summaryAuthority", "applicability", "requiredCaseSelectors", "steps", "timeLimit",
    "paymentEffect", "possibleOutcomes", "administeredByRegulatorIds",
    "handledByRegulatorIds", "decisionByRegulatorIds", "taxRuleIds", "nextProcedureIds",
    "nextProcedureMeaning", "challengeMode", "legalBasisSourceIds", "doesNotProve",
  ]);
  for (const [field, values] of [
    ["treatmentFieldPointers", item.treatmentFieldPointers],
    ["taxTypes", item.taxTypes],
    ["performedByRoles", item.performedByRoles],
    ["requiredCaseSelectors", item.requiredCaseSelectors],
    ["steps", item.steps],
    ["possibleOutcomes", item.possibleOutcomes],
    ["administeredByRegulatorIds", item.administeredByRegulatorIds],
    ["handledByRegulatorIds", item.handledByRegulatorIds],
    ["legalBasisSourceIds", item.legalBasisSourceIds],
    ["doesNotProve", item.doesNotProve],
  ]) {
    requireNonBlankArray(item.id, values, field);
  }
  for (const [field, values] of [
    ["decisionByRegulatorIds", item.decisionByRegulatorIds],
    ["taxRuleIds", item.taxRuleIds],
    ["nextProcedureIds", item.nextProcedureIds],
  ]) {
    requireNonBlankArray(item.id, values, field, true);
  }
  for (const [field, value] of [
    ["trigger", item.trigger],
    ["timeLimit", item.timeLimit],
    ["paymentEffect", item.paymentEffect],
  ]) {
    requireNonBlank(item.id, value, field);
  }
  valuesIn(item.id, item.taxTypes, taxTypes, "tax type");
  valuesIn(
    item.id,
    item.treatmentFieldPointers,
    treatmentFieldPointers,
    "treatment field pointer",
  );
  valuesIn(item.id, item.performedByRoles, procedureActorRoles, "performed-by role");
  valuesIn(item.id, item.requiredCaseSelectors, procedureSelectors, "case selector");
  if (!taxpayerClasses.has(item.taxpayerClass)) {
    fail(`${item.id} has unknown taxpayer class: ${item.taxpayerClass}`);
  }
  if (!procedureTypes.has(item.procedureType)) {
    fail(`${item.id} has unknown procedure type: ${item.procedureType}`);
  }
  if (!procedureStages.has(item.procedureStage)) {
    fail(`${item.id} has unknown procedure stage: ${item.procedureStage}`);
  }
  if (!["process", "route", "consequence"].includes(item.graphNodeKind)) {
    fail(`${item.id} has unknown graph node kind: ${item.graphNodeKind}`);
  }
  if (!procedureChallengeModes.has(item.challengeMode)) {
    fail(`${item.id} has unknown challenge mode: ${item.challengeMode}`);
  }
  if (item.summaryAuthority !== "taxsorted-analysis-of-primary-law") {
    fail(`${item.id} loses its summary-authority label`);
  }
  if (item.applicability !== "conditional-sector-map-case-selection-required") {
    fail(`${item.id} loses its case-selection applicability guardrail`);
  }
  const expectedTreatment = admittedOfficialProcedureTreatmentById.get(item.id);
  if (expectedTreatment && item.taxTreatmentId !== expectedTreatment) {
    fail(`${item.id} uses ${item.taxTreatmentId}; admitted treatment is ${expectedTreatment}`);
  }
  const expectedLegalBasisSourceIds = admittedOfficialProcedureLegalBasisById.get(item.id);
  if (
    !expectedLegalBasisSourceIds
    || !sameStringSet(item.legalBasisSourceIds ?? [], expectedLegalBasisSourceIds)
  ) {
    fail(`${item.id} legal bases do not match its admitted procedure identity`);
  }
  refs(item.id, [item.taxTreatmentId], known.taxTreatment, "tax treatment");
  refs(item.id, item.taxRuleIds, known.taxRule, "tax rule");
  refs(item.id, item.nextProcedureIds, known.officialProcedure, "official procedure");
  refs(item.id, item.administeredByRegulatorIds, known.regulator, "administering regulator");
  refs(item.id, item.handledByRegulatorIds, known.regulator, "handling regulator");
  refs(item.id, item.decisionByRegulatorIds, known.regulator, "decision regulator");
  for (const [role, regulatorIds] of [
    ["administering", item.administeredByRegulatorIds],
    ["handling", item.handledByRegulatorIds],
  ]) {
    if (regulatorIds.length === 0) fail(`${item.id} has no ${role} regulator`);
  }
  for (const regulatorId of item.administeredByRegulatorIds) {
    const regulator = corpus.regulators.find((candidate) => candidate.id === regulatorId);
    if (regulator && !["tax-authority", "tribunal"].includes(regulator.kind)) {
      fail(`${item.id} administrator is not a tax authority or tribunal: ${regulatorId}`);
    }
  }
  for (const regulatorId of item.decisionByRegulatorIds) {
    const regulator = corpus.regulators.find((candidate) => candidate.id === regulatorId);
    if (regulator && !["tax-authority", "tribunal"].includes(regulator.kind)) {
      fail(`${item.id} decision regulator is not a tax authority or tribunal: ${regulatorId}`);
    }
  }
  unique(item.id, item.taxTypes ?? [], "tax type");
  unique(item.id, item.performedByRoles ?? [], "performed-by role");
  unique(item.id, item.legalBasisSourceIds ?? [], "legal-basis source");
  const expectedTaxTypes = expectedTaxTypesForClass(item.taxpayerClass);
  if (expectedTaxTypes && !sameStringSet(item.taxTypes ?? [], expectedTaxTypes)) {
    fail(`${item.id} tax types conflict with its taxpayer class`);
  }
  const hasTribunalDecision = item.decisionByRegulatorIds.some((regulatorId) =>
    corpus.regulators.find((candidate) => candidate.id === regulatorId)?.kind === "tribunal"
  );
  if (item.performedByRoles.includes("tribunal") !== hasTribunalDecision) {
    fail(`${item.id} tribunal role and tribunal decision regulator do not align`);
  }
  if (item.nextProcedureMeaning !== "possible-not-mandatory") {
    fail(`${item.id} loses the possible-next semantic guardrail`);
  }
  const treatment = corpus.taxTreatments.find((candidate) => candidate.id === item.taxTreatmentId);
  unique(item.id, item.treatmentFieldPointers ?? [], "treatment field pointer");
  for (const pointer of item.treatmentFieldPointers ?? []) {
    if (!treatment || !pointerExists(treatment, pointer)) {
      fail(`${item.id} points to a missing treatment field: ${pointer}`);
    }
  }
  unique(item.id, item.requiredCaseSelectors ?? [], "required case selector");
  const minimumSelectors = [
    "taxpayer-class",
    "tax-type",
    "tax-period",
    "jurisdiction",
    "document-or-decision-type",
  ];
  for (const selector of minimumSelectors) {
    if (!item.requiredCaseSelectors.includes(selector)) {
      fail(`${item.id} omits required case selector: ${selector}`);
    }
  }
  const typeSpecificSelectors = {
    "attribution-specification-determination": [
      "hmrc-requirement-made-date",
      "specification-notice-status",
      "specification-notice-date-if-given",
    ],
    "chargeability-notification": ["notice-to-file-status"],
    "return-and-self-assessment": [
      "notice-to-file-status", "notice-to-file-date", "return-filing-date", "filing-deadline",
    ],
    "taxpayer-return-amendment": ["return-filing-date", "amendment-date"],
    "hmrc-return-correction-and-taxpayer-rejection": [
      "return-filing-date", "hmrc-correction-date", "relevant-deadline",
    ],
    "enquiry-opening": ["return-filing-date", "enquiry-window-end", "enquiry-open-date"],
    "jeopardy-amendment": ["enquiry-open-date"],
    "closure-notice-and-amendment": ["enquiry-open-date", "closure-notice-date"],
    "no-return-determination-and-superseding-return": [
      "notice-to-file-date", "filing-deadline", "return-filing-date", "relevant-deadline",
    ],
    "discovery-assessment": [
      "return-filing-status", "discovery-date", "hmrc-awareness-information-status",
      "loss-of-tax-behaviour", "relevant-deadline",
    ],
    "tax-payment": [
      "payment-due-date", "amount-due", "appeal-status", "payment-status",
      "postponement-decision-status",
    ],
    "appeal-initiation": ["appealable-decision", "decision-notice-date", "appeal-notice-date"],
    "hmrc-review": ["review-offer-or-request-status", "review-conclusion-date"],
    "tribunal-notification": ["tribunal-notification-date"],
    "tribunal-outcome": ["tribunal-notification-date"],
    "payment-postponement": [
      "appealable-decision", "postponement-request-status", "postponement-decision-status",
      "appeal-status", "payment-status",
    ],
    "taking-control-of-goods-recovery": [
      "recovery-territory", "amount-due", "appeal-status", "payment-status",
      "postponement-decision-status",
    ],
    "summary-warrant-recovery": [
      "recovery-territory", "amount-due", "demand-date", "statutory-waiting-period-end",
      "warrant-status", "warrant-date", "appeal-status", "payment-status",
      "postponement-decision-status",
    ],
    "distraint-recovery": [
      "recovery-territory", "amount-due", "demand-date", "neglect-or-refusal-status",
      "control-or-distraint-date", "appeal-status", "payment-status",
      "postponement-decision-status",
    ],
  };
  for (const selector of typeSpecificSelectors[item.procedureType] ?? []) {
    if (!item.requiredCaseSelectors.includes(selector)) {
      fail(`${item.id} omits procedure-specific selector: ${selector}`);
    }
  }
  if (
    item.procedureType === "chargeability-notification" &&
    item.taxpayerClass === "charitable-trust-income-and-capital-gains-tax" &&
    !["tax-year-end", "notice-withdrawal-status", "notice-withdrawal-date-if-withdrawn"]
      .every((selector) => item.requiredCaseSelectors.includes(selector))
  ) {
    fail(`${item.id} omits a trust notification clock selector`);
  }
  if (
    item.procedureType === "chargeability-notification" &&
    item.taxpayerClass === "charitable-company-corporation-tax" &&
    !item.requiredCaseSelectors.includes("accounting-period-end")
  ) {
    fail(`${item.id} omits the company notification clock selector`);
  }
  if (
    item.procedureType === "discovery-assessment" &&
    item.taxpayerClass === "charitable-company-corporation-tax" &&
    !item.requiredCaseSelectors.includes("prevailing-practice-status")
  ) {
    fail(`${item.id} omits the company prevailing-practice selector`);
  }
  const linkedRules = item.taxRuleIds
    .map((ruleId) => corpus.taxRules.find((candidate) => candidate.id === ruleId))
    .filter(Boolean);
  for (const rule of linkedRules) {
    if (
      rule.taxTreatmentId !== item.taxTreatmentId
      || !compatibleTaxpayerClasses(rule.taxpayerClass, item.taxpayerClass)
      || !rule.taxTypes.some((taxType) => item.taxTypes.includes(taxType))
    ) {
      fail(`${item.id} links a tax rule from another treatment or taxpayer class: ${rule.id}`);
    }
  }
  for (const nextProcedureId of item.nextProcedureIds) {
    const nextProcedure = corpus.officialProcedures.find(
      (candidate) => candidate.id === nextProcedureId,
    );
    if (
      nextProcedure &&
      (nextProcedure.taxTreatmentId !== item.taxTreatmentId ||
        !compatibleTaxpayerClasses(nextProcedure.taxpayerClass, item.taxpayerClass) ||
        !nextProcedure.taxTypes.some((taxType) => item.taxTypes.includes(taxType)))
    ) {
      fail(`${item.id} links a next procedure from another treatment or taxpayer class: ${nextProcedure.id}`);
    }
  }
  const linkedAuthoritySourceIds = new Set(linkedRules.map((rule) => rule.authoritySourceId));
  for (const sourceId of linkedAuthoritySourceIds) {
    if (!item.legalBasisSourceIds.includes(sourceId)) {
      fail(`${item.id} omits linked rule authority from legal bases: ${sourceId}`);
    }
  }
  const linkedTreatmentPointers = [...new Set(
    linkedRules.flatMap((rule) => rule.treatmentFieldPointers),
  )].sort();
  const declaredTreatmentPointers = [...item.treatmentFieldPointers].sort();
  if (
    linkedRules.length > 0
    && linkedTreatmentPointers.join("\u0000") !== declaredTreatmentPointers.join("\u0000")
  ) {
    fail(`${item.id} treatment fields do not exactly match linked tax rules`);
  }
  if (item.nextProcedureIds.includes(item.id)) fail(`${item.id} points to itself`);
  for (const sourceId of item.legalBasisSourceIds ?? []) {
    const source = sourcesById.get(sourceId);
    if (!item.sourceIds.includes(sourceId)) {
      fail(`${item.id} legal basis missing from sourceIds: ${sourceId}`);
    }
    if (
      !source || source.authorityLevel !== "primary-law" || source.status !== "current" ||
      source.reuseStatus !== "confirmed" || source.publicationMode !== "metadata-only" ||
      source.publisher !== "legislation.gov.uk" ||
      !exactPrimaryLawUrl.test(source.url)
    ) {
      fail(`${item.id} legal basis is not an exact primary-law provision: ${sourceId}`);
    }
  }
}
const laneOrders = new Set();
for (const item of corpus.pipelineStages) {
  refs(item.id, item.registerIds, known.register, "register");
  refs(item.id, item.nextStageIds, known.pipelineStage, "pipeline stage");
  const laneOrder = `${item.lane}:${item.order}`;
  if (laneOrders.has(laneOrder)) fail(`duplicate pipeline order: ${laneOrder}`);
  laneOrders.add(laneOrder);
  if (item.nextStageIds.includes(item.id)) fail(`${item.id} points to itself`);
}
for (const item of corpus.transparencyGaps) {
  refs(item.id, item.affectedIds, known.corpusItem, "corpus item");
  if (item.temporalApplicability) {
    validateTemporalApplicability(item.id, item.temporalApplicability);
  }
  refs(
    item.id,
    item.temporalApplicability?.transitionAuthoritySourceIds ?? [],
    sourceIds,
    "transition authority source",
  );
  for (const sourceId of item.temporalApplicability?.transitionAuthoritySourceIds ?? []) {
    if (!item.sourceIds.includes(sourceId)) {
      fail(`${item.id} transition authority missing from sourceIds: ${sourceId}`);
    }
  }
}
for (const item of corpus.regulators) {
  if (!item.website?.startsWith("https://")) fail(`${item.id} website must use HTTPS`);
}
for (const item of corpus.registers) {
  if (!item.accessUrl?.startsWith("https://")) fail(`${item.id} accessUrl must use HTTPS`);
}

const exclusionText = corpus.meta.exclusions?.join(" ").toLowerCase() ?? "";
for (const phrase of ["no charity organisation records", "no people", "no inferred beliefs"]) {
  if (!exclusionText.includes(phrase)) fail(`meta exclusions must state: ${phrase}`);
}

if (issues.length) {
  console.error(`UK charities corpus invalid:\n- ${issues.join("\n- ")}`);
  process.exit(1);
}

const counts = collectionNames.map((name) => `${corpus[name].length} ${name}`).join(", ");
console.log(`UK charities corpus OK: ${counts}`);
