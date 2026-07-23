// A source-led map from a public goal to the institution that can actually
// change it. The first deep path covers UK central-government tax policy and
// primary legislation. It never profiles political beliefs or sends a message.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { findPublicOfficePath } from "./uk-public-office-pathways.js";

const strictObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).strict();
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
  "source references must be unique",
);

const sourceSchema = strictObject({
  id,
  title: text,
  publisher: text,
  url: httpsUrl,
  authorityLevel: z.enum([
    "government-policy",
    "government-guidance",
    "legislature-procedure",
    "legislature-guidance",
    "official-independent-body",
    "tribunal-guidance",
    "court-procedure",
    "complaint-review-guidance",
  ]),
  status: z.enum(["current", "event-specific", "historical"]),
  retrievedAt: date,
  updatedOn: date.optional(),
  appliesTo: nonEmptyStrings,
  supports: nonEmptyStrings,
  limitations: nonEmptyStrings,
});

const decisionIntentSchema = strictObject({
  id,
  title: text,
  question: text,
  chooseWhen: nonEmptyStrings,
  doNotUseWhen: nonEmptyStrings,
  routeType: z.enum([
    "deep-pathway",
    "personal-route",
    "official-handoff",
    "coverage-gap",
  ]),
  destinationId: id,
  sourceIds,
});

const actorSchema = strictObject({
  id,
  name: text,
  kind: z.enum([
    "minister",
    "ministerial-department",
    "non-ministerial-department",
    "government",
    "legislature-house",
    "independent-forecaster",
    "parliamentary-committee",
    "constitutional-step",
    "tribunal",
    "complaint-reviewer",
  ]),
  selectedOrAppointedBy: text,
  formalRole: text,
  can: nonEmptyStrings,
  cannot: nonEmptyStrings,
  accountableThrough: nonEmptyStrings,
  officialUrl: httpsUrl,
  sourceIds,
});

const participantSchema = strictObject({
  id,
  name: text,
  hasFormalDecisionPower: z.literal(false),
  accessPattern: text,
  canContribute: nonEmptyStrings,
  cannotDo: nonEmptyStrings,
  publicDoorIds: z.array(id),
  sourceIds,
});

const stageSchema = strictObject({
  id,
  order: z.number().int().positive(),
  phase: z.enum([
    "problem-definition",
    "policy-development",
    "consultation",
    "fiscal-event",
    "commons-authorisation",
    "commons-legislation",
    "lords-scrutiny",
    "enactment",
    "implementation",
    "evaluation",
  ]),
  title: text,
  actorIds: z.array(id).min(1),
  whatHappens: nonEmptyStrings,
  publicDoorIds: z.array(id),
  publicRecords: nonEmptyStrings,
  changeStillPossible: text,
  notGuaranteed: text,
  sourceIds,
});

const powerEntrySchema = strictObject({
  id,
  actorId: id,
  powerType: z.enum([
    "develop-policy",
    "propose-taxation",
    "cost-and-forecast",
    "authorise-taxation",
    "scrutinise",
    "administer",
    "review-service",
    "decide-appeal",
  ]),
  stageIds: z.array(id).min(1),
  effect: text,
  limits: nonEmptyStrings,
  sourceIds,
});

export const publicDecisionPathSchema = strictObject({
  id,
  coverageStatus: z.literal("deep"),
  currentLawAsAt: date,
  title: text,
  decisionKind: z.literal("central-government-tax-policy-and-primary-law"),
  jurisdiction: text,
  summary: text,
  startingPoint: text,
  endState: text,
  stages: z.array(stageSchema).min(1),
  powerMap: z.array(powerEntrySchema).min(1),
  publicDoorIds: z.array(id).min(1),
  participantIds: z.array(id).min(1),
  barrierIds: z.array(id).min(1),
  linkedOfficePaths: z.array(
    strictObject({
      officePathId: id,
      relationship: text,
      whenUseful: text,
      notRequiredFor: text,
      href: text,
    }),
  ).min(1),
  sourceIds,
  notLegalAdvice: text,
});

