export const TAX_DISPUTE_DIMENSION_IDS = [
  "case-identity-and-tax-context",
  "procedural-posture-and-route",
  "questions-and-issues",
  "material-and-disputed-facts",
  "governing-rules-and-authorities",
  "party-arguments",
  "evidence-burden-and-standard",
  "decisive-reasoning",
  "supporting-and-rejected-reasoning",
  "holding-and-disposition",
  "remedies-money-and-costs",
  "later-history-transfer-limits-and-counterfactuals",
] as const;

export const TAX_DISPUTE_DIMENSION_STATES = [
  "mapped",
  "partial",
  "not-mapped",
  "not-applicable",
] as const;

export const TAX_DISPUTE_CHALLENGE_KINDS = [
  "route-and-jurisdiction",
  "timing-and-procedure",
  "material-facts",
  "statutory-interpretation",
  "authority-and-precedent",
  "burden-and-standard",
  "characterisation",
  "causation-and-quantification",
  "remedy-and-enforcement",
  "later-history",
  "transfer-to-new-facts",
] as const;

export const TAX_DISPUTE_CHALLENGE_MATERIALITY = [
  "decisive",
  "material",
  "contextual",
] as const;

export const TAX_DISPUTE_CHALLENGE_STATES = [
  "resolved-in-decision",
  "bounded-by-record",
  "open-for-new-case",
] as const;

export const TAX_DISPUTE_REASON_STATES = [
  "decisive",
  "supporting",
  "boundary",
] as const;

export const TAX_DISPUTE_TRAINING_TASK_FAMILIES = [
  "map-dimensions",
  "identify-decisive-reasons",
  "separate-outcomes",
  "identify-major-challenges",
] as const;

export type TaxDisputeDimensionId =
  (typeof TAX_DISPUTE_DIMENSION_IDS)[number];
export type TaxDisputeDimensionState =
  (typeof TAX_DISPUTE_DIMENSION_STATES)[number];
export type TaxDisputeChallengeKind =
  (typeof TAX_DISPUTE_CHALLENGE_KINDS)[number];
export type TaxDisputeChallengeMateriality =
  (typeof TAX_DISPUTE_CHALLENGE_MATERIALITY)[number];
export type TaxDisputeChallengeState =
  (typeof TAX_DISPUTE_CHALLENGE_STATES)[number];
export type TaxDisputeReasonState =
  (typeof TAX_DISPUTE_REASON_STATES)[number];
export type TaxDisputeTrainingTaskFamily =
  (typeof TAX_DISPUTE_TRAINING_TASK_FAMILIES)[number];

export interface TaxDisputeDimensionDefinition {
  id: TaxDisputeDimensionId;
  order: number;
  title: string;
  question: string;
}

