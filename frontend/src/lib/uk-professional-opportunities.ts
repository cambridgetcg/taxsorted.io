import opportunityCorpusJson from "../../../research/uk/professional-opportunities/data/uk-professional-opportunities.json";
import publicationApprovalJson from "../../../research/uk/professional-opportunities/data/publication-approval.json";
import {
  evaluateUkProfessionalOpportunityStaticPublication,
  ukProfessionalOpportunityStaticPublication,
  type PublicationApproval,
} from "./uk-professional-opportunity-publication";

type OpportunityCorpus = typeof opportunityCorpusJson;

function collectSourceIds(value: unknown, sourceIds = new Set<string>()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSourceIds(item, sourceIds));
    return sourceIds;
  }
  if (!value || typeof value !== "object") return sourceIds;
  for (const [key, nested] of Object.entries(value)) {
    if (key === "sourceIds" && Array.isArray(nested)) {
      nested.forEach((sourceId) => sourceIds.add(String(sourceId)));
    } else {
      collectSourceIds(nested, sourceIds);
    }
  }
  return sourceIds;
}

export function projectUkProfessionalOpportunityCorpus(
  corpus: OpportunityCorpus,
  approval: PublicationApproval,
  options: {
    publicDataEnabled?: boolean;
    emergencyStop?: boolean;
  } = {},
): OpportunityCorpus | null {
  const decision = evaluateUkProfessionalOpportunityStaticPublication(
    corpus,
    approval,
  );
  if (
    !decision.approved ||
    !(options.publicDataEnabled ?? true) ||
    (options.emergencyStop ?? false)
  ) {
    return null;
  }

  const approvedIds = new Set(decision.approvedOpportunityIds);
  const opportunities = corpus.opportunities.filter((opportunity) =>
    approvedIds.has(opportunity.id),
  );
  const scrutinyIds = new Set(
    opportunities.flatMap((opportunity) => opportunity.scrutinyIds),
  );
  const scrutiny = corpus.scrutiny.filter((record) =>
    scrutinyIds.has(record.id),
  );
  const sourceIds = collectSourceIds({
    method: corpus.method,
    sharedWorkflow: corpus.sharedWorkflow,
    opportunities,
    scrutiny,
  });
  const sources = corpus.sources.filter((source) => sourceIds.has(source.id));

  return {
    ...corpus,
    meta: {
      ...corpus.meta,
      coverage: opportunities.map(
        (opportunity) =>
          `${opportunity.taxArea} — ${opportunity.territories.join(", ")}`,
      ),
      recordCounts: {
        opportunities: opportunities.length,
        scrutiny: scrutiny.length,
        sources: sources.length,
      },
    },
    opportunities,
    scrutiny,
    sources,
  };
}

export const ukProfessionalOpportunityCorpus =
  projectUkProfessionalOpportunityCorpus(
    opportunityCorpusJson,
    publicationApprovalJson,
    {
      publicDataEnabled:
        ukProfessionalOpportunityStaticPublication.publicDataEnabled,
      emergencyStop: ukProfessionalOpportunityStaticPublication.emergencyStop,
    },
  );

export const ukProfessionalOpportunityPublicationAvailable =
  ukProfessionalOpportunityCorpus !== null;

export type UkProfessionalOpportunity =
  (typeof opportunityCorpusJson.opportunities)[number];
export type UkProfessionalOpportunitySource =
  (typeof opportunityCorpusJson.sources)[number];
export type UkRegulatorScrutiny =
  (typeof opportunityCorpusJson.scrutiny)[number];

export function professionalOpportunityBySlug(slug: string) {
  return ukProfessionalOpportunityCorpus?.opportunities.find(
    (opportunity) =>
      opportunity.slug === slug || opportunity.id === slug,
  );
}

export function professionalOpportunitySources(
  sourceIds: readonly string[],
) {
  const wanted = new Set(sourceIds);
  return (
    ukProfessionalOpportunityCorpus?.sources.filter((source) =>
      wanted.has(source.id),
    ) ?? []
  );
}

export function regulatorScrutinyByIds(scrutinyIds: readonly string[]) {
  const wanted = new Set(scrutinyIds);
  return (
    ukProfessionalOpportunityCorpus?.scrutiny.filter((record) =>
      wanted.has(record.id),
    ) ?? []
  );
}

export const evidenceStateLabels = {
  "court-finding": "Court finding",
  "oversight-finding": "Oversight finding",
  "official-statistic": "Official statistic",
  "stakeholder-assessment": "Stakeholder assessment",
  "taxsorted-fairness-question": "TaxSorted fairness question",
  unknown: "Unknown",
} as const;

export const professionalGateLabels = {
  "legal-requirement": "Legal requirement",
  "regulator-or-platform-condition": "Regulator or platform condition",
  "professional-body-rule": "Professional-body rule",
  "prudent-specialism": "Prudent specialism",
} as const;
