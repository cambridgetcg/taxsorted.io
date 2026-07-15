// A source-led map of routes into elected office. It explains current public
// rules and visible friction; it never decides whether a person may stand.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const httpsUrl = z.string().url().refine((value) => value.startsWith("https://"), {
  message: "URL must use HTTPS",
});
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "invalid calendar date");
const nonEmptyStrings = z.array(text).min(1);
const sourceIds = z.array(id).min(1).refine(
  (values) => new Set(values).size === values.length,
  "source references must be unique"
);

const sourceSchema = strictObject({
  id,
  title: text,
  publisher: text,
  url: httpsUrl,
  authorityLevel: z.enum([
    "primary-law",
    "secondary-legislation",
    "official-bill-record",
    "statutory-regulator-guidance",
    "legislature-guidance",
    "government-guidance",
    "official-pay-body",
    "local-government-guidance",
    "local-authority-publication",
  ]),
  status: z.enum(["current", "proposed", "historical", "event-specific", "partly-current"]),
  retrievedAt: date,
  updatedOn: date.optional(),
  appliesTo: nonEmptyStrings,
  supports: nonEmptyStrings,
  limitations: nonEmptyStrings,
});

const journeyStepSchema = strictObject({
  id,
  order: z.number().int().positive(),
  stage: z.enum([
    "discover",
    "check-rules",
    "choose-route",
    "seek-selection",
    "nominate",
    "campaign",
    "poll-and-count",
    "take-office",
    "serve",
  ]),
  title: text,
  whatToDo: nonEmptyStrings,
  outputs: nonEmptyStrings,
  caution: text,
  sourceIds,
});

const candidateRouteSchema = strictObject({
  id,
  kind: z.enum(["registered-party", "independent"]),
  title: text,
  description: text,
  requirements: nonEmptyStrings,
  tradeoffs: nonEmptyStrings,
  sourceIds,
});

const currentRuleSchema = strictObject({
  id,
  title: text,
  plainLanguage: text,
  appliesAt: z.enum([
    "nomination",
    "poll",
    "nomination-and-poll",
    "throughout-candidacy",
    "on-election",
    "while-in-office",
  ]),
  status: z.literal("current-law"),
  seekAdviceWhen: text,
  sourceIds,
});

const nominationDocumentSchema = strictObject({
  id,
  name: text,
  required: z.boolean(),
  originalNormallyRequired: z.boolean(),
  deliveryExceptions: z.array(text),
  note: text,
});

const subscriberSchema = strictObject({
  count: z.number().int().nonnegative(),
  register: text,
  geography: text,
  roles: nonEmptyStrings,
  limits: nonEmptyStrings,
  sourceIds,
});

const returnedWhenSchema = strictObject({
  comparison: z.literal("greater-than"),
  percentage: z.number().positive().max(100),
  denominator: text,
  plainLanguage: text,
});

const depositSchema = z.discriminatedUnion("applicable", [
  strictObject({
    applicable: z.literal(true),
    amountMinor: z.number().int().positive(),
    currency: z.literal("GBP"),
    dueExpression: text,
    returnedWhen: returnedWhenSchema,
    note: text,
    sourceIds,
  }),
  strictObject({
    applicable: z.literal(false),
    amountMinor: z.null(),
    currency: z.null(),
    dueExpression: z.null(),
    returnedWhen: z.null(),
    note: text,
    sourceIds,
  }),
]);

const nominationSchema = strictObject({
  summary: text,
  deadlineExpression: text,
  eventDateRule: text,
  documents: z.array(nominationDocumentSchema).min(1),
  delivery: nonEmptyStrings,
  consentTiming: text,
  subscribers: subscriberSchema,
  deposit: depositSchema,
  partyIdentity: strictObject({
    registeredParty: text,
    independent: text,
    emblem: text,
  }),
  sourceIds,
});

const agentSchema = strictObject({
  mandatory: z.literal(true),
  defaultWhenNoneAppointed: text,
  appointmentDeadlineExpression: text,
  responsibilities: nonEmptyStrings,
  addressRequirement: text,
  ineligiblePeople: nonEmptyStrings,
  privacyNote: text,
  sourceIds,
});

const spendingRateSchema = strictObject({
  when: text,
  amountMinorPerElector: z.number().int().nonnegative(),
});

const jointCandidateAdjustmentSchema = strictObject({
  jointCandidateCount: z.number().int().min(2),
  reductionFraction: text,
});