export const TAX_DISPUTE_FRAMEWORK = {
  schema: "taxsorted.uk.tax-dispute-framework/1",
  version: "2026-07-28.2",
  interpretationSchema: "taxsorted.uk.tax-dispute-interpretation/1",
  title: "TaxSorted UK tax-dispute interpretation framework",
  purpose:
    "Read a decided tax dispute as identity, route, issues, facts, rules, arguments, evidence, reasons, holding, remedies and transfer limits without inventing missing material.",
  dimensionStates: [...TAX_DISPUTE_DIMENSION_STATES],
  dimensions: [
    {
      id: "case-identity-and-tax-context",
      order: 1,
      title: "Case identity and tax context",
      question:
        "Which decision, jurisdiction, tax setting, parties and public power are in view?",
    },
    {
      id: "procedural-posture-and-route",
      order: 2,
      title: "Procedural posture and route",
      question:
        "Which route brought the dispute here, what stage was decided and which routes stayed separate?",
    },
    {
      id: "questions-and-issues",
      order: 3,
      title: "Questions and issues",
      question:
        "Which legal questions had to be answered, and which questions were outside the decision?",
    },
    {
      id: "material-and-disputed-facts",
      order: 4,
      title: "Material and disputed facts",
      question:
        "Which facts mattered to the result, which were disputed and which remain unknown?",
    },
    {
      id: "governing-rules-and-authorities",
      order: 5,
      title: "Governing rules and authorities",
      question:
        "Which legislation, precedent and procedural rules governed the issue, with what authority?",
    },
    {
      id: "party-arguments",
      order: 6,
      title: "Party arguments",
      question:
        "What did each party ask the court to accept, and which arguments were accepted, rejected or not mapped?",
    },
    {
      id: "evidence-burden-and-standard",
      order: 7,
      title: "Evidence, burden and standard",
      question:
        "Who had to establish what, to which standard, using which evidence?",
    },
    {
      id: "decisive-reasoning",
      order: 8,
      title: "Decisive reasoning",
      question:
        "Which stated public reasons were outcome-determinative within an issue or formed an independently sufficient branch supporting the disposition?",
    },
    {
      id: "supporting-and-rejected-reasoning",
      order: 9,
      title: "Supporting and rejected reasoning",
      question:
        "Which reasons supported the route, which were rejected and which only mark a boundary?",
    },
    {
      id: "holding-and-disposition",
      order: 10,
      title: "Holding and disposition",
      question:
        "What did the court formally decide, and how was the appeal or application disposed of?",
    },
    {
      id: "remedies-money-and-costs",
      order: 11,
      title: "Remedies, money and costs",
      question:
        "Which remedy followed, what money was affected, and what was not awarded, recovered or quantified?",
    },
    {
      id: "later-history-transfer-limits-and-counterfactuals",
      order: 12,
      title: "Later history, transfer limits and counterfactuals",
      question:
        "What happened later, which facts limit transfer, and what change could alter the result in another case?",
    },
  ] satisfies TaxDisputeDimensionDefinition[],
  majorChallenges: {
    kinds: [...TAX_DISPUTE_CHALLENGE_KINDS],
    meaning:
      "A challenge is a difficulty that materially changes how the decided case should be read. It is not a difficulty score or outcome prediction.",
  },
  reasoning: {
    decisiveness: [...TAX_DISPUTE_REASON_STATES],
    hiddenChainOfThought: false,
    publicRationaleOnly: true,
    meaning:
      "A decisive label means outcome-determinative within the issue being mapped or part of an independently sufficient branch supporting the disposition. It does not mean every decisive branch was globally necessary once another sufficient branch existed. All labels describe concise public judicial reasoning, not hidden model reasoning.",
  },
  training: {
    taskFamilies: [...TAX_DISPUTE_TRAINING_TASK_FAMILIES],
    sourcePolicy:
      "approved-public-case-packets-plus-taxsorted-derived-labels",
    caseLevelSplit: true,
    currentUse: "format-and-evaluation-seed",
  },
  boundaries: [
    "Public legal research, not legal advice.",
    "No outcome prediction, win score or expected-value field.",
    "No hidden chain-of-thought is requested, stored or published.",
    "Missing material stays partial or not mapped.",
    "The approved source packet remains canonical.",
    "Runtime requests, private assessments and user data are outside the training export.",
  ],
} as const;

export interface TaxDisputeSourcePinpoint {
  sourceId: string;
  locator: string;
}

export interface TaxDisputeDimension {
  id: TaxDisputeDimensionId;
  order: number;
  title: string;
  state: TaxDisputeDimensionState;
  question: string;
  reading: string;
  casePointers: string[];
  sourceIds: string[];
  gaps: string[];
}

export interface TaxDisputeMajorChallenge {
  id: string;
  kind: TaxDisputeChallengeKind;
  materiality: TaxDisputeChallengeMateriality;
  state: TaxDisputeChallengeState;
  description: string;
  impact: string;
  evidenceNeeded: string[];
  blockers: string[];
  resolution: string;
  casePointers: string[];
  sourceIds: string[];
}

export interface TaxDisputeReasonStep {
  id: string;
  decisiveness: TaxDisputeReasonState;
  issueBranch: string;
  proposition: string;
  casePointers: string[];
  sourceIds: string[];
  sourcePinpoints: TaxDisputeSourcePinpoint[];
  gaps: string[];
}

export interface TaxDisputeOutcome {
  status: string;
  summary: string;
  casePointers: string[];
  sourceIds: string[];
}

export interface UkTaxDisputeInterpretation {
  schema: "taxsorted.uk.tax-dispute-interpretation/1";
  frameworkVersion: string;
  packet: {
    schema: string | null;
    digest: string | null;
    corpusVersion: string;
    lawAsAt: string;
  };
  case: {
    id: string;
    slug: string;
    title: string;
    citation: string;
    territory: string;
    subject: string;
    status: string;
  };
  dimensions: TaxDisputeDimension[];
  majorChallenges: TaxDisputeMajorChallenge[];
  reasoning: {
    hiddenChainOfThought: false;
    publicRationaleOnly: true;
    holding: string;
    decisiveReasonIds: string[];
    steps: TaxDisputeReasonStep[];
  };
  outcomes: {
    procedural: TaxDisputeOutcome;
    underlyingMerits: TaxDisputeOutcome;
    money: TaxDisputeOutcome;
  };
  review: {
    adapter: string;
    qualifiedLegalReviewAsserted: false;
    sourcePacketDigestSupplied: boolean;
    limits: string;
  };
  boundaries: string[];
}

