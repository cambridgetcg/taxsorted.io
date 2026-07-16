import {
  assertTaxAnswerInvariants,
  type TaxAnswer,
} from "./contract";
import {
  assessMtdIncomeTax,
  type MtdIncomeTaxDecision,
  type MtdIncomeTaxExpertRequest,
} from "./mtd-income-tax";

export const TAX_POSITION_PASSPORT_SCHEMA =
  "taxsorted.uk.tax-position-passport/1" as const;

export const PASSPORT_INCOME_SOURCE_IDS = [
  "employment",
  "self-employment",
  "uk-property",
  "foreign-property",
  "other-or-complex",
] as const;

export type PassportIncomeSourceId =
  (typeof PASSPORT_INCOME_SOURCE_IDS)[number];

export type PassportAnswer = "yes" | "no" | "unknown";

export const PASSPORT_EVIDENCE_IDS = [
  "employment-pay-and-tax",
  "self-employment-return",
  "self-employment-records",
  "uk-property-return",
  "uk-property-records",
  "foreign-property-return",
  "foreign-property-records",
  "mtd-exemption-evidence",
] as const;

export type PassportEvidenceId = (typeof PASSPORT_EVIDENCE_IDS)[number];

export type PassportEvidenceState =
  | "held"
  | "missing"
  | "not-checked"
  | "not-expected";

export interface PassportIncomeSource {
  id: PassportIncomeSourceId;
  answer: PassportAnswer;
  origin: "user";
}

export interface PassportEvidenceReference {
  id: PassportEvidenceId;
  label: string;
  state: PassportEvidenceState;
  assertion: "named-by-user-not-inspected";
  supportsIncomeSourceIds: PassportIncomeSourceId[];
  guidanceHref: string;
}

export interface MtdIncomeTaxPassportPosition {
  kind: "mtd-income-tax-readiness";
  request: MtdIncomeTaxExpertRequest;
  answer: TaxAnswer<MtdIncomeTaxDecision>;
}

export interface TaxPositionPassport {
  schema: typeof TAX_POSITION_PASSPORT_SCHEMA;
  createdAt: string;
  assurance: {
    identityVerified: false;
    signed: false;
    professionallyReviewed: false;
    filed: false;
  };
  dataHandling: {
    generationMode: "browser-local";
    sentToTaxSorted: false;
    storedInBrowser: boolean;
    rawDocumentsIncluded: false;
  };
  profile: {
    jurisdiction: "UK";
    incomeSources: PassportIncomeSource[];
    evidence: PassportEvidenceReference[];
  };
  positions: MtdIncomeTaxPassportPosition[];
  coverage: {
    included: string[];
    excluded: string[];
  };
  userReview: {
    selfCheckedAt: string | null;
    meaning: "checked-by-user-not-professional-approval";
  };
  boundaries: string[];
}

export interface BuildTaxPositionPassportInput {
  createdAt: string;
  storedInBrowser: boolean;
  incomeSources: Record<PassportIncomeSourceId, PassportAnswer>;
  evidence: Record<PassportEvidenceId, PassportEvidenceState>;
  mtdIncomeTaxPosition?: MtdIncomeTaxPassportPosition | null;
  selfCheckedAt?: string | null;
}

interface PassportEvidenceDefinition {
  id: PassportEvidenceId;
  label: string;
  supportsIncomeSourceIds: PassportIncomeSourceId[];
  guidanceHref: string;
}