const spendingLimitSchema = strictObject({
  currency: z.literal("GBP"),
  moneyUnit: z.literal("minor"),
  expression: text,
  baseMinor: z.number().int().nonnegative(),
  rates: z.array(spendingRateSchema).min(1),
  electorateDatum: text,
  jointCandidateAdjustments: z.array(jointCandidateAdjustmentSchema),
  warning: text,
  sourceIds,
});

const donationSchema = strictObject({
  currency: z.literal("GBP"),
  thresholdMinor: z.number().int().nonnegative(),
  comparator: z.literal("greater-than"),
  controlledRule: text,
  underThresholdRule: text,
  permissibleSources: nonEmptyStrings,
  checkingPeriodDays: z.number().int().positive(),
  impermissibleDonationAction: text,
  sourceIds,
});

const financeDeadlineSchema = strictObject({
  id,
  responsibleRole: z.enum(["candidate", "agent"]),
  trigger: text,
  due: text,
  nilReturnRequired: z.boolean(),
  sourceIds,
});

const financeSchema = strictObject({
  regulatedPeriod: text,
  spendingLimit: spendingLimitSchema,
  donations: donationSchema,
  reportingDeadlines: z.array(financeDeadlineSchema).min(1),
  enforcement: nonEmptyStrings,
  sourceIds,
});

const takingOfficeStepSchema = strictObject({
  order: z.number().int().positive(),
  action: text,
  deadline: text,
  consequence: text,
  sourceIds,
});

const remunerationSchema = z.discriminatedUnion("kind", [
  strictObject({
    kind: z.literal("national-salary"),
    currency: z.literal("GBP"),
    amountMinor: z.number().int().positive(),
    period: z.literal("year"),
    effectiveFrom: date,
    setter: text,
    description: text,
    businessCosts: text,
    taxTreatment: text,
    examples: z.tuple([]),
    sourceIds,
  }),
  strictObject({
    kind: z.literal("local-allowance-scheme"),
    currency: z.literal("GBP"),
    amountMinor: z.null(),
    period: z.literal("year"),
    effectiveFrom: z.null(),
    setter: text,
    description: text,
    businessCosts: text,
    taxTreatment: text,
    examples: z.array(
      strictObject({
        authority: text,
        financialYear: text,
        basicAllowanceMinor: z.number().int().nonnegative(),
        sourceIds,
      })
    ).min(1),
    sourceIds,
  }),
]);

const officeObligationSchema = strictObject({
  id,
  trigger: text,
  action: text,
  deadline: text,
  consequence: text,
  oversight: text,
  sourceIds,
});

const officialContactSchema = strictObject({
  id,
  label: text,
  organisation: text,
  role: text,
  url: httpsUrl,
  scope: text,
  sourceIds,
});

export const publicOfficePathSchema = strictObject({
  id,
  coverageStatus: z.literal("deep"),
  currentLawAsAt: date,
  identity: strictObject({
    name: text,
    officeType: z.enum(["uk-parliamentary-representative", "principal-local-councillor"]),
    jurisdiction: text,
    contestGeography: text,
    electoralSystem: text,
    administratorRoles: nonEmptyStrings,
    term: text,
  }),
  summary: text,
  routes: z.array(candidateRouteSchema).min(2),
  eligibility: strictObject({
    minimumAge: z.number().int().min(18),
    citizenship: nonEmptyStrings,
    localConnection: text,
    rules: z.array(currentRuleSchema).min(1),
    disqualifications: z.array(currentRuleSchema).min(1),
    evaluation: strictObject({
      allowedOutcomes: z.tuple([
        z.literal("eligible"),
        z.literal("ineligible"),
        z.literal("uncertain"),
      ]),
      method: text,
      warning: text,
    }),
  }),
  nomination: nominationSchema,
  agent: agentSchema,
  finance: financeSchema,
  takingOffice: z.array(takingOfficeStepSchema).min(1),
  remuneration: remunerationSchema,
  officeObligations: z.array(officeObligationSchema).min(1),
  contacts: z.array(officialContactSchema).min(1),
  supportRouteIds: z.array(id).min(1),
  barrierIds: z.array(id).min(1),
  sourceIds,
  notLegalAdvice: text,
});

const supportRouteSchema = strictObject({
  id,
  title: text,
  provider: text,
  availability: z.enum(["free-public", "party-controlled", "local-event-specific"]),
  purpose: text,
  helpsWith: nonEmptyStrings,
  access: text,
  limitation: text,
  officePathIds: z.array(id).min(1),
  sourceIds,
});

