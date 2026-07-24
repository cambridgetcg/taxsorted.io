export type ProfessionalOpportunityEdgeGateManifest = {
  schema: "taxsorted.uk.professional-opportunity-edge-gate/1";
  state: "closed" | "open";
  corpusDigest: string;
  reviewBy: string | null;
};

export const professionalOpportunityGuardedPaths = [
  "/uk/opportunities",
  "/uk/regulator-scrutiny",
] as const;

const calendarDatePattern =
  /^(?:(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8])))|(?:(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29))$/;

export function isProfessionalOpportunityGuardedPath(path: string) {
  return professionalOpportunityGuardedPaths.some(
    (root) => path === root || path.startsWith(`${root}/`),
  );
}

export function professionalOpportunityEdgeGateIsOpen(
  manifest: ProfessionalOpportunityEdgeGateManifest,
  asOf: string,
) {
  return (
    manifest.schema ===
      "taxsorted.uk.professional-opportunity-edge-gate/1" &&
    manifest.state === "open" &&
    typeof manifest.reviewBy === "string" &&
    calendarDatePattern.test(manifest.reviewBy) &&
    calendarDatePattern.test(asOf) &&
    asOf <= manifest.reviewBy
  );
}

function closedBodyExpression() {
  return `path.startsWith("/uk/regulator-scrutiny")
    ? {
        title: "Public-body research awaiting hosted review — TaxSorted",
        heading: "This evidence ledger is awaiting its required independent review."
      }
    : {
        title: "Professional tax research awaiting review — TaxSorted",
        heading: "This research is awaiting its required independent review."
      }`;
}

export function makeProfessionalOpportunityEdgeWorker(
  manifest: ProfessionalOpportunityEdgeGateManifest,
) {
  const encodedManifest = JSON.stringify(manifest);
  const guardedRoots = JSON.stringify(
    professionalOpportunityGuardedPaths,
  );
  return `const manifest = ${encodedManifest};
const guardedRoots = ${guardedRoots};
const calendarDatePattern = ${calendarDatePattern.toString()};

function isGuarded(path) {
  return guardedRoots.some(
    (root) => path === root || path.startsWith(root + "/"),
  );
}

function securityHeaders(headers) {
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=()");
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

function closedResponse(path, status = 200, head = false) {
  const copy = ${closedBodyExpression()};
  const body = \`<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>\${copy.title}</title>
</head>
<body>
  <main>
    <p>Hosted distribution gate closed</p>
    <h1>\${copy.heading}</h1>
    <p>TaxSorted's official hosted projection is unavailable. The source corpus remains visible in the public GitHub repository. This page accepts no client matter or private document.</p>
  </main>
</body>
</html>\`;
  const headers = securityHeaders(new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "text/html; charset=utf-8",
    "X-Robots-Tag": "noindex, nofollow",
    "X-TaxSorted-Professional-Opportunity-Guard": "closed"
  }));
  return new Response(head ? null : body, { status, headers });
}

function gateIsOpen(now) {
  const asOf = now.toISOString().slice(0, 10);
  return manifest.schema ===
    "taxsorted.uk.professional-opportunity-edge-gate/1" &&
    manifest.state === "open" &&
    typeof manifest.reviewBy === "string" &&
    calendarDatePattern.test(manifest.reviewBy) &&
    calendarDatePattern.test(asOf) &&
    asOf <= manifest.reviewBy;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!isGuarded(url.pathname)) return env.ASSETS.fetch(request);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return closedResponse(url.pathname, 405);
    }
    if (!gateIsOpen(new Date())) {
      return closedResponse(url.pathname, 200, request.method === "HEAD");
    }
    try {
      const response = await env.ASSETS.fetch(request);
      const headers = securityHeaders(new Headers(response.headers));
      headers.set("Cache-Control", "no-store");
      headers.set("X-TaxSorted-Professional-Opportunity-Guard", "open");
      headers.set("X-TaxSorted-Review-By", manifest.reviewBy);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return closedResponse(
        url.pathname,
        503,
        request.method === "HEAD"
      );
    }
  }
};
`;
}

export const professionalOpportunityEdgeRoutes = {
  version: 1,
  include: [
    "/uk/opportunities",
    "/uk/opportunities/*",
    "/uk/regulator-scrutiny",
    "/uk/regulator-scrutiny/*",
  ],
  exclude: [],
} as const;