export const publicDecisionDoorSchema = strictObject({
  id,
  title: text,
  kind: z.enum([
    "government-consultation",
    "government-correspondence",
    "constituency-representation",
    "select-committee-evidence",
    "bill-evidence",
    "parliamentary-petition",
    "information-access",
    "elected-office",
  ]),
  availability: z.enum(["standing", "event-specific"]),
  officialUrl: httpsUrl,
  whoCanUse: text,
  action: nonEmptyStrings,
  relevantStageIds: z.array(id),
  requiredInputs: nonEmptyStrings,
  deadlineRule: text,
  directEffect: z.enum([
    "informs-decision",
    "correspondence-only",
    "representative-discretion",
    "committee-evidence",
    "response-or-debate-threshold",
    "information-right",
    "electoral-route",
  ]),
  expectedOutput: text,
  cannotPromise: text,
  privacyAndPublication: text,
  accountOrIdentity: text,
  taxSortedEffects: z.literal("no-storage-no-submission"),
  pathwayIds: z.array(id).min(1),
  sourceIds,
});

const personalRouteStepSchema = strictObject({
  order: z.number().int().positive(),
  action: text,
  deadline: text,
  caution: text,
  sourceIds,
});

const exceptionalPersonalRouteSchema = strictObject({
  id,
  title: text,
  territory: text,
  useWhen: text,
  timing: text,
  caution: text,
  officialUrl: httpsUrl,
  sourceIds,
});

export const publicDecisionPersonalRouteSchema = strictObject({
  id,
  title: text,
  useWhen: text,
  notFor: text,
  officialUrl: httpsUrl,
  steps: z.array(personalRouteStepSchema).min(1),
  exceptionalRoutes: z.array(exceptionalPersonalRouteSchema),
  possibleEffect: text,
  limits: nonEmptyStrings,
  sourceIds,
  notLegalAdvice: text,
});

const officialHandoffSchema = strictObject({
  id,
  title: text,
  status: z.literal("bounded-handoff"),
  useWhen: text,
  officialUrl: httpsUrl,
  actions: nonEmptyStrings,
  limits: nonEmptyStrings,
  sourceIds,
});

const eventWindowSchema = strictObject({
  id,
  title: text,
  statusAsAt: z.enum(["open", "closed"]),
  checkedOn: date,
  opensOn: date.nullable(),
  closesOn: date,
  reviewAfter: date,
  officialUrl: httpsUrl,
  pathwayId: id,
  publicDoorId: id,
  legalStatus: z.enum([
    "consultation-open",
    "consultation-closed",
    "draft-legislation",
    "bill-before-parliament",
    "enacted-not-commenced",
    "in-force",
  ]),
  territory: text,
  scopeStatus: z.enum(["formative", "partly-fixed", "fixed"]),
  scope: text,
  whatCanStillChange: text,
  whoCanRespond: text,
  proceduralEffect: text,
  effectiveFrom: date.nullable(),
  cannotPromise: text,
  privacyAndPublication: text,
  sourceIds,
});

const barrierSchema = strictObject({
  id,
  title: text,
  kind: z.enum([
    "government-initiative",
    "timing",
    "procedural",
    "evidence",
    "representation",
    "transparency",
    "legal-complexity",
    "access-asymmetry",
  ]),
  mechanismAnalysisStatus: z.enum([
    "official-process-description",
    "taxsorted-inference",
  ]),
  generalOptionsStatus: z.literal("taxsorted-written-general-guidance"),
  mechanism: text,
  publicPurpose: text,
  burden: nonEmptyStrings,
  generalLowerFrictionOptions: nonEmptyStrings,
  doesNotMean: text,
  pathwayIds: z.array(id).min(1),
  publicDoorIds: z.array(id),
  sourceIds,
});

const coverageGapSchema = strictObject({
  id,
  title: text,
  status: z.enum([
    "intentionally-not-generalised",
    "event-data-not-loaded",
    "legal-advice-not-provided",
  ]),
  whySeparate: text,
  safeFallback: text,
  sourceIds,
});

export const publicDecisionPathwaysSchema = strictObject({
  schema: z.literal("taxsorted.uk.public-decision-pathways/1"),
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
  decisionIntents: z.array(decisionIntentSchema).min(1),
  actors: z.array(actorSchema).min(1),
  participants: z.array(participantSchema).min(1),
  pathways: z.array(publicDecisionPathSchema).min(1),
  publicDoors: z.array(publicDecisionDoorSchema).min(1),
  personalRoutes: z.array(publicDecisionPersonalRouteSchema).min(1),
  officialHandoffs: z.array(officialHandoffSchema).min(1),
  eventWindows: z.array(eventWindowSchema),
  barriers: z.array(barrierSchema).min(1),
  coverageGaps: z.array(coverageGapSchema).min(1),
});

