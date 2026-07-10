// Bounded façades over official UK public-integrity sources.
//
// Every upstream response is whitelisted here. Raw public-registry payloads
// can contain addresses, direct contact details and free text that do not
// belong in a joined transparency API.

import type { Context } from "hono";
import { Hono } from "hono";
import {
  enforcementInstitutions,
  enforcementPowerCards,
  enforcementPowerMethod,
  enforcementRelationships,
  enforcementTransparencyCollections,
  evidenceEventSchema,
  financeDatasetCatalog,
  integrityScope,
  integritySources,
  integrityCorrectionMethod,
  observableOfficialLanguageMethod,
} from "../uk-integrity-system.js";

const CONTRACTS_FINDER = "https://www.contractsfinder.service.gov.uk";
const POLICE_DATA = "https://data.police.uk";
const GOVUK_CONTENT = "https://www.gov.uk";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CONTRACT_SPAN_DAYS = 31;
const MAX_JSON_BYTES = 10 * 1024 * 1024;
const MAX_CSV_BYTES = 1024 * 1024;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type UkPublicIntegrityOptions = {
  fetchImpl?: FetchLike;
  now?: () => Date;
  timeoutMs?: number;
  electoralCommissionReuseConfirmed?: boolean;
  electoralFinanceReviewApproved?: boolean;
  ministerialBenefitsEnabled?: boolean;
  enforcementLeadersEnabled?: boolean;
  parliamentaryStaffEnabled?: boolean;
  parliamentaryInterestsEnabled?: boolean;
};

class IntegrityUpstreamError extends Error {
  constructor(
    message: string,
    readonly reason: "timeout" | "unavailable" | "invalid",
    readonly upstreamStatus?: number
  ) {
    super(message);
    this.name = "IntegrityUpstreamError";
  }
}

function cachedJson(c: Context, body: unknown, maxAge = 900) {
  c.header("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 6}`);
  return c.json(body);
}

function noStoreJson(
  c: Context,
  body: unknown,
  status: 400 | 404 | 422 | 502 | 503 | 504 = 503
) {
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
}

function personalJson(c: Context, body: unknown) {
  c.header("Cache-Control", "no-store");
  return c.json(body);
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, maximum = 500): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, maximum) : null;
}

function publicMoney(value: Record<string, unknown> | null) {
  const amount = value?.amount;
  const currency = text(value?.currency, 10);
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    !currency ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    return null;
  }
  const amountMinor = Math.round(amount * 100);
  if (!Number.isSafeInteger(amountMinor)) return null;
  return {
    amountMinor,
    currency,
    basis: "source_reported_exact",
  };
}