const barrierSchema = strictObject({
  id,
  title: text,
  kind: z.enum([
    "legal-complexity",
    "financial",
    "time-and-administration",
    "party-selection",
    "local-variation",
    "disclosure-and-privacy",
    "safety-and-abuse",
    "access-and-support",
  ]),
  mechanism: text,
  intendedSafeguard: text,
  burden: nonEmptyStrings,
  lawfulLowFrictionRoutes: nonEmptyStrings,
  doesNotMean: text,
  officePathIds: z.array(id).min(1),
  supportRouteIds: z.array(id),
  sourceIds,
});

const coverageGapSchema = strictObject({
  id,
  title: text,
  status: z.enum([
    "intentionally-not-generalised",
    "event-data-not-loaded",
    "source-update-needed",
  ]),
  officeTypes: nonEmptyStrings,
  whySeparate: text,
  safeFallback: text,
  sourceIds,
});

const legalWatchSchema = strictObject({
  id,
  title: text,
  status: z.enum(["proposed", "enacted-commencement-dependent", "event-dependent"]),
  checkedOn: date,
  affects: nonEmptyStrings,
  possibleChanges: nonEmptyStrings,
  currentLawImpact: text,
  activateOnlyWhen: text,
  possibleEffectiveFrom: date.nullable(),
  possibleRetrospectiveAnchor: date.nullable(),
  sourceIds,
});

export const publicOfficePathwaysSchema = strictObject({
  schema: z.literal("taxsorted.uk.public-office-pathways/1"),
  meta: strictObject({
    title: text,
    version: text,
    retrievedAt: date,
    lawAsAt: date,
    jurisdiction: z.literal("United Kingdom"),
    coverage: nonEmptyStrings,
    exclusions: nonEmptyStrings,
    editorialRules: nonEmptyStrings,
    personalisedDecisionPolicy: text,
    warning: text,
  }),
  sources: z.array(sourceSchema).min(1),
  sharedJourney: strictObject({
    summary: text,
    steps: z.array(journeyStepSchema).min(1),
  }),
  officePaths: z.array(publicOfficePathSchema).min(1),
  supportRoutes: z.array(supportRouteSchema).min(1),
  barriers: z.array(barrierSchema).min(1),
  coverageGaps: z.array(coverageGapSchema).min(1),
  legalWatch: z.array(legalWatchSchema).min(1),
});

export const publicOfficePathwaysLinksSchema = strictObject({
  self: text,
  offices: text,
  support: text,
  schema: text,
  humanGuide: httpsUrl,
  openApi: text,
  rights: text,
  corrections: text,
});

export const publicOfficePathwaysResponseSchema = strictObject({
  ...publicOfficePathwaysSchema.shape,
  availability: strictObject({
    status: z.literal("open"),
    normalPublicationGates: z.literal("independent"),
    emergencyStop: z.literal("politics-bulk-data-emergency-stop"),
    methods: z.tuple([z.literal("GET"), z.literal("HEAD")]),
    writes: z.literal(false),
  }),
  links: publicOfficePathwaysLinksSchema,
});

export const publicOfficePathwayRightsSchema = strictObject({
  schema: z.literal("taxsorted.uk.public-office-pathways-rights/1"),
  status: z.literal("mixed-rights-read-before-reuse"),
  curation: strictObject({
    name: z.literal("CC BY-SA 4.0"),
    url: httpsUrl,
    attribution: text,
    appliesTo: text,
  }),
  sourceMaterial: text,
  sourceResolution: text,
  automationRule: text,
  software: strictObject({
    name: z.literal("AGPL-3.0"),
    source: httpsUrl,
    note: text,
  }),
  links: strictObject({
    self: text,
    corrections: text,
  }),
});

export const publicOfficePathwayRights = publicOfficePathwayRightsSchema.parse({
  schema: "taxsorted.uk.public-office-pathways-rights/1",
  status: "mixed-rights-read-before-reuse",
  curation: {
    name: "CC BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    attribution: "TaxSorted (taxsorted.io)",
    appliesTo:
      "TaxSorted-written selection, structure, short summaries and method text where TaxSorted has rights to license them.",
  },
  sourceMaterial:
    "Linked official pages, law and guidance keep their publishers' copyright, database, contractual and attribution terms. The TaxSorted curation licence does not relicense them.",
  sourceResolution:
    "Every pathway response embeds the source records needed to resolve its sourceIds, including publisher URL, supported claim and limitation. No source record implies permission to copy the upstream work.",
  automationRule:
    "Keep sourceIds with reused TaxSorted summaries. Visit the linked publisher, check its current terms and do not treat rel=license as a blanket CC BY-SA licence over upstream material.",
  software: {
    name: "AGPL-3.0",
    source: "https://github.com/cambridgetcg/taxsorted.io",
    note: "The server software licence is separate from content and upstream-source rights.",
  },
  links: {
    self: "/v1/politics/uk/public-office-pathways/rights",
    corrections: "/v1/politics/uk/integrity/corrections",
  },
});