export const publicDecisionPathwaysLinksSchema = strictObject({
  self: text,
  decisions: text,
  doors: text,
  schema: text,
  humanGuide: httpsUrl,
  openApi: text,
  rights: text,
  corrections: text,
});

export const publicDecisionPathwaysResponseSchema = strictObject({
  ...publicDecisionPathwaysSchema.shape,
  availability: strictObject({
    status: z.literal("open"),
    normalPublicationGates: z.literal("independent"),
    emergencyStop: z.literal("politics-bulk-data-emergency-stop"),
    methods: z.tuple([z.literal("GET"), z.literal("HEAD")]),
    writes: z.literal(false),
  }),
  links: publicDecisionPathwaysLinksSchema,
});

export const publicDecisionPathwayRightsSchema = strictObject({
  schema: z.literal("taxsorted.uk.public-decision-pathways-rights/1"),
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

export const publicDecisionPathwayRights =
  publicDecisionPathwayRightsSchema.parse({
    schema: "taxsorted.uk.public-decision-pathways-rights/1",
    status: "mixed-rights-read-before-reuse",
    curation: {
      name: "CC BY-SA 4.0",
      url: "https://creativecommons.org/licenses/by-sa/4.0/",
      attribution: "TaxSorted (taxsorted.io)",
      appliesTo:
        "TaxSorted-written selection, structure, short summaries and method text where TaxSorted has rights to license them.",
    },
    sourceMaterial:
      "Linked official pages, law, procedure and guidance keep their publishers' copyright, database, contractual and attribution terms. The TaxSorted curation licence does not relicense them.",
    sourceResolution:
      "Every response embeds the source records needed to resolve its sourceIds, including the publisher, supported claim and limitation.",
    automationRule:
      "Keep sourceIds with reused TaxSorted summaries. Visit the linked publisher, check the current page and its terms, and never treat rel=license as a blanket licence over upstream material.",
    software: {
      name: "AGPL-3.0",
      source: "https://github.com/cambridgetcg/taxsorted.io",
      note: "The server software licence is separate from content and upstream-source rights.",
    },
    links: {
      self: "/v1/politics/uk/public-decision-pathways/rights",
      corrections: "/v1/politics/uk/integrity/corrections",
    },
  });

export type PublicDecisionPathways = z.infer<typeof publicDecisionPathwaysSchema>;
export type PublicDecisionPath = z.infer<typeof publicDecisionPathSchema>;
export type PublicDecisionDoor = z.infer<typeof publicDecisionDoorSchema>;
export type PublicDecisionPathwaySource =
  PublicDecisionPathways["sources"][number];

const defaultDataPath = fileURLToPath(
  new URL(
    "../../research/uk/politics/data/public-decision-pathways.json",
    import.meta.url,
  ),
);

function sourceReferences(
  value: unknown,
  path = "$",
): Array<{ sourceId: string; path: string }> {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      sourceReferences(item, `${path}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => {
    const nestedPath = `${path}.${key}`;
    if (key === "sourceIds" && Array.isArray(nested)) {
      return nested.map((sourceId) => ({
        sourceId: String(sourceId),
        path: nestedPath,
      }));
    }
    return sourceReferences(nested, nestedPath);
  });
}

function duplicateIds(items: Array<{ id: string }>) {
  return items
    .map((item) => item.id)
    .filter((itemId, index, values) => values.indexOf(itemId) !== index);
}

function contiguousOrders(items: Array<{ order: number }>) {
  return items.every((item, index) => item.order === index + 1);
}

export function validatePublicDecisionPathwayReferences(
  corpus: PublicDecisionPathways,
): PublicDecisionPathways {
  const issues: string[] = [];
  const collections = [
    ["source", corpus.sources],
    ["decision intent", corpus.decisionIntents],
    ["actor", corpus.actors],
    ["participant", corpus.participants],
    ["pathway", corpus.pathways],
    ["public door", corpus.publicDoors],
    ["personal route", corpus.personalRoutes],
    ["official handoff", corpus.officialHandoffs],
    ["event window", corpus.eventWindows],
    ["barrier", corpus.barriers],
    ["coverage gap", corpus.coverageGaps],
  ] as const;
  for (const [label, items] of collections) {
    for (const duplicate of new Set(duplicateIds(items))) {
      issues.push(`duplicate ${label} id: ${duplicate}`);
    }
  }

  const sourceIdSet = new Set(corpus.sources.map((source) => source.id));
  const references = sourceReferences({
    decisionIntents: corpus.decisionIntents,
    actors: corpus.actors,
    participants: corpus.participants,
    pathways: corpus.pathways,
    publicDoors: corpus.publicDoors,
    personalRoutes: corpus.personalRoutes,
    officialHandoffs: corpus.officialHandoffs,
    eventWindows: corpus.eventWindows,
    barriers: corpus.barriers,
    coverageGaps: corpus.coverageGaps,
  });
  for (const reference of references) {
    if (!sourceIdSet.has(reference.sourceId)) {
      issues.push(`${reference.path} refers to unknown source: ${reference.sourceId}`);
    }
  }
  const referencedSourceIds = new Set(
    references.map((reference) => reference.sourceId),
  );
  for (const source of corpus.sources) {
    if (!referencedSourceIds.has(source.id)) {
      issues.push(`unreferenced source: ${source.id}`);
    }
    if (source.retrievedAt !== corpus.meta.retrievedAt) {
      issues.push(`${source.id} retrievedAt differs from corpus retrievedAt`);
    }
  }

  const pathwayIds = new Set(corpus.pathways.map((pathway) => pathway.id));
  const actorIds = new Set(corpus.actors.map((actor) => actor.id));
  const participantIds = new Set(
    corpus.participants.map((participant) => participant.id),
  );
  const publicDoorIds = new Set(corpus.publicDoors.map((door) => door.id));
  const personalRouteIds = new Set(
    corpus.personalRoutes.map((route) => route.id),
  );
  const handoffIds = new Set(
    corpus.officialHandoffs.map((handoff) => handoff.id),
  );
  const barrierIds = new Set(corpus.barriers.map((barrier) => barrier.id));
  const coverageGapIds = new Set(
    corpus.coverageGaps.map((gap) => gap.id),
  );

  for (const intent of corpus.decisionIntents) {
    const destinations =
      intent.routeType === "deep-pathway"
        ? pathwayIds
        : intent.routeType === "personal-route"
          ? personalRouteIds
          : intent.routeType === "official-handoff"
            ? handoffIds
            : coverageGapIds;
    if (!destinations.has(intent.destinationId)) {
      issues.push(
        `${intent.id} refers to unknown ${intent.routeType} destination: ${intent.destinationId}`,
      );
    }
  }

  for (const pathway of corpus.pathways) {
    if (pathway.currentLawAsAt > corpus.meta.lawAsAt) {
      issues.push(`${pathway.id} currentLawAsAt is after corpus lawAsAt`);
    }
    if (!contiguousOrders(pathway.stages)) {
      issues.push(`${pathway.id} stage order must be contiguous from 1`);
    }
    const stageIds = new Set(pathway.stages.map((stage) => stage.id));
    for (const stage of pathway.stages) {
      for (const actorId of stage.actorIds) {
        if (!actorIds.has(actorId)) {
          issues.push(`${stage.id} refers to unknown actor: ${actorId}`);
        }
      }
      for (const doorId of stage.publicDoorIds) {
        if (!publicDoorIds.has(doorId)) {
          issues.push(`${stage.id} refers to unknown public door: ${doorId}`);
        }
      }
    }
    for (const power of pathway.powerMap) {
      if (!actorIds.has(power.actorId)) {
        issues.push(`${power.id} refers to unknown actor: ${power.actorId}`);
      }
      for (const stageId of power.stageIds) {
        if (!stageIds.has(stageId)) {
          issues.push(`${power.id} refers to unknown stage: ${stageId}`);
        }
      }
    }
    for (const doorId of pathway.publicDoorIds) {
      if (!publicDoorIds.has(doorId)) {
        issues.push(`${pathway.id} refers to unknown public door: ${doorId}`);
      }
      const door = corpus.publicDoors.find((item) => item.id === doorId);
      if (door && !door.pathwayIds.includes(pathway.id)) {
        issues.push(`${pathway.id} has one-sided public door: ${doorId}`);
      }
    }
    for (const participantId of pathway.participantIds) {
      if (!participantIds.has(participantId)) {
        issues.push(`${pathway.id} refers to unknown participant: ${participantId}`);
      }
    }
    for (const barrierId of pathway.barrierIds) {
      if (!barrierIds.has(barrierId)) {
        issues.push(`${pathway.id} refers to unknown barrier: ${barrierId}`);
      }
      const barrier = corpus.barriers.find((item) => item.id === barrierId);
      if (barrier && !barrier.pathwayIds.includes(pathway.id)) {
        issues.push(`${pathway.id} has one-sided barrier: ${barrierId}`);
      }
    }
    for (const officeLink of pathway.linkedOfficePaths) {
      if (!findPublicOfficePath(officeLink.officePathId)) {
        issues.push(
          `${pathway.id} refers to unknown public-office path: ${officeLink.officePathId}`,
        );
      }
      const expectedHref =
        `/v1/politics/uk/public-office-pathways/offices/${officeLink.officePathId}`;
      if (officeLink.href !== expectedHref) {
        issues.push(
          `${pathway.id} public-office href must equal ${expectedHref}`,
        );
      }
    }
  }

  for (const door of corpus.publicDoors) {
    for (const pathwayId of door.pathwayIds) {
      if (!pathwayIds.has(pathwayId)) {
        issues.push(`${door.id} refers to unknown pathway: ${pathwayId}`);
      }
      const pathway = corpus.pathways.find((item) => item.id === pathwayId);
      if (pathway && !pathway.publicDoorIds.includes(door.id)) {
        issues.push(`${door.id} has one-sided pathway: ${pathwayId}`);
      }
      const stageIds = new Set(
        pathway?.stages.map((stage) => stage.id) ?? [],
      );
      for (const stageId of door.relevantStageIds) {
        if (!stageIds.has(stageId)) {
          issues.push(`${door.id} refers to unknown stage: ${stageId}`);
        }
      }
      if (pathway) {
        const stageDoorIds = pathway.stages
          .filter((stage) => stage.publicDoorIds.includes(door.id))
          .map((stage) => stage.id)
          .sort();
        const declaredStageIds = [...door.relevantStageIds].sort();
        if (
          JSON.stringify(stageDoorIds) !== JSON.stringify(declaredStageIds)
        ) {
          issues.push(
            `${door.id} relevantStageIds must match stage publicDoorIds in ${pathway.id}`,
          );
        }
      }
    }
  }

  for (const participant of corpus.participants) {
    for (const doorId of participant.publicDoorIds) {
      if (!publicDoorIds.has(doorId)) {
        issues.push(`${participant.id} refers to unknown public door: ${doorId}`);
      }
    }
  }
  for (const route of corpus.personalRoutes) {
    if (!contiguousOrders(route.steps)) {
      issues.push(`${route.id} step order must be contiguous from 1`);
    }
  }
  for (const window of corpus.eventWindows) {
    if (!pathwayIds.has(window.pathwayId)) {
      issues.push(`${window.id} refers to unknown pathway: ${window.pathwayId}`);
    }
    if (!publicDoorIds.has(window.publicDoorId)) {
      issues.push(`${window.id} refers to unknown public door: ${window.publicDoorId}`);
    }
    const pathway = corpus.pathways.find(
      (item) => item.id === window.pathwayId,
    );
    if (pathway && !pathway.publicDoorIds.includes(window.publicDoorId)) {
      issues.push(
        `${window.id} public door does not belong to pathway: ${window.publicDoorId}`,
      );
    }
    if (window.opensOn && window.opensOn > window.closesOn) {
      issues.push(`${window.id} opensOn must not be after closesOn`);
    }
    if (
      window.statusAsAt === "open" &&
      (window.checkedOn > window.closesOn ||
        (window.opensOn !== null && window.checkedOn < window.opensOn))
    ) {
      issues.push(`${window.id} cannot be open outside its dated window`);
    }
    if (window.checkedOn > corpus.meta.retrievedAt) {
      issues.push(`${window.id} checkedOn is after corpus retrievedAt`);
    }
    if (window.reviewAfter < window.closesOn) {
      issues.push(`${window.id} reviewAfter must not be before closesOn`);
    }
  }
  for (const barrier of corpus.barriers) {
    for (const pathwayId of barrier.pathwayIds) {
      if (!pathwayIds.has(pathwayId)) {
        issues.push(`${barrier.id} refers to unknown pathway: ${pathwayId}`);
      }
      const pathway = corpus.pathways.find((item) => item.id === pathwayId);
      if (pathway && !pathway.barrierIds.includes(barrier.id)) {
        issues.push(`${barrier.id} has one-sided pathway: ${pathwayId}`);
      }
    }
    for (const doorId of barrier.publicDoorIds) {
      if (!publicDoorIds.has(doorId)) {
        issues.push(`${barrier.id} refers to unknown public door: ${doorId}`);
      }
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `UK public-decision pathways invalid:\n- ${issues.join("\n- ")}`,
    );
  }
  return corpus;
}

export function loadPublicDecisionPathways(
  path = defaultDataPath,
): PublicDecisionPathways {
  const parsed = publicDecisionPathwaysSchema.parse(
    JSON.parse(readFileSync(path, "utf8")),
  );
  return validatePublicDecisionPathwayReferences(parsed);
}

export const publicDecisionPathways = loadPublicDecisionPathways();

export function findPublicDecisionPath(
  pathwayId: string,
): PublicDecisionPath | undefined {
  return publicDecisionPathways.pathways.find(
    (pathway) => pathway.id === pathwayId,
  );
}

export function publicDecisionPathwaySourcesFor(
  values: unknown | unknown[],
): PublicDecisionPathwaySource[] {
  const wanted = new Set(
    sourceReferences(Array.isArray(values) ? values : [values]).map(
      (reference) => reference.sourceId,
    ),
  );
  return publicDecisionPathways.sources.filter((source) =>
    wanted.has(source.id),
  );
}

export function publicDecisionPathwayRelatedData(pathwayId: string) {
  const pathway = findPublicDecisionPath(pathwayId);
  if (!pathway) return undefined;
  const publicDoors = publicDecisionPathways.publicDoors.filter((door) =>
    pathway.publicDoorIds.includes(door.id),
  );
  const participants = publicDecisionPathways.participants.filter(
    (participant) => pathway.participantIds.includes(participant.id),
  );
  const barriers = publicDecisionPathways.barriers.filter((barrier) =>
    pathway.barrierIds.includes(barrier.id),
  );
  const actorIds = new Set(
    pathway.stages.flatMap((stage) => stage.actorIds),
  );
  const actors = publicDecisionPathways.actors.filter((actor) =>
    actorIds.has(actor.id),
  );
  return {
    pathway,
    actors,
    participants,
    publicDoors,
    barriers,
    sources: publicDecisionPathwaySourcesFor([
      pathway,
      actors,
      participants,
      publicDoors,
      barriers,
    ]),
  };
}

export const publicDecisionPathwaysJsonSchema = {
  ...z.toJSONSchema(publicDecisionPathwaysResponseSchema),
  $id: "https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/schema",
  title: "TaxSorted UK public-decision pathways",
  description:
    "Strict structural schema for a source-led map from a public goal to the institutions, stages and lawful participation doors that can affect it. It does not recommend political views, send submissions or decide personal legal remedies.",
  "x-taxsorted-runtime-invariants": [
    "Every sourceIds value resolves to one used source record.",
    "Every intent resolves to exactly one deep pathway, personal route, official handoff or named coverage gap.",
    "Pathway links to public doors and barriers are reciprocal.",
    "Public-door relevantStageIds exactly match stage publicDoorIds.",
    "Actor, participant, stage and public-door references resolve.",
    "Ordered stages and personal-route steps are contiguous from one.",
    "Current-law dates cannot be later than the corpus lawAsAt date.",
  ],
  "x-taxsorted-validation-scope":
    "structural-shape-and-runtime-reference-integrity",
  "x-taxsorted-personalised-political-recommendation": false,
  "x-taxsorted-personalised-legal-determination": false,
  "x-taxsorted-submission-or-message-sending": false,
} as const;