function httpsUrl(value: unknown, host?: string): string | null {
  const candidate = text(value, 2_000);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return null;
    if (host && url.hostname !== host) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseIsoDay(value: string | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const result = Date.UTC(year!, month! - 1, day!);
  const date = new Date(result);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
    ? result
    : null;
}

function strictInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function plainOfficialText(value: unknown, maximum = 2_000): string | null {
  const source = typeof value === "string" ? value : null;
  if (!source) return null;
  const withoutTags = source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
  return text(withoutTags, maximum);
}

export function parsePublicCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index++) {
    const char = csv[index]!;
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new IntegrityUpstreamError("The official CSV was incomplete.", "invalid");
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  if (rows[0]?.[0]?.charCodeAt(0) === 0xfeff) rows[0]![0] = rows[0]![0]!.slice(1);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function publishedDate(value: string | undefined): string | null {
  const clean = text(value, 40);
  if (!clean || /^nil return$/i.test(clean)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const uk = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(clean);
  if (!uk) return null;
  return `${uk[3]}-${uk[2]!.padStart(2, "0")}-${uk[1]!.padStart(2, "0")}`;
}

function amountPence(value: string | undefined): number | null {
  const clean = text(value, 80);
  if (!clean || /unknown|nil return|not known|n\/a/i.test(clean)) return null;
  if (!/^\s*£?\s*[\d,]+(?:\.\d{1,2})?\s*$/.test(clean)) return null;
  const pounds = Number(clean.replace(/[£,\s]/g, ""));
  const pence = Math.round(pounds * 100);
  return Number.isFinite(pounds) && pounds >= 0 && Number.isSafeInteger(pence) ? pence : null;
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

function integritySourceSubset(value: unknown) {
  const wanted = new Set(referencedSourceIds(value));
  return integritySources.filter((source) => wanted.has(source.id));
}

function stablePartyIdentifier(party: Record<string, unknown> | null) {
  const identifier = record(party?.identifier);
  const scheme = text(identifier?.scheme, 30);
  const id = text(identifier?.id, 100);
  if (!scheme || !id) return null;
  return { scheme, id };
}

const SAFE_ORGANISATION_SCHEMES = new Set(["GB-COH", "GB-CHC", "GB-GOR", "GB-LAS"]);

function publicSupplier(
  supplier: Record<string, unknown>,
  parties: Map<string, Record<string, unknown>>
) {
  const referenceId = text(supplier.id, 200);
  const party = referenceId ? parties.get(referenceId) ?? null : null;
  const identifier = stablePartyIdentifier(party);
  const schemeFromReference = referenceId?.startsWith("GB-COH-") ? "GB-COH" : null;
  const idFromReference = schemeFromReference ? referenceId!.slice("GB-COH-".length) : null;
  const scheme = identifier?.scheme ?? schemeFromReference;
  const id = identifier?.id ?? idFromReference;
  const verifiedOrganisation = Boolean(scheme && SAFE_ORGANISATION_SCHEMES.has(scheme));
  return {
    name: verifiedOrganisation ? text(party?.name ?? supplier.name, 300) : null,
    identifier: verifiedOrganisation && id ? { scheme, id } : null,
    privacy: verifiedOrganisation
      ? "official_organisation_identifier"
      : "name_withheld_without_verified_organisation_identifier",
  };
}

function mapContractRelease(value: unknown) {
  const release = record(value);
  if (!release) return null;
  const ocid = text(release.ocid, 200);
  const releaseId = text(release.id, 200);
  const buyer = record(release.buyer);
  const tender = record(release.tender);
  if (!ocid || !releaseId || !buyer || !tender) return null;

  const parties = new Map<string, Record<string, unknown>>();
  for (const candidate of Array.isArray(release.parties) ? release.parties : []) {
    const party = record(candidate);
    const id = text(party?.id, 200);
    if (party && id) parties.set(id, party);
  }

  const classification = record(tender.classification);
  const tenderValue = record(tender.value);
  const awards = (Array.isArray(release.awards) ? release.awards : []).flatMap((candidate) => {
    const award = record(candidate);
    if (!award) return [];
    const awardValue = record(award.value);
    const documents = Array.isArray(award.documents) ? award.documents : [];
    const notice = documents
      .map(record)
      .find((document) => text(document?.documentType, 50) === "awardNotice");
    const suppliers = (Array.isArray(award.suppliers) ? award.suppliers : [])
      .map(record)
      .filter((supplier): supplier is Record<string, unknown> => Boolean(supplier))
      .map((supplier) => publicSupplier(supplier, parties));
    return [
      {
        id: text(award.id, 200),
        status: text(award.status, 60),
        awardedAt: text(award.date, 40),
        publishedAt: text(award.datePublished, 40),
        value: publicMoney(awardValue),
        suppliers,
        officialNoticeUrl: httpsUrl(notice?.url, "www.contractsfinder.service.gov.uk"),
      },
    ];
  });
  if (!awards.length) return null;

  return {
    id: `contracts-finder:${ocid}:${releaseId}`,
    sourceRecordId: releaseId,
    relationshipType: "reported_public_contract_award" as const,
    contractingProcessId: ocid,
    releaseId,
    publishedAt: text(release.date, 40),
    buyer: {
      id: text(buyer.id, 200),
      name: text(buyer.name, 300),
    },
    title: text(tender.title, 500),
    classification: {
      scheme: text(classification?.scheme, 30),
      id: text(classification?.id, 40),
      description: text(classification?.description, 300),
    },
    procurementMethod: text(tender.procurementMethodDetails ?? tender.procurementMethod, 200),
    tenderValue: publicMoney(tenderValue),
    awards,
    proves: "The public buyer published the listed contract award through Contracts Finder.",
    doesNotProve: [
      "Political involvement or influence",
      "Favouritism or a benefit exchange",
      "That payment or contract performance occurred",
      "Wrongdoing or corruption",
    ],
    causalInference: "none" as const,
    sourceIds: ["contracts-finder-api"],
    inference:
      "This proves only that the public buyer published the award. It does not prove political involvement, influence, favouritism or wrongdoing.",
  };
}

function nextCursor(value: unknown): string | null {
  const href = httpsUrl(value, "www.contractsfinder.service.gov.uk");
  if (!href) return null;
  const cursor = new URL(href).searchParams.get("cursor");
  return cursor && /^[A-Za-z0-9+/_=-]{1,2000}$/.test(cursor) ? cursor : null;
}

function departmentFromAttachmentTitle(title: string): string {
  return title.split(/\s+-\s+(?:The\s+Rt\s+Hon|Ministers?')/i)[0]?.trim() ?? title;
}

function rowsFromMinisterialCsv(
  csv: string,
  kind: "gift" | "hospitality",
  attachment: { title: string; url: string },
  publicationUrl: string
) {
  const [headers, ...rows] = parsePublicCsv(csv);
  if (!headers) throw new IntegrityUpstreamError("The transparency CSV had no header.", "invalid");
  const columns = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const read = (row: string[], candidates: string[]) => {
    for (const candidate of candidates) {
      const index = columns.get(normalizeHeader(candidate));
      if (index !== undefined) return row[index];
    }
    return undefined;
  };
  if (!columns.has("minister")) {
    throw new IntegrityUpstreamError("The transparency CSV shape changed.", "invalid");
  }

  return rows.flatMap<Record<string, unknown>>((row) => {
    const minister = text(read(row, ["Minister"]), 200);
    if (!minister) return [];
    const dateText = read(row, ["Date"]);
    const nil = row.some((cell) => /^\s*nil return\s*$/i.test(cell));
    if (nil) {
      return [
        {
          recordType: kind,
          status: "nil_return" as const,
          minister,
          department: departmentFromAttachmentTitle(attachment.title),
          date: null,
          benefit: null,
          direction: null,
          counterpartyAsPublished: null,
          amountPence: null,
          amountAsPublished: null,
          outcome: null,
          accompaniedByGuest: null,
          source: { publicationUrl, attachmentUrl: attachment.url, attachmentTitle: attachment.title },
        },
      ];
    }

    const counterparty = read(row, [
      "Who gift was given to or received from",
      "Individual or Organisation that offered hospitality",
    ]);
    const amount = read(row, ["Value (£)", "Estimated value of Hospitality (£)"]);
    return [
      {
        recordType: kind,
        status: "reported" as const,
        minister,
        department: departmentFromAttachmentTitle(attachment.title),
        date: publishedDate(dateText),
        benefit: text(read(row, ["Gift", "Type of Hospitality Received"]), 500),
        direction: text(read(row, ["Given or Received"]), 80),
        counterpartyAsPublished: text(counterparty, 300),
        counterpartyType: "publisher_did_not_classify",
        amountPence: amountPence(amount),
        amountAsPublished: text(amount, 100),
        outcome: text(read(row, ["Outcome (Received gifts only)"]), 300),
        accompaniedByGuest: text(read(row, ["Accompanied by Guest"]), 40),
        source: { publicationUrl, attachmentUrl: attachment.url, attachmentTitle: attachment.title },
        inference:
          "This is the Cabinet Office or department's published transparency entry. It does not prove influence, a favour, a conflict, or wrongdoing.",
      },
    ];
  });
}

export function createUkPublicIntegrityRoutes(options: UkPublicIntegrityOptions = {}) {
  const routes = new Hono();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const now = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? 8_000;
  const electoralCommissionReuseConfirmed =
    options.electoralCommissionReuseConfirmed ?? false;
  const electoralFinanceReviewApproved =
    options.electoralFinanceReviewApproved ?? false;
  const ministerialBenefitsEnabled = options.ministerialBenefitsEnabled ?? false;
  const enforcementLeadersEnabled = options.enforcementLeadersEnabled ?? false;
  const parliamentaryStaffEnabled = options.parliamentaryStaffEnabled ?? false;
  const parliamentaryInterestsEnabled = options.parliamentaryInterestsEnabled ?? false;

  async function upstream(url: URL, accept: string, maximumBytes: number): Promise<string> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new IntegrityUpstreamError("The official source took too long to answer.", "timeout"));
      }, timeoutMs);
    });
    try {
      const operation = (async () => {
        const response = await fetchImpl(url, {
          signal: controller.signal,
          headers: { Accept: accept, "User-Agent": "taxsorted.io/0.1 (+https://taxsorted.io)" },
        });
        if (!response.ok) {
          throw new IntegrityUpstreamError(
            `The official source answered with HTTP ${response.status}.`,
            "unavailable",
            response.status
          );
        }
        const length = Number(response.headers.get("content-length"));
        if (Number.isFinite(length) && length > maximumBytes) {
          throw new IntegrityUpstreamError("The official response exceeded the safe size limit.", "invalid");
        }
        const body = await response.text();
        if (Buffer.byteLength(body, "utf8") > maximumBytes) {
          throw new IntegrityUpstreamError("The official response exceeded the safe size limit.", "invalid");
        }
        return body;
      })();
      return await Promise.race([operation, timeout]);
    } catch (error) {
      if (error instanceof IntegrityUpstreamError) throw error;
      if (controller.signal.aborted) {
        throw new IntegrityUpstreamError("The official source took too long to answer.", "timeout");
      }
      throw new IntegrityUpstreamError("The official source could not be reached.", "unavailable");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function upstreamJson(url: URL, maximumBytes = MAX_JSON_BYTES): Promise<unknown> {
    const body = await upstream(url, "application/json", maximumBytes);
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new IntegrityUpstreamError("The official source returned invalid JSON.", "invalid");
    }
  }

  function upstreamFailure(c: Context, error: unknown, sourceUrl: string) {
    const failure =
      error instanceof IntegrityUpstreamError
        ? error
        : new IntegrityUpstreamError("The official source could not be read.", "unavailable");
    return noStoreJson(
      c,
      {
        error: failure.reason === "timeout" ? "upstream_timeout" : "upstream_unavailable",
        message: failure.message,
        sourceUrl,
      },
      failure.reason === "timeout" ? 504 : 502
    );
  }

  routes.get("/integrity", (c) =>
    cachedJson(c, {
      ...integrityScope,
      datasets: {
        finance: "/v1/politics/uk/relationships/datasets",
        enforcement: "/v1/politics/uk/enforcement/institutions",
      },
      methods: {
        evidence: "/v1/politics/uk/relationships/schema",
        enforcementPower: "/v1/politics/uk/enforcement/power/method",
        officialLanguage: "/v1/politics/uk/enforcement/communication-method",
        corrections: "/v1/politics/uk/integrity/corrections",
      },
      publicationGates: {
        electoralCommissionReuse: electoralCommissionReuseConfirmed
          ? "confirmed"
          : "blocked_pending_confirmation",
        electoralFinancePrivacy: electoralFinanceReviewApproved
          ? "approved"
          : "blocked_pending_review",
        ministerialBenefits: ministerialBenefitsEnabled ? "enabled" : "blocked_pending_review",
        enforcementLeaders: enforcementLeadersEnabled ? "enabled" : "blocked_pending_review",
        parliamentaryStaff: parliamentaryStaffEnabled ? "enabled" : "blocked_pending_review",
        parliamentaryInterests: parliamentaryInterestsEnabled
          ? "enabled"
          : "blocked_pending_review",
      },
    })
  );

  routes.get("/integrity/sources", (c) =>
    cachedJson(c, {
      schema: integrityScope.schema,
      updatedAt: integrityScope.updatedAt,
      sources: integritySources,
      warning:
        "Open copyright or database reuse does not itself authorise personal-data processing. Every named-person source has a separate publication decision.",
    })
  );

  routes.get("/integrity/corrections", (c) =>
    cachedJson(c, integrityCorrectionMethod)
  );

  routes.get("/relationships/schema", (c) =>
    cachedJson(c, {
      ...evidenceEventSchema,
      truthRule: integrityScope.truthRule,
    })
  );

  routes.get("/relationships/datasets", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.finance-dataset-catalog/1",
      updatedAt: integrityScope.updatedAt,
      datasets: financeDatasetCatalog,
      sources: integritySourceSubset(financeDatasetCatalog),
      rule:
        "There is deliberately no combined deals or influence feed. Each declaration, benefit, lobby return, award, grant, subsidy, company record and land title remains a separately sourced event.",
    })
  );

  routes.get("/enforcement/institutions", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.law-enforcement-institutions/1",
      updatedAt: integrityScope.updatedAt,
      institutions: enforcementInstitutions,
      coverage:
        "First institutional map for territorial policing, independent prosecution and principal oversight across England and Wales, Scotland, Northern Ireland and the NCA. It is not yet every regulator or specialist body.",
      safety: integrityScope.excluded,
      sources: integritySourceSubset(enforcementInstitutions),
    })
  );

  routes.get("/enforcement/institutions/:institutionId", (c) => {
    const institution = enforcementInstitutions.find(
      (candidate) => candidate.id === c.req.param("institutionId")
    );
    if (!institution) {
      return noStoreJson(c, { error: "enforcement_institution_not_found" }, 404);
    }
    const relationships = enforcementRelationships.filter(
      (relationship) => relationship.from === institution.id || relationship.to === institution.id
    );
    return cachedJson(c, {
      institution,
      relationships,
      sources: integritySourceSubset([institution, relationships]),
    });
  });

  routes.get("/enforcement/governance", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.law-enforcement-governance/1",
      updatedAt: integrityScope.updatedAt,
      relationshipTypes: [
        "appoints_and_can_remove",
        "appoints_and_scrutinises",
        "sets_strategy_for",
        "directs_operationally",
        "holds_to_account",
        "accountable_to",
        "inspects",
        "receives_complaints_about",
        "prosecutes_cases_from",
        "regulates_and_licenses",
      ],
      relationships: enforcementRelationships,
      warning:
        "The UK has several legally distinct accountability chains, not one command pyramid. Funding, appointment, inspection and prosecution never silently become operational direction.",
      sources: integritySourceSubset(enforcementRelationships),
    })
  );

  routes.get("/enforcement/ranks", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.police-ranks/1",
      ...enforcementTransparencyCollections.ranksAndRoles,
      sources: integritySourceSubset(enforcementTransparencyCollections.ranksAndRoles),
    })
  );

  routes.get("/enforcement/pay-benefits", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.law-enforcement-pay-sources/1",
      ...enforcementTransparencyCollections.payAndBenefits,
      sources: integritySourceSubset(enforcementTransparencyCollections.payAndBenefits),
    })
  );

  routes.get("/enforcement/workforce", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.law-enforcement-workforce-sources/1",
      ...enforcementTransparencyCollections.workforce,
      sources: integritySourceSubset(enforcementTransparencyCollections.workforce),
    })
  );

  routes.get("/enforcement/funding", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.law-enforcement-funding-sources/1",
      ...enforcementTransparencyCollections.funding,
      sources: integritySourceSubset(enforcementTransparencyCollections.funding),
    })
  );

  routes.get("/enforcement/vacancies", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.law-enforcement-vacancy-sources/1",
      ...enforcementTransparencyCollections.vacancies,
    })
  );

  routes.get("/enforcement/activities", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.law-enforcement-public-activities/1",
      ...enforcementTransparencyCollections.publicActivities,
    })
  );

  routes.get("/enforcement/private-security", (c) =>
    cachedJson(c, {
      schema: "taxsorted.uk.private-security-transparency/1",
      ...enforcementTransparencyCollections.privateSecurity,
      institutions: enforcementInstitutions.filter((institution) =>
        ["sia", "private-security-sector"].includes(institution.id)
      ),
      relationships: enforcementRelationships.filter(
        (relationship) => relationship.id === "sia-private-security-regulation"
      ),
      sources: integritySourceSubset(enforcementTransparencyCollections.privateSecurity),
    })
  );

  routes.get("/enforcement/power/method", (c) =>
    cachedJson(c, enforcementPowerMethod)
  );

  routes.get("/enforcement/power/offices", (c) =>
    cachedJson(c, {
      schema: enforcementPowerMethod.schema,
      methodVersion: enforcementPowerMethod.version,
      assessments: enforcementPowerCards,
      sources: integritySourceSubset(enforcementPowerCards),
      comparison: enforcementPowerMethod.comparison,
    })
  );

  routes.get("/enforcement/power/offices/:officeId", (c) => {
    const assessment = enforcementPowerCards.find(
      (candidate) => candidate.officeId === c.req.param("officeId")
    );
    if (!assessment) return noStoreJson(c, { error: "enforcement_office_not_found" }, 404);
    return cachedJson(c, {
      assessment,
      sources: integritySourceSubset(assessment),
    });
  });

  routes.get("/enforcement/communication-method", (c) =>
    cachedJson(c, observableOfficialLanguageMethod)
  );

  routes.get("/relationships/contracts", async (c) => {
    const from = c.req.query("from");
    const to = c.req.query("to");
    const fromTime = parseIsoDay(from);
    const toTime = parseIsoDay(to);
    const take = strictInteger(c.req.query("take"), 20, 1, 20);
    const cursor = c.req.query("cursor");
    if (
      fromTime === null ||
      toTime === null ||
      fromTime > toTime ||
      toTime - fromTime > (MAX_CONTRACT_SPAN_DAYS - 1) * DAY_MS ||
      take === null ||
      (cursor !== undefined && !/^[A-Za-z0-9+/_=-]{1,2000}$/.test(cursor))
    ) {
      return noStoreJson(
        c,
        {
          error: "invalid_query",
          message: `Use valid from/to dates spanning no more than ${MAX_CONTRACT_SPAN_DAYS} days, take=1..20, and an unmodified cursor returned by this endpoint.`,
        },
        422
      );
    }
    const url = new URL("/Published/Notices/OCDS/Search", CONTRACTS_FINDER);
    url.searchParams.set("publishedFrom", `${from}T00:00:00Z`);
    url.searchParams.set("publishedTo", `${to}T23:59:59Z`);
    url.searchParams.set("stages", "award");
    url.searchParams.set("limit", String(take));
    if (cursor) url.searchParams.set("cursor", cursor);

    try {
      const envelope = record(await upstreamJson(url));
      if (!envelope || !Array.isArray(envelope.releases)) {
        throw new IntegrityUpstreamError("The Contracts Finder response shape changed.", "invalid");
      }
      const records = envelope.releases
        .map(mapContractRelease)
        .filter((deal): deal is NonNullable<ReturnType<typeof mapContractRelease>> => Boolean(deal));
      const cursorValue = nextCursor(record(envelope.links)?.next);
      const selfUrl = new URL(c.req.url);
      const nextUrl = cursorValue ? new URL(c.req.url) : null;
      if (nextUrl) nextUrl.searchParams.set("cursor", cursorValue!);
      return cachedJson(c, {
        schema: "taxsorted.uk.public-contract-awards/1",
        datasetId: "public-contract-awards-query",
        records,
        // Kept during v1 migration for existing callers. New applications use records.
        deals: records,
        page: {
          limit: take,
          returned: records.length,
          nextCursor: cursorValue,
        },
        links: {
          self: `${selfUrl.pathname}${selfUrl.search}`,
          next: nextUrl ? `${nextUrl.pathname}${nextUrl.search}` : null,
          catalogue: "/v1/politics/uk/datasets",
          method: "/v1/politics/uk/relationships/schema",
        },
        nextCursor: cursorValue,
        coverage:
          "Contracts Finder award releases in the requested publication window. Supplier names are withheld unless the release carries a verified public organisation identifier.",
        privacy: {
          excluded: [
            "Buyer and supplier addresses",
            "Contact names, emails and telephone numbers",
            "Attachment contents",
            "Supplier names without a verified Companies House, charity, government or local-authority identifier",
          ],
        },
        source: {
          name: "Contracts Finder OCDS API",
          url: url.toString(),
          retrievedAt: now().toISOString(),
          licence: {
            name: "Open Government Licence v3.0",
            url: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
          },
        },
      });
    } catch (error) {
      return upstreamFailure(c, error, url.toString());
    }
  });

  routes.get("/relationships/ministerial-benefits", async (c) => {
    if (!ministerialBenefitsEnabled) {
      return noStoreJson(c, {
        error: "publication_review_needed",
        message:
          "The parser is built, but normalized named ministerial gift and hospitality records remain closed until the field-level lawful-basis, personal-counterparty and correction review is approved.",
        sourceUrl: "https://www.gov.uk/government/collections/register-of-ministers-gifts-and-hospitality",
      });
    }
    const month = c.req.query("month");
    const department = text(c.req.query("department"), 100);
    const kind = (c.req.query("type") ?? "all").toLowerCase();
    const match = /^(\d{4})-(\d{2})$/.exec(month ?? "");
    if (!match || !department || !["all", "gift", "hospitality"].includes(kind)) {
      return noStoreJson(
        c,
        { error: "invalid_query", message: "Use month=YYYY-MM, a department name, and type=gift|hospitality|all." },
        422
      );
    }
    const year = Number(match[1]);
    const monthNumber = Number(match[2]);
    const requested = Date.UTC(year, monthNumber - 1, 1);
    const currentMonth = Date.UTC(now().getUTCFullYear(), now().getUTCMonth(), 1);
    if (monthNumber < 1 || monthNumber > 12 || requested < Date.UTC(2025, 0, 1) || requested > currentMonth) {
      return noStoreJson(
        c,
        { error: "invalid_query", message: "The central monthly register is supported from 2025-01 through the current month." },
        422
      );
    }
    const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" })
      .format(new Date(requested))
      .toLowerCase();
    const contentPath = `/api/content/government/publications/register-of-ministers-gifts-and-hospitality-${monthName}-${year}`;
    const contentUrl = new URL(contentPath, GOVUK_CONTENT);
    const publicationUrl = new URL(contentPath.replace("/api/content", ""), GOVUK_CONTENT).toString();

    try {
      const content = record(await upstreamJson(contentUrl, 3 * 1024 * 1024));
      const details = record(content?.details);
      const attachments = (Array.isArray(details?.attachments) ? details.attachments : [])
        .map(record)
        .filter((attachment): attachment is Record<string, unknown> => Boolean(attachment))
        .flatMap((attachment) => {
          const title = text(attachment.title, 500);
          const url = httpsUrl(attachment.url, "assets.publishing.service.gov.uk");
          const contentType = text(attachment.content_type, 100);
          if (!title || !url || contentType !== "text/csv") return [];
          const departmentMatches =
            normalizeLabel(departmentFromAttachmentTitle(title)) === normalizeLabel(department);
          const attachmentKind: "gift" | "hospitality" | null = /hospitality/i.test(title)
            ? "hospitality"
            : /gifts?/i.test(title)
              ? "gift"
              : null;
          if (!departmentMatches || !attachmentKind || (kind !== "all" && kind !== attachmentKind)) return [];
          return [{ title, url, kind: attachmentKind }];
        })
        .slice(0, 4);
      if (!attachments.length) {
        return noStoreJson(
          c,
          {
            error: "department_records_not_found",
            message: "No matching CSV attachment was published for that department, month and record type.",
            sourceUrl: publicationUrl,
          },
          404
        );
      }
      const records = (
        await Promise.all(
          attachments.map(async (attachment) =>
            rowsFromMinisterialCsv(
              await upstream(new URL(attachment.url), "text/csv", MAX_CSV_BYTES),
              attachment.kind,
              attachment,
              publicationUrl
            )
          )
        )
      ).flat();
      return personalJson(
        c,
        {
          schema: "taxsorted.uk.ministerial-benefits/1",
          month,
          department,
          records,
          joiningRule:
            "Counterparties remain exactly as published and are never matched to companies, donors, lobbyists or contracts by name alone.",
          source: {
            name: text(content?.title, 500) ?? "Register of Ministers' Gifts and Hospitality",
            url: publicationUrl,
            retrievedAt: now().toISOString(),
            licence: {
              name: "Open Government Licence v3.0, except where the source states otherwise; personal-data reuse requires its own lawful basis",
              url: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
            },
          },
        }
      );
    } catch (error) {
      return upstreamFailure(c, error, publicationUrl);
    }
  });

  routes.get("/enforcement/forces", async (c) => {
    const url = new URL("/api/forces", POLICE_DATA);
    try {
      const body = await upstreamJson(url, 2 * 1024 * 1024);
      if (!Array.isArray(body)) throw new IntegrityUpstreamError("The Police API response shape changed.", "invalid");
      const forces = body.flatMap((candidate) => {
        const force = record(candidate);
        const id = text(force?.id, 100);
        const name = text(force?.name, 200);
        return id && name && /^[a-z0-9-]+$/.test(id) ? [{ id, name }] : [];
      });
      return cachedJson(c, {
        schema: "taxsorted.uk.police-force-directory/1",
        datasetId: "police-force-directory-query",
        records: forces,
        forces,
        page: { returned: forces.length, total: forces.length, nextCursor: null },
        links: {
          self: "/v1/politics/uk/enforcement/forces",
          catalogue: "/v1/politics/uk/datasets",
        },
        coverage:
          "Forces returned by data.police.uk; its force list currently excludes British Transport Police. Scotland is not covered by this API.",
        source: {
          name: "data.police.uk Police API",
          url: url.toString(),
          retrievedAt: now().toISOString(),
          licence: {
            name: "Open Government Licence v3.0",
            url: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
          },
        },
      }, 3600);
    } catch (error) {
      return upstreamFailure(c, error, url.toString());
    }
  });

  routes.get("/enforcement/forces/:forceId", async (c) => {
    const forceId = c.req.param("forceId");
    if (!/^[a-z0-9-]{2,100}$/.test(forceId)) {
      return noStoreJson(c, { error: "invalid_force_id" }, 422);
    }
    const url = new URL(`/api/forces/${forceId}`, POLICE_DATA);
    try {
      const force = record(await upstreamJson(url, 2 * 1024 * 1024));
      if (!force) throw new IntegrityUpstreamError("The Police API response shape changed.", "invalid");
      const engagement = (Array.isArray(force.engagement_methods) ? force.engagement_methods : [])
        .map(record)
        .filter((method): method is Record<string, unknown> => Boolean(method))
        .flatMap((method) => {
          const href = httpsUrl(method.url);
          const type = text(method.type, 50);
          const title = text(method.title, 100);
          return href && type ? [{ type, title, url: href }] : [];
        });
      const mappedForce = {
        id: text(force.id, 100),
        name: text(force.name, 200),
        publicDescription: plainOfficialText(force.description),
        website: httpsUrl(force.url),
        publicSwitchboard: text(force.telephone, 40),
        engagement,
      };
      return cachedJson(c, {
        schema: "taxsorted.uk.police-force-institution/1",
        datasetId: "police-force-directory-query",
        record: mappedForce,
        force: mappedForce,
        links: {
          self: `/v1/politics/uk/enforcement/forces/${forceId}`,
          collection: "/v1/politics/uk/enforcement/forces",
          catalogue: "/v1/politics/uk/datasets",
        },
        safety:
          "Institutional information only: no station addresses, live deployment, specialist-unit membership, tactics or direct officer contacts.",
        source: {
          name: "data.police.uk Police API",
          url: url.toString(),
          retrievedAt: now().toISOString(),
          licence: {
            name: "Open Government Licence v3.0",
            url: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
          },
        },
      }, 3600);
    } catch (error) {
      return upstreamFailure(c, error, url.toString());
    }
  });

  routes.get("/enforcement/forces/:forceId/leaders", async (c) => {
    const forceId = c.req.param("forceId");
    if (!/^[a-z0-9-]{2,100}$/.test(forceId)) {
      return noStoreJson(c, { error: "invalid_force_id" }, 422);
    }
    if (!enforcementLeadersEnabled) {
      return noStoreJson(c, {
        error: "publication_review_needed",
        message:
          "The senior-officer whitelist is built, but named leadership records stay closed until the senior-office threshold, correction route and safety review are approved.",
        sourceUrl: `${POLICE_DATA}/docs/method/senior-officers/`,
      });
    }
    const url = new URL(`/api/forces/${forceId}/people`, POLICE_DATA);
    try {
      const body = await upstreamJson(url, 2 * 1024 * 1024);
      if (!Array.isArray(body)) throw new IntegrityUpstreamError("The Police API response shape changed.", "invalid");
      const leaders = body.flatMap((candidate) => {
        const person = record(candidate);
        const name = text(person?.name, 200);
        const rank = text(person?.rank, 150);
        return name && rank
          ? [
              {
                name,
                rank,
                scope: "senior_officer_published_by_force",
                omitted: ["biography", "address", "email", "telephone", "mobile", "personal social profiles"],
              },
            ]
          : [];
      });
      return personalJson(c, {
        leaders,
        rule:
          "Names and ranks are returned only because the official Police API classifies these people as senior officers. No lower-rank roster or direct contact data is exposed.",
        source: {
          name: "data.police.uk senior officers API",
          url: url.toString(),
          retrievedAt: now().toISOString(),
          licence: {
            name: "Open Government Licence v3.0; personal-data publication also uses a documented public-interest basis",
            url: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
          },
        },
      });
    } catch (error) {
      return upstreamFailure(c, error, url.toString());
    }
  });

  return routes;
}