export interface TaxDisputeCaseRecord {
  id: string;
  slug: string;
  title: string;
  citation: string;
  territory: string;
  subject: string;
  caseStatus: string;
  publicInterestQuestion: string;
  whyItMatters: string;
  timeline: Array<{
    date: string;
    datePrecision: string;
    state: string;
    event: string;
    sourceIds: string[];
  }>;
  findings: Array<{
    id: string;
    state: string;
    statement: string;
    sourceIds: string[];
  }>;
  counterweights: Array<{
    id: string;
    state: string;
    statement: string;
    sourceIds: string[];
  }>;
  remedies: Array<{
    id: string;
    kind: string;
    status: string;
    effect: string;
    notEffect: string;
    sourceIds: string[];
  }>;
  financialEffect: {
    headline: string;
    status: string;
    documentedAmounts: Array<{
      id: string;
      meaning: string;
      notMeaning: string;
      sourceIds: string[];
    }>;
    damagesAward: {
      status: string;
      reason: string;
    };
    netRecovery: {
      status: string;
      reason: string;
    };
    professionalValuationQuestions: string[];
    downside: {
      status: string;
      minimumScenario: string;
      reason: string;
      sourceIds: string[];
    };
  };
  applicability: {
    reasoningPattern: string;
    possibleSignals: string[];
    notEnough: string[];
    assessmentRoute: string;
    sourceIds: string[];
  };
}

export interface BuildUkTaxDisputeInterpretationInput {
  caseRecord: TaxDisputeCaseRecord;
  corpusVersion: string;
  lawAsAt: string;
  sourcePacket?: {
    schema: string;
    digest: string;
  };
}

interface TaxDisputeTrainingExampleCommon {
  schema: "taxsorted.uk.tax-dispute-training-example/1";
  id: string;
  split: "evaluation";
  derived: {
    frameworkVersion: string;
    adapter: string;
    taxSortedDerivedLabels: true;
    qualifiedLegalReviewAsserted: false;
  };
  case: {
    id: string;
    slug: string;
    citation: string;
    packetDigest: string;
    packetHref: string;
  };
  instruction: string;
  provenance: {
    sourceIds: string[];
    casePointers: string[];
  };
  safety: {
    sourcePacketApproved: true;
    taxSortedDerivedLabels: true;
    qualifiedLegalReviewAsserted: false;
    containsPrivateMatterFacts: false;
    hiddenChainOfThought: false;
    outcomePrediction: false;
  };
}

interface TaxDisputeTrainingPacketInput {
  packet: {
    href: string;
    digest: string;
  };
}

export type TaxDisputeTrainingExample =
  | (TaxDisputeTrainingExampleCommon & {
      taskFamily: "map-dimensions";
      input: TaxDisputeTrainingPacketInput & {
        caseId: string;
        frameworkVersion: string;
      };
      expectedOutput: {
        dimensions: Array<{
          id: TaxDisputeDimensionId;
          state: TaxDisputeDimensionState;
          reading: string;
          gaps: string[];
        }>;
      };
    })
  | (TaxDisputeTrainingExampleCommon & {
      taskFamily: "identify-decisive-reasons";
      input: TaxDisputeTrainingPacketInput & {
        caseId: string;
        holding: string;
      };
      expectedOutput: {
        holding: string;
        decisiveReasonIds: string[];
        steps: Array<{
          id: string;
          decisiveness: TaxDisputeReasonState;
          issueBranch: string;
          proposition: string;
          gaps: string[];
        }>;
      };
    })
  | (TaxDisputeTrainingExampleCommon & {
      taskFamily: "separate-outcomes";
      input: TaxDisputeTrainingPacketInput & {
        caseId: string;
        holding: string;
      };
      expectedOutput: {
        outcomes: UkTaxDisputeInterpretation["outcomes"];
      };
    })
  | (TaxDisputeTrainingExampleCommon & {
      taskFamily: "identify-major-challenges";
      input: TaxDisputeTrainingPacketInput & {
        caseId: string;
        dimensionStates: Record<
          TaxDisputeDimensionId,
          TaxDisputeDimensionState
        >;
      };
      expectedOutput: {
        majorChallenges: TaxDisputeMajorChallenge[];
      };
    });