export type PublicOfficePathways = z.infer<typeof publicOfficePathwaysSchema>;
export type PublicOfficePath = z.infer<typeof publicOfficePathSchema>;
export type PublicOfficePathwaySource = PublicOfficePathways["sources"][number];

const defaultDataPath = fileURLToPath(
  new URL(
    "../../research/uk/politics/data/public-office-pathways.json",
    import.meta.url
  )
);

function sourceReferences(value: unknown, path = "$" ): Array<{ sourceId: string; path: string }> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => sourceReferences(item, `${path}[${index}]`));
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => {
    const nestedPath = `${path}.${key}`;
    if (key === "sourceIds" && Array.isArray(nested)) {
      return nested.map((sourceId) => ({ sourceId: String(sourceId), path: nestedPath }));
    }
    return sourceReferences(nested, nestedPath);
  });
}

function duplicateIds(items: Array<{ id: string }>) {
  return items
    .map((item) => item.id)
    .filter((itemId, index, values) => values.indexOf(itemId) !== index);
}

export function validatePublicOfficePathwaySourceReferences(
  corpus: PublicOfficePathways
): PublicOfficePathways {
  const issues: string[] = [];
  const sourceIdSet = new Set(corpus.sources.map((source) => source.id));
  const references = sourceReferences({
    sharedJourney: corpus.sharedJourney,
    officePaths: corpus.officePaths,
    supportRoutes: corpus.supportRoutes,
    barriers: corpus.barriers,
    coverageGaps: corpus.coverageGaps,
    legalWatch: corpus.legalWatch,
  });

  for (const duplicate of new Set(duplicateIds(corpus.sources))) {
    issues.push(`duplicate source id: ${duplicate}`);
  }
  for (const reference of references) {
    if (!sourceIdSet.has(reference.sourceId)) {
      issues.push(`${reference.path} refers to unknown source: ${reference.sourceId}`);
    }
  }
  const referencedIds = new Set(references.map((reference) => reference.sourceId));
  for (const source of corpus.sources) {
    if (!referencedIds.has(source.id)) issues.push(`unreferenced source: ${source.id}`);
    if (source.retrievedAt !== corpus.meta.retrievedAt) {
      issues.push(`${source.id} retrievedAt differs from corpus retrievedAt`);
    }
  }

  const pathIds = new Set(corpus.officePaths.map((path) => path.id));
  const supportIds = new Set(corpus.supportRoutes.map((route) => route.id));
  const barrierIds = new Set(corpus.barriers.map((barrier) => barrier.id));
  for (const duplicate of new Set(duplicateIds(corpus.officePaths))) {
    issues.push(`duplicate office path id: ${duplicate}`);
  }
  for (const duplicate of new Set(duplicateIds(corpus.supportRoutes))) {
    issues.push(`duplicate support route id: ${duplicate}`);
  }
  for (const duplicate of new Set(duplicateIds(corpus.barriers))) {
    issues.push(`duplicate barrier id: ${duplicate}`);
  }

  for (const path of corpus.officePaths) {
    if (path.currentLawAsAt > corpus.meta.lawAsAt) {
      issues.push(`${path.id} currentLawAsAt is after corpus lawAsAt`);
    }
    for (const supportId of path.supportRouteIds) {
      if (!supportIds.has(supportId)) issues.push(`${path.id} refers to unknown support route: ${supportId}`);
      const route = corpus.supportRoutes.find((item) => item.id === supportId);
      if (route && !route.officePathIds.includes(path.id)) {
        issues.push(`${path.id} has one-sided support route: ${supportId}`);
      }
    }
    for (const barrierId of path.barrierIds) {
      if (!barrierIds.has(barrierId)) issues.push(`${path.id} refers to unknown barrier: ${barrierId}`);
      const barrier = corpus.barriers.find((item) => item.id === barrierId);
      if (barrier && !barrier.officePathIds.includes(path.id)) {
        issues.push(`${path.id} has one-sided barrier: ${barrierId}`);
      }
    }
  }
  for (const route of corpus.supportRoutes) {
    for (const pathId of route.officePathIds) {
      if (!pathIds.has(pathId)) issues.push(`${route.id} refers to unknown office path: ${pathId}`);
      const path = corpus.officePaths.find((item) => item.id === pathId);
      if (path && !path.supportRouteIds.includes(route.id)) {
        issues.push(`${route.id} has one-sided office path: ${pathId}`);
      }
    }
  }
  for (const barrier of corpus.barriers) {
    for (const pathId of barrier.officePathIds) {
      if (!pathIds.has(pathId)) issues.push(`${barrier.id} refers to unknown office path: ${pathId}`);
      const path = corpus.officePaths.find((item) => item.id === pathId);
      if (path && !path.barrierIds.includes(barrier.id)) {
        issues.push(`${barrier.id} has one-sided office path: ${pathId}`);
      }
    }
    for (const supportId of barrier.supportRouteIds) {
      if (!supportIds.has(supportId)) issues.push(`${barrier.id} refers to unknown support route: ${supportId}`);
    }
  }

  const orderedCollections = [
    ["shared journey", corpus.sharedJourney.steps],
    ...corpus.officePaths.flatMap((path) => [
      [`${path.id} taking-office`, path.takingOffice] as const,
    ]),
  ] as Array<readonly [string, Array<{ order: number }>]>;
  for (const [name, items] of orderedCollections) {
    const expected = items.map((_, index) => index + 1);
    if (items.some((item, index) => item.order !== expected[index])) {
      issues.push(`${name} order must be contiguous from 1`);
    }
  }

  if (issues.length) {
    throw new Error(`UK public-office pathways invalid:\n- ${issues.join("\n- ")}`);
  }
  return corpus;
}