export const PASSPORT_EVIDENCE_DEFINITIONS = [
  {
    id: "employment-pay-and-tax",
    label: "P45, P60, P11D or other pay-and-tax records",
    supportsIncomeSourceIds: ["employment"],
    guidanceHref:
      "https://www.gov.uk/keeping-your-pay-tax-records/employees-and-limited-company-directors",
  },
  {
    id: "self-employment-return",
    label: "Self Assessment return or calculation showing self-employment income",
    supportsIncomeSourceIds: ["self-employment"],
    guidanceHref:
      "https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax",
  },
  {
    id: "self-employment-records",
    label: "Sales, income, expense and supporting business records",
    supportsIncomeSourceIds: ["self-employment"],
    guidanceHref: "https://www.gov.uk/self-employed-records/what-records-to-keep",
  },
  {
    id: "uk-property-return",
    label: "Self Assessment return or calculation showing UK property income",
    supportsIncomeSourceIds: ["uk-property"],
    guidanceHref:
      "https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax",
  },
  {
    id: "uk-property-records",
    label: "Rent, expense and supporting UK property records",
    supportsIncomeSourceIds: ["uk-property"],
    guidanceHref:
      "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records",
  },
  {
    id: "foreign-property-return",
    label: "Self Assessment return or calculation showing foreign property income",
    supportsIncomeSourceIds: ["foreign-property"],
    guidanceHref:
      "https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax",
  },
  {
    id: "foreign-property-records",
    label: "Rent, expense and supporting foreign property records",
    supportsIncomeSourceIds: ["foreign-property"],
    guidanceHref:
      "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records",
  },
  {
    id: "mtd-exemption-evidence",
    label: "HMRC exemption decision or application evidence, if relevant",
    supportsIncomeSourceIds: [
      "self-employment",
      "uk-property",
      "foreign-property",
    ],
    guidanceHref:
      "https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax",
  },
] as const satisfies readonly PassportEvidenceDefinition[];

const FORBIDDEN_PERSONAL_DATA_KEYS = new Set([
  "address",
  "apikey",
  "bankaccount",
  "email",
  "hmrcbusinessid",
  "name",
  "nino",
  "ownerentityid",
  "ownerentityname",
  "phone",
  "utr",
  "workspaceid",
]);

function assertIsoInstant(value: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new Error(`${label} must be an ISO UTC instant`);
  }
  if (Number.isNaN(new Date(value).getTime())) {
    throw new Error(`${label} is not a real instant`);
  }
}

function assertNoForbiddenPersonalDataKeys(
  value: unknown,
  path = "$",
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenPersonalDataKeys(item, `${path}[${index}]`)
    );
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (FORBIDDEN_PERSONAL_DATA_KEYS.has(normalized)) {
      throw new Error(`Tax Position Passport forbids personal-data key ${path}.${key}`);
    }
    assertNoForbiddenPersonalDataKeys(child, `${path}.${key}`);
  }
}

function evidenceStateFor(
  definition: PassportEvidenceDefinition,
  input: BuildTaxPositionPassportInput,
): PassportEvidenceState {
  if (
    definition.supportsIncomeSourceIds.every(
      (sourceId) => input.incomeSources[sourceId] === "no",
    )
  ) {
    return "not-expected";
  }
  return input.evidence[definition.id];
}

