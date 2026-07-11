// taxsorted api — the rails. One typed surface for the web UI and agents alike.

import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { config, assertBootConfig } from "./config.js";
import { apiCors } from "./cors.js";
import { migrate } from "./db.js";
import { registerDeveloperApi } from "./developer-api.js";
import { apiErrorHandler } from "./error-handler.js";
import { requestId } from "./request-id.js";
import { noSuchDoorProblem } from "./problem-details.js";
import { session } from "./session.js";
import { entities } from "./routes/entities.js";
import { connect } from "./routes/connect.js";
import { vat } from "./routes/vat.js";
import { itsa } from "./routes/itsa.js";
import { itsaSubmit } from "./routes/itsa-submit.js";
import { account } from "./routes/account.js";
import { createUkPoliticsRoutes } from "./routes/uk-politics.js";
import { createOpenDataRoutes } from "./routes/open-data.js";
import { createUkTaxIndustryRoutes } from "./routes/uk-tax-industry.js";
import { createUkTaxSystemRoutes } from "./routes/uk-tax-system.js";
import { createUkCharitiesRoutes } from "./routes/uk-charities.js";
import { createUkPublicFundingRoutes } from "./routes/uk-public-funding.js";
import { createAgentInterfaceRoutes } from "./routes/agent-interface.js";
import { createReleaseDiscoveryRoutes } from "./routes/release-discovery.js";

const app = new OpenAPIHono();

app.use("*", requestId);
app.use("*", apiCors);

const openDataRouteOptions = {
  taxSystemPublic: config.taxSystem.publicDataEnabled,
  taxIndustryPublic: config.taxIndustry.publicDataEnabled,
  charitiesPublic: config.charities.publicDataEnabled,
  charitiesEmergencyStop: config.charities.emergencyStop,
  publicFundingPublic: config.publicFunding.publicDataEnabled,
  publicFundingEmergencyStop: config.publicFunding.emergencyStop,
  politicsBulkDataAvailable: config.politics.bulkDataEnabled,
  politicsBulkDataEmergencyStop: config.politics.bulkDataEmergencyStop,
  politicsBulkDataApproval: config.politics.bulkDataApproval,
};

// A machine can orient itself without opening a taxpayer/browser session.
// The wake response is a projection of the same catalog mounted below.
app.route("/", createAgentInterfaceRoutes(openDataRouteOptions));
app.get("/v1/health", (c) =>
  c.json({ ok: true, hmrc: { configured: config.hmrc.configured, env: config.hmrc.env } })
);

// Public reference data must not create a taxpayer session or set identity
// cookies. Route it before the /v1/* session rail for that reason.
app.route(
  "/v1/open-data/releases",
  createReleaseDiscoveryRoutes(openDataRouteOptions)
);
app.route(
  "/v1/open-data",
  createOpenDataRoutes(openDataRouteOptions)
);
app.route(
  "/v1/politics/uk",
  createUkPoliticsRoutes({
    bulkDataEmergencyStop: config.politics.bulkDataEmergencyStop,
    bulkDataEnabled: config.politics.bulkDataEnabled,
    bulkDataApproval: config.politics.bulkDataApproval,
    publicDataEnabled: config.politics.publicDataEnabled,
    electoralCommissionReuseConfirmed: config.politics.electoralCommissionReuseConfirmed,
    electoralFinanceReviewApproved: config.politics.electoralFinanceReviewApproved,
    ministerialBenefitsEnabled: config.politics.ministerialBenefitsEnabled,
    enforcementLeadersEnabled: config.politics.enforcementLeadersEnabled,
    parliamentaryStaffEnabled: config.politics.parliamentaryStaffEnabled,
    parliamentaryInterestsEnabled: config.politics.parliamentaryInterestsEnabled,
  })
);
app.route(
  "/v1/tax-system/uk",
  createUkTaxSystemRoutes({ publicDataEnabled: config.taxSystem.publicDataEnabled })
);
app.route(
  "/v1/tax-industry/uk",
  createUkTaxIndustryRoutes({ publicDataEnabled: config.taxIndustry.publicDataEnabled })
);
app.route(
  "/v1/charities/uk",
  createUkCharitiesRoutes({
    publicDataEnabled: config.charities.publicDataEnabled,
    emergencyStop: config.charities.emergencyStop,
  })
);
app.route(
  "/v1/public-funding/uk",
  createUkPublicFundingRoutes({
    publicDataEnabled: config.publicFunding.publicDataEnabled,
    emergencyStop: config.publicFunding.emergencyStop,
  })
);

// Machine routes use workspace keys and never create browser sessions.
// Register them before the explicit browser-session allowlist below.
registerDeveloperApi(app, config.apiOrigin);

// Browser identity belongs only to these existing human-facing route trees.
// A new public or machine route therefore cannot start setting cookies merely
// because its path happens to begin with /v1.
for (const base of ["/v1/entities", "/v1/hmrc", "/v1/itsa", "/v1/account"]) {
  app.use(base, session);
  app.use(`${base}/*`, session);
}
app.route("/v1/entities", entities);
app.route("/v1/entities", vat);
app.route("/v1/hmrc", connect);
app.route("/v1/itsa", itsa);
app.route("/v1/itsa", itsaSubmit);
app.route("/v1/account", account);

app.notFound(noSuchDoorProblem);
app.onError(apiErrorHandler);

assertBootConfig();
await migrate();
serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`taxsorted api listening on :${info.port} (hmrc: ${config.hmrc.env}, configured: ${config.hmrc.configured})`);
});