export function loadPublicOfficePathways(path = defaultDataPath): PublicOfficePathways {
  const parsed = publicOfficePathwaysSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  return validatePublicOfficePathwaySourceReferences(parsed);
}

export const publicOfficePathways = loadPublicOfficePathways();

export function findPublicOfficePath(pathId: string): PublicOfficePath | undefined {
  return publicOfficePathways.officePaths.find((path) => path.id === pathId);
}

export function publicOfficePathwaySourcesFor(
  pathOrValue: unknown
): PublicOfficePathwaySource[] {
  const value = typeof pathOrValue === "string"
    ? findPublicOfficePath(pathOrValue)
    : pathOrValue;
  if (!value) return [];

  const relatedValues: unknown[] = [value];
  if (typeof value === "object" && value !== null) {
    const candidate = value as {
      supportRouteIds?: unknown;
      barrierIds?: unknown;
    };
    const supportRouteIds = Array.isArray(candidate.supportRouteIds)
      ? candidate.supportRouteIds.filter((item): item is string => typeof item === "string")
      : [];
    const barrierIds = Array.isArray(candidate.barrierIds)
      ? candidate.barrierIds.filter((item): item is string => typeof item === "string")
      : [];
    if (supportRouteIds.length > 0 || barrierIds.length > 0) {
      relatedValues.push(
        publicOfficePathways.sharedJourney,
        ...publicOfficePathways.supportRoutes.filter((route) =>
          supportRouteIds.includes(route.id)
        ),
        ...publicOfficePathways.barriers.filter((barrier) =>
          barrierIds.includes(barrier.id)
        )
      );
    }
  }
  const wanted = new Set(sourceReferences(relatedValues).map((reference) => reference.sourceId));
  return publicOfficePathways.sources.filter((source) => wanted.has(source.id));
}

export const publicOfficePathwaysJsonSchema = {
  ...z.toJSONSchema(publicOfficePathwaysResponseSchema),
  $id: "https://api.taxsorted.io/v1/politics/uk/public-office-pathways/schema",
  title: "TaxSorted UK public-office pathways",
  description:
    "Strict structural schema for source-led routes into UK elected office. It does not make personalised eligibility determinations or turn proposed reforms into current law.",
  "x-taxsorted-runtime-invariants": [
    "Every sourceIds value resolves to one source record and every source record is used.",
    "Office-path links to support routes and barriers are reciprocal.",
    "Current-law dates cannot be later than the corpus lawAsAt date.",
    "Ordered journeys are contiguous from one.",
  ],
  "x-taxsorted-validation-scope": "structural-shape-and-runtime-reference-integrity",
  "x-taxsorted-personalised-legal-determination": false,
} as const;
