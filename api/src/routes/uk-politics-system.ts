// Public, non-personal UK political-system records.
// These routes stay readable while the separate people-data publication gate
// is closed, so the rules, responsibilities and methodology remain auditable.

import type { Context } from "hono";
import { Hono } from "hono";
import {
  budgetAccountability,
  campaignFinanceRules,
  electionActors,
  electionContactRoutes,
  electionProcess,
  enforcementSnapshot,
  findOfficePowerAssessment,
  formalPowerMethod,
  historyCoverage,
  legislativeWatch,
  officePowerAssessments,
  politicsSystemData,
  politicsSystemScope,
  politicsSystemSources,
  publicPoliticalFunding,
  relationshipEvidenceLanes,
} from "../uk-politics-system.js";
import { problemDetails } from "../problem-details.js";

function cachedJson(c: Context, body: unknown, maxAge = 3600) {
  c.header("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 6}`);
  return c.json(body);
}

function sourceSubset(ids: string[]) {
  const wanted = new Set(ids);
  return politicsSystemSources.filter((source) => wanted.has(source.id));
}

function referencedSourceIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(referencedSourceIds);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) =>
    key === "sourceIds" && Array.isArray(nested)
      ? nested.filter((id): id is string => typeof id === "string")
      : referencedSourceIds(nested)
  );
}

export function createUkPoliticsSystemRoutes() {
  const routes = new Hono();

  routes.get("/system", (c) => cachedJson(c, politicsSystemData));

  routes.get("/elections/process", (c) =>
    cachedJson(c, {
      schema: politicsSystemData.schema,
      updatedAt: politicsSystemData.updatedAt,
      scope: politicsSystemScope,
      actors: electionActors,
      contactRoutes: electionContactRoutes,
      stages: electionProcess,
      warning:
        "This foundation describes UK Parliamentary general elections. Devolved and local variants must be selected explicitly rather than treated as identical.",
      sources: sourceSubset([
        "ec-election-role",
        "ec-candidate-spending",
        "ec-party-spending",
        "ec-non-party-campaigners",
        "dcpa-2022",
        "rpa-1983",
        "ppera-2000",
      ]),
    })
  );

  routes.get("/funding/rules", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.campaign-finance-rules/1",
      updatedAt: politicsSystemData.updatedAt,
      rules: campaignFinanceRules,
      warning:
        "A threshold is valid only for the stated actor, jurisdiction, election and effective date. Re-check election-specific guidance when a poll is called.",
      sources: sourceSubset([
        "ec-candidate-spending",
        "ec-party-spending",
        "ec-non-party-campaigners",
        "ec-permissible-sources",
        "ec-donations-reporting",
        "ec-candidate-donations",
        "rpa-1983",
        "ppera-2000",
      ]),
    })
  );

  routes.get("/funding/public", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.public-political-funding/1",
      updatedAt: politicsSystemData.updatedAt,
      ...publicPoliticalFunding,
      sources: sourceSubset([
        "policy-development-grants",
        "short-money",
        "cranborne-money",
        "returning-officer-charges-2024",
      ]),
    })
  );

  routes.get("/power/method", (c) =>
    cachedJson(c, {
      method: formalPowerMethod,
      sources: sourceSubset([
        "pm-responsibilities",
        "ministerial-code",
        "parliament-mps",
        "parliament-scrutiny",
        "parliament-spending",
        "select-committee-powers",
        "supply-estimates-manual-2026",
      ]),
    })
  );

  routes.get("/power/offices", (c) =>
    cachedJson(c, {
      schema: formalPowerMethod.schema,
      methodVersion: formalPowerMethod.version,
      assessments: officePowerAssessments,
      sources: sourceSubset(referencedSourceIds(officePowerAssessments)),
      comparison:
        "The API intentionally has no global power sort. Fix a comparable jurisdiction and office family before comparing assessments.",
    })
  );

  routes.get("/power/offices/:officeId", (c) => {
    const assessment = findOfficePowerAssessment(c.req.param("officeId"));
    if (!assessment) {
      const detail =
        "No assessment with that namespaced office ID is published in this method version.";
      return problemDetails(c, 404, {
        error: "office_power_assessment_not_found",
        detail,
        extensions: {
          message: detail,
          methodPath: "/v1/politics/uk/power/method",
        },
        nextActions: [
          {
            method: "GET",
            href: "/v1/politics/uk/power/offices",
            description: "List the published office power assessments.",
          },
        ],
      });
    }
    return cachedJson(c, {
      assessment,
      sources: sourceSubset(referencedSourceIds(assessment)),
    });
  });

  routes.get("/budgets/accountability", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.public-money-accountability/1",
      updatedAt: politicsSystemData.updatedAt,
      ...budgetAccountability,
      sources: sourceSubset([
        "main-estimates-2026-27",
        "supply-estimates-manual-2026",
        "public-spending-accountability",
        "parliament-spending",
        "ipsa-publication",
      ]),
    })
  );

  routes.get("/relationships/method", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.public-relationship-evidence/1",
      updatedAt: politicsSystemData.updatedAt,
      name: "Corporate and organisational relationship evidence",
      rule:
        "Publish source-reported relationship edges. Never convert co-occurrence, a donation, a meeting, an interest, lobbying registration or a contract into an unsupported claim of influence or wrongdoing.",
      lanes: relationshipEvidenceLanes,
      sources: sourceSubset([
        "commons-standards",
        "ec-permissible-sources",
        "ministerial-gifts",
        "ministerial-code",
        "consultant-lobbyists",
        "contracts-finder-ocds",
        "companies-house-profile",
      ]),
    })
  );

  routes.get("/enforcement/method", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.political-enforcement/1",
      updatedAt: politicsSystemData.updatedAt,
      principles: politicsSystemData.enforcementPrinciples,
      currentSnapshot: enforcementSnapshot,
      actors: electionActors.filter((actor) =>
        ["electoral-commission", "police-prosecutors-courts"].includes(actor.id)
      ),
      sources: sourceSubset([
        "ec-election-role",
        "ec-candidate-spending",
        "ec-party-spending",
        "ec-enforcement",
        "rpa-1983",
        "ppera-2000",
        "commons-standards",
      ]),
    })
  );

  routes.get("/history/method", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.political-history/1",
      updatedAt: politicsSystemData.updatedAt,
      ...historyCoverage,
      sources: sourceSubset(["commons-election-results"]),
    })
  );

  routes.get("/law/watch", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.political-law-watch/1",
      updatedAt: politicsSystemData.updatedAt,
      items: legislativeWatch,
      warning: "Proposed law is never merged into current rules.",
      sources: sourceSubset(["representation-people-bill-2026"]),
    })
  );

  return routes;
}