export function assertTaxPositionPassportInvariants(
  passport: TaxPositionPassport,
): void {
  if (passport.schema !== TAX_POSITION_PASSPORT_SCHEMA) {
    throw new Error("Unsupported Tax Position Passport schema");
  }
  if (
    passport.assurance.identityVerified !== false
    || passport.assurance.signed !== false
    || passport.assurance.professionallyReviewed !== false
    || passport.assurance.filed !== false
  ) {
    throw new Error(
      "Passport assurance must remain identity-unverified, unsigned, unreviewed and unfiled",
    );
  }
  if (
    passport.dataHandling.generationMode !== "browser-local"
    || passport.dataHandling.sentToTaxSorted !== false
    || typeof passport.dataHandling.storedInBrowser !== "boolean"
    || passport.dataHandling.rawDocumentsIncluded !== false
  ) {
    throw new Error("Passport data-handling claims are invalid");
  }
  if (
    passport.profile.jurisdiction !== "UK"
    || passport.userReview.meaning
      !== "checked-by-user-not-professional-approval"
  ) {
    throw new Error("Passport jurisdiction or user-review meaning is invalid");
  }
  assertIsoInstant(passport.createdAt, "Passport createdAt");
  if (passport.userReview.selfCheckedAt !== null) {
    assertIsoInstant(passport.userReview.selfCheckedAt, "Passport selfCheckedAt");
  }

  if (
    passport.profile.incomeSources.length
    !== PASSPORT_INCOME_SOURCE_IDS.length
  ) {
    throw new Error("Passport must contain each income-source fact exactly once");
  }
  for (const [index, expectedId] of PASSPORT_INCOME_SOURCE_IDS.entries()) {
    const source = passport.profile.incomeSources[index];
    if (
      source?.id !== expectedId
      || source.origin !== "user"
      || !["yes", "no", "unknown"].includes(source.answer)
    ) {
      throw new Error(
        "Passport income-source facts must use the canonical order and values",
      );
    }
  }

  if (
    passport.profile.evidence.length !== PASSPORT_EVIDENCE_DEFINITIONS.length
  ) {
    throw new Error("Passport must contain each evidence reference exactly once");
  }
  const incomeSources = new Map(
    passport.profile.incomeSources.map((source) => [source.id, source.answer]),
  );
  for (const [index, definition] of PASSPORT_EVIDENCE_DEFINITIONS.entries()) {
    const evidence = passport.profile.evidence[index];
    const supportsMatch =
      evidence?.supportsIncomeSourceIds.length
        === definition.supportsIncomeSourceIds.length
      && definition.supportsIncomeSourceIds.every(
        (sourceId, sourceIndex) =>
          evidence.supportsIncomeSourceIds[sourceIndex] === sourceId,
      );
    const notExpected = definition.supportsIncomeSourceIds.every(
      (sourceId) => incomeSources.get(sourceId) === "no",
    );
    if (
      evidence?.id !== definition.id
      || evidence.label !== definition.label
      || evidence.guidanceHref !== definition.guidanceHref
      || evidence.assertion !== "named-by-user-not-inspected"
      || !["held", "missing", "not-checked", "not-expected"].includes(
        evidence.state,
      )
      || !supportsMatch
      || (notExpected && evidence.state !== "not-expected")
      || (!notExpected && evidence.state === "not-expected")
    ) {
      throw new Error(
        "Passport evidence references must match the canonical definitions and source map",
      );
    }
  }

  if (passport.positions.length > 1) {
    throw new Error("Passport v1 supports at most one MTD Income Tax position");
  }
  for (const position of passport.positions) {
    if (
      position.kind !== "mtd-income-tax-readiness"
      || position.request.schema !== "taxsorted.uk.mtd-income-tax.request/1"
      || position.answer.capability.id !== "uk.mtd-income-tax.readiness"
    ) {
      throw new Error("Passport position request and answer capability do not match");
    }
    assertTaxAnswerInvariants(position.answer);
  }

  assertNoForbiddenPersonalDataKeys(passport);
}

export function buildTaxPositionPassport(
  input: BuildTaxPositionPassportInput,
): TaxPositionPassport {
  const passport: TaxPositionPassport = {
    schema: TAX_POSITION_PASSPORT_SCHEMA,
    createdAt: input.createdAt,
    assurance: {
      identityVerified: false,
      signed: false,
      professionallyReviewed: false,
      filed: false,
    },
    dataHandling: {
      generationMode: "browser-local",
      sentToTaxSorted: false,
      storedInBrowser: input.storedInBrowser,
      rawDocumentsIncluded: false,
    },
    profile: {
      jurisdiction: "UK",
      incomeSources: PASSPORT_INCOME_SOURCE_IDS.map((id) => ({
        id,
        answer: input.incomeSources[id],
        origin: "user" as const,
      })),
      evidence: PASSPORT_EVIDENCE_DEFINITIONS.map((definition) => ({
        ...definition,
        state: evidenceStateFor(definition, input),
        assertion: "named-by-user-not-inspected" as const,
        supportsIncomeSourceIds: [...definition.supportsIncomeSourceIds],
      })),
    },
    positions: input.mtdIncomeTaxPosition
      ? [structuredClone(input.mtdIncomeTaxPosition)]
      : [],
    coverage: {
      included: [
        "User-described employment, self-employment, UK property, foreign property and other-or-complex income-source states",
        "An evidence index that records what the user says they hold without inspecting documents",
        "A complete MTD Income Tax request and TaxAnswer when the browser check has been run",
      ],
      excluded: [
        "Identity verification or a digital signature",
        "PAYE, full Self Assessment or other whole-person liability calculation",
        "Inspection or verification of documents",
        "Professional review, agent authorisation or representation",
        "Submission, filing, payment or any other change to HMRC records",
      ],
    },
    userReview: {
      selfCheckedAt: input.selfCheckedAt ?? null,
      meaning: "checked-by-user-not-professional-approval",
    },
    boundaries: [
      "Unknown is not zero and not-applicable is not the same as missing.",
      "Employment is recorded for context but is not included in MTD qualifying income.",
      "Evidence is named by the user; TaxSorted does not inspect or verify documents.",
      "The MTD request and answer travel together, but an unsigned Passport does not prove that one was derived from the other.",
      "A Tax Position Passport is a handoff aid, not proof of identity, professional approval or authority to act.",
      "Prepared and exported do not mean filed. Nothing in this Passport is sent to HMRC.",
    ],
  };

  assertTaxPositionPassportInvariants(passport);
  return passport;
}

const EXAMPLE_MTD_REQUEST: MtdIncomeTaxExpertRequest = {
  schema: "taxsorted.uk.mtd-income-tax.request/1",
  asOfDate: "2026-07-16",
  person: {
    relevantReturnPosition: "required-and-submitted",
    hadNationalInsuranceNumberAtStartOf2026To27: true,
  },
  income: {
    taxYears: {
      "2024-25": {
        basis: "submitted-return",
        residence: "uk-resident",
        selfEmploymentGrossPence: 5_000_001,
        ukPropertyGrossPence: 0,
        foreignPropertyGrossPence: 0,
      },
      "2025-26": {
        basis: "working-estimate",
        residence: "uk-resident",
        selfEmploymentGrossPence: 4_000_000,
        ukPropertyGrossPence: 0,
        foreignPropertyGrossPence: 0,
      },
      "2026-27": {
        basis: "working-estimate",
        residence: "uk-resident",
        selfEmploymentGrossPence: 3_500_000,
        ukPropertyGrossPence: 0,
        foreignPropertyGrossPence: 0,
      },
    },
    atLeastOneRelevantReturnActivityContinuedAtEntry: true,
    lastRelevantActivityCessationDate: "at-least-one-continues",
    relevantReturnWasAmended: false,
    annualisationOrOtherSpecialRulesMayApply: false,
  },
  exemption: {
    returnIndicators: [],
    digitalExclusion: "not-approved-or-pending",
    otherExemptionApplication: "none",
  },
  reporting: { updatePeriod: "standard" },
};

export const TAX_POSITION_PASSPORT_EXAMPLE = buildTaxPositionPassport({
  createdAt: "2026-07-16T12:00:00.000Z",
  storedInBrowser: false,
  incomeSources: {
    employment: "yes",
    "self-employment": "yes",
    "uk-property": "no",
    "foreign-property": "no",
    "other-or-complex": "no",
  },
  evidence: {
    "employment-pay-and-tax": "held",
    "self-employment-return": "held",
    "self-employment-records": "held",
    "uk-property-return": "not-expected",
    "uk-property-records": "not-expected",
    "foreign-property-return": "not-expected",
    "foreign-property-records": "not-expected",
    "mtd-exemption-evidence": "not-checked",
  },
  mtdIncomeTaxPosition: {
    kind: "mtd-income-tax-readiness",
    request: EXAMPLE_MTD_REQUEST,
    answer: assessMtdIncomeTax(EXAMPLE_MTD_REQUEST, {
      evaluatedOn: "2026-07-16",
    }),
  },
  selfCheckedAt: "2026-07-16T12:00:00.000Z",
});
