# HMRC Developer Hub API surface for a full MTD IT product — engineering ground truth

Researched 2026-07-02. All claims verified against pages/files actually fetched on this date.
Primary sources: developer.service.hmrc.gov.uk (Developer Hub), raw OAS specs from HMRC's own GitHub
(`raw.githubusercontent.com/hmrc/<api-repo>/main/resources/public/api/conf/<version>/…` — these are the exact
files the Developer Hub renders), and the official `hmrc/income-tax-mtd-changelog` repo.

Base URLs (from every OAS `servers` block):
- Sandbox: `https://test-api.service.hmrc.gov.uk`
- Production: `https://api.service.hmrc.gov.uk`

---

## 1. The full API list (current versions, verified 2026-07-02)

Source: Developer Hub API index filtered to income-tax-mtd —
https://developer.service.hmrc.gov.uk/api-documentation/docs/api?filter=income-tax-mtd
(cross-checked against https://developer.service.hmrc.gov.uk/api-documentation/docs/api).
All MTD IT APIs below are marked **beta** on their documentation pages (beta here is HMRC's long-running
production status for MTD APIs, not "unreleased"). All are user-restricted OAuth 2.0 with scopes
`read:self-assessment` / `write:self-assessment` (verified in each OAS `securitySchemes` block).

### 1a. Core loop APIs (the minimum for record-keeping → quarterly updates → final declaration)

| API | Current version | Role |
|---|---|---|
| Business Details (MTD) | **v2.0** | Enumerate businesses, business IDs, quarterly period type |
| Obligations (MTD) | **v3.0** | What's due and when (quarterly + final declaration) |
| Self Employment Business (MTD) | **v5.0** | Sole-trader quarterly (cumulative) + annual submissions |
| Property Business (MTD) | **v6.0** | Landlord (UK + foreign) quarterly (cumulative) + annual submissions |
| Individual Calculations (MTD) | **v8.0** | Trigger + retrieve tax calculation; submit final declaration |
| Business Source Adjustable Summary (MTD) | **v7.0** | Year-end accounting adjustments per income source |
| Individual Losses (MTD) | **v7.0** | Losses & loss claims (v7 model applies TY 2026-27+) |
| Business Income Source Summary (MTD) | **v3.0** | Read-only income/expense/profit summary per business |
| Self Assessment Individual Details (MTD) | **v2.0** | Retrieve ITSA status (mandated / voluntary / annual / exempt) |
| Self Assessment Accounts (MTD) | **v4.0** | Balance, payments, charge history, coding-out, ITSA penalties |
| Individuals Disclosures (MTD) | **v2.0** | Marriage allowance + tax-avoidance disclosures |

### 1b. Supplementary personal-income APIs (needed for a complete final declaration)

From the same filtered list: Individuals Employments Income v2.0, Individuals Savings Income v2.0,
Individuals Dividends Income v2.0, Individuals Other Income v2.0, Individuals Pensions Income v2.0,
Individuals State Benefits v2.0, Individuals Insurance Policies Income v2.0, Individuals Foreign Income v2.0,
Individuals Capital Gains Income v3.0, Individuals Charges v3.0, Individuals Reliefs v3.0,
Individuals Expenses v3.0, **Individuals Partner Income v1.0** (new, TY 2026-27+),
**Individuals Tax Liability Adjustments v1.0** (new, TY 2026-27+), Self Assessment Assist v1.0.
Agent products also need Agent Authorisation API v2.0 (+ its Test Support API v1.0).

### 1c. Test-only APIs

| API | Version | Purpose |
|---|---|---|
| Create Test User | v1.0 | Sandbox test individuals/organisations/agents |
| Self Assessment Test Support (MTD) | v1.0 | Sandbox stateful-data management (businesses, ITSA status, checkpoints) |
| Test Fraud Prevention Headers | v1.0 | Validate your fraud-prevention headers |

### 1d. Endpoint maps (extracted from HMRC's own OAS `application.yaml` files)

**Business Details v2.0** (https://raw.githubusercontent.com/hmrc/business-details-api/main/resources/public/api/conf/2.0/application.yaml):
- `GET /individuals/business/details/{nino}/list` — List All Businesses
- `GET /individuals/business/details/{nino}/{businessId}` — Retrieve Business Details
- `PUT /individuals/business/details/{nino}/{businessId}/{taxYear}` — **Create and Amend Quarterly Period Type**.
  Choice per tax year: *standard* quarters (first period 6 Apr–5 Jul) or *calendar* quarters (first period
  1 Apr–30 Jun). **Cannot be changed after a submission is made for that year; only the current tax year is
  allowed** (quarterly_period_type_create_amend.yaml).
- `…/{taxYear}/accounting-type` — Retrieve (no min tax year) / Update Accounting Type (TY 2025-26+)
- `…/{taxYear}/periods-of-account` — Retrieve / Create or Update Periods of Account (TY 2025-26+)
- `…/{taxYear}/late-accounting-date-rule-election` (+ `/disapply`, `/withdraw`) — late accounting date rule election

**Obligations v3.0** (https://raw.githubusercontent.com/hmrc/obligations-api/main/resources/public/api/conf/3.0/application.yaml) — only two endpoints now:
- `GET /obligations/details/{nino}/income-and-expenditure` — "Retrieve Income Tax (Self Assessment) Income and
  Expenditure Obligations" (quarterly update obligations; query params typeOfBusiness, businessId, fromDate,
  toDate, status = `open`/`fulfilled`)
- `GET /obligations/details/{nino}/crystallisation` — "Retrieve Income Tax (Self Assessment) Final Declaration
  Obligations" ("final declaration (previously known as crystallisation)")
- The End of Period Statement obligations endpoint **was removed from the API on 20 Aug 2025** (changelog).

**Self Employment Business v5.0** (https://raw.githubusercontent.com/hmrc/self-employment-business-api/main/resources/public/api/conf/5.0/application.yaml):
- `GET/PUT/DELETE /individuals/business/self-employment/{nino}/{businessId}/annual/{taxYear}` — annual submission
  (allowances, adjustments, non-financials)
- Old-style standalone period summaries (for TY ≤ 2024-25):
  `POST …/period` (create), `GET …/period/{taxYear}` (list), `GET/PUT …/period/{taxYear}/{periodId}` (retrieve/amend)
- **`GET/PUT/DELETE …/cumulative/{taxYear}` — Self-Employment Cumulative Period Summary.**
  "only available for tax years starting from 2025-26" (create_amend_cumulative_period_summary.yaml).
  Submissions must include income AND expenses values even if zero. PUT is create-or-amend — each quarterly
  update re-submits year-to-date cumulative figures.

**Property Business v6.0** (https://raw.githubusercontent.com/hmrc/property-business-api/main/resources/public/api/conf/6.0/application.yaml):
- UK property: `…/property/uk/{nino}/{businessId}/annual/{taxYear}` (annual submission),
  `…/period/{taxYear}` + `…/period/{taxYear}/{submissionId}` (standalone period summaries, TY ≤ 2024-25),
  **`…/cumulative/{taxYear}` — UK Property Cumulative Period Summary ("only available for tax years starting
  from 2025-26", uk_property_cumulative_summary_create_or_amend.yaml)**
- Foreign property: parallel `annual`, `period`, `cumulative/{taxYear}` endpoints + foreign property details
  endpoints (`…/foreign/{nino}/{businessId}/details/{taxYear}`)
- Combined: `…/property/{nino}/{businessId}/annual/{taxYear}` (delete annual), `…/period/{taxYear}` (list period
  summaries)
- Historic FHL / non-FHL UK property endpoints for old years (`…/uk/annual/furnished-holiday-lettings/…` etc.)

**Individual Calculations v8.0** (https://raw.githubusercontent.com/hmrc/individual-calculations-api/main/resources/public/api/conf/8.0/application.yaml):
- `POST /individuals/calculations/{nino}/self-assessment/{taxYear}/trigger/{calculationType}` — **Trigger a Self
  Assessment Tax Calculation**. calculationType values: TY 2023-24 & 2024-25 → `in-year`, `intent-to-finalise`;
  **TY 2025-26+ → `in-year`, `intent-to-finalise`, `intent-to-amend`** (common/pathParameters.yaml). Async:
  returns 202; HMRC recommends waiting **at least 5 seconds** before retrieving. Scope: write:self-assessment.
- `GET …/self-assessment/{taxYear}` — List Self Assessment Tax Calculations
- `GET …/{taxYear}/{calculationId}` — Retrieve a Self Assessment Tax Calculation
- `POST …/{taxYear}/{calculationId}/{calculationType}` — **Submit a Self Assessment Final Declaration**
  (returns 204). calculationType: TY ≤ 2024-25 → `final-declaration`; **TY 2025-26+ → `final-declaration`,
  `confirm-amendment`** (submit_final_declaration.yaml + pathParameters.yaml).
- Final-declaration flow: trigger with `intent-to-finalise` → retrieve calculation → agree → submit final
  declaration against that calculationId.

**BSAS v7.0** (https://raw.githubusercontent.com/hmrc/self-assessment-bsas-api/main/resources/public/api/conf/7.0/application.yaml):
- `GET /individuals/self-assessment/adjustable-summary/{nino}/{taxYear}` — list BSAS
- `POST …/adjustable-summary/{nino}/trigger` — trigger a BSAS
- Retrieve + submit adjustments per source type: `…/self-employment/{calculationId}/{taxYear}` and
  `…/self-employment/{calculationId}/adjust/{taxYear}`; same pairs for `uk-property` and `foreign-property`.

**Individual Losses v7.0** (https://raw.githubusercontent.com/hmrc/individual-losses-api/main/resources/public/api/conf/7.0/application.yaml):
- Single consolidated resource: `GET/PUT/DELETE /individuals/losses/{nino}/businesses/{businessId}/loss-claims/{taxYear}`
  (Retrieve / Create or Amend / Delete Losses and Claims). Per changelog these v7 endpoints apply
  **TY 2026-27 onwards** (v6.0's separate brought-forward-losses and loss-claims endpoints served earlier years).
- Sandbox-only optional header `suspend-temporal-validations: true` allows in-year submissions (otherwise
  `RULE_TAX_YEAR_NOT_ENDED`).

**BISS v3.0** (https://raw.githubusercontent.com/hmrc/self-assessment-biss-api/main/resources/public/api/conf/3.0/application.yaml):
- `GET /individuals/self-assessment/income-summary/{nino}/{typeOfBusiness}/{taxYear}/{businessId}`

**Self Assessment Individual Details v2.0** (https://raw.githubusercontent.com/hmrc/self-assessment-individual-details-api/main/resources/public/api/conf/2.0/application.yaml):
- `GET /individuals/person/itsa-status/{nino}/{taxYear}` — **Retrieve ITSA Status** (query params `futureYears`,
  `history`; scope read:self-assessment). "An ITSA status is always available for each tax year from the year the
  customer signed up for MTD to the current year." This is how a product decides whether the user is MTD-mandated.
  Statuses evolving: `Digitally Exempt` enum added 24 Mar 2026; deprecated `Non Digital` removed 18 Jun 2026 (changelog).

**Self Assessment Accounts v4.0** (https://raw.githubusercontent.com/hmrc/self-assessment-accounts-api/main/resources/public/api/conf/4.0/application.yaml):
- balance-and-transactions, payments-and-allocations, charge history (by transactionId / chargeReference),
  coding-out (retrieve/opt-in/opt-out/status), `GET /accounts/self-assessment/{nino}/penalties` (ITSA penalties).

**Individuals Disclosures v2.0** (https://raw.githubusercontent.com/hmrc/individuals-disclosures-api/main/resources/public/api/conf/2.0/application.yaml):
- `/individuals/disclosures/marriage-allowance/{nino}` and `/individuals/disclosures/{nino}/{taxYear}`.

---

## 2. OAuth 2.0 user-restricted flow

Source: https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints
plus each OAS `securitySchemes` block.

- Grant type: **`authorization_code`** (with `refresh_token` grant for renewal).
- Scopes for the whole MTD IT family: **`read:self-assessment`** and **`write:self-assessment`** (every endpoint's
  `security` block in the OAS files uses exactly these two). Scope param is space-delimited, URL-encoded.
- Endpoints (OAS): authorize `https://api.service.hmrc.gov.uk/oauth/authorize`, token
  `https://api.service.hmrc.gov.uk/oauth/token`, refresh `https://api.service.hmrc.gov.uk/oauth/refresh`.
  The docs page shows the sandbox authorization UI host as `https://test-www.tax.service.gov.uk/oauth/authorize`
  and sandbox token endpoint `https://test-api.service.hmrc.gov.uk/oauth/token`.
- Authorization code: **single-use, expires after 10 minutes**.
- Access token: **lasts 4 hours**.
- Refresh token: **single-use** ("You can only use a refresh_token once") — each refresh returns a new
  refresh token. **After 18 months, refresh tokens stop working** and the user must re-authorise (expired
  refresh → HTTP 400, error `invalid_grant`).
- `redirect_uri` must exactly match one registered on the application.
- Sandbox auth journey has **no 2-step verification or identity checks**
  (https://developer.service.hmrc.gov.uk/api-documentation/docs/testing).

## 2a. Fraud prevention headers (legally required)

Every MTD IT OAS carries this warning: "**You are required by law to submit header data for this API. This
includes all associated APIs and endpoints.**" Spec: https://developer.service.hmrc.gov.uk/guides/fraud-prevention/.
Validate with the **Test Fraud Prevention Headers API** v1.0
(https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/txm-fph-validator-api/1.0).

---

## 3. Sandbox: applications, test users, Test Support APIs

Sources: https://developer.service.hmrc.gov.uk/api-documentation/docs/testing and
https://developer.service.hmrc.gov.uk/api-documentation/docs/testing/test-users-test-data-stateful-behaviour

- **Application**: register on the Developer Hub, "Add a sandbox application", subscribe it to the APIs you need,
  get sandbox-only client ID/secret from the credentials page. Sandbox apps are **auto-deleted if they make no
  API call within 30 days of creation**, and removed after 6 months of inactivity.
- **Test users**: create via the Developer Hub UI ("create test user service") or the **Create Test User API v1.0**
  (needed for agents and automated testing). Endpoints
  (https://raw.githubusercontent.com/hmrc/api-platform-test-user/main/resources/public/api/conf/1.0/application.yaml):
  - `POST /create-test-user/individuals`
  - `POST /create-test-user/organisations`
  - `POST /create-test-user/agents`
  - `GET /create-test-user/services`
  For MTD IT, create an individual with `serviceNames: ["mtd-income-tax"]` — "Generates a National Insurance
  number and a Making Tax Digital Income Tax ID and enrols the user for Making Tax Digital Income Tax"
  (create-individual-request.json schema). `"self-assessment"` adds an SA UTR. Identifiers are generated —
  "you cannot choose them". **Test users not used within 3 months are automatically deleted.**
- **Self Assessment Test Support (MTD) API v1.0** (sandbox-only; user-restricted; service name
  `mtd-sa-test-support-api`). Endpoints
  (https://raw.githubusercontent.com/hmrc/mtd-sa-test-support-api/main/resources/public/api/conf/1.0/application.yaml):
  - `DELETE /individuals/self-assessment-test-support/vendor-state` — wipe your stateful test data
  - `POST/GET /…/vendor-state/checkpoints`, `DELETE /…/checkpoints/{checkpointId}`,
    `POST /…/checkpoints/{checkpointId}/restore` — checkpoint/restore sandbox state
  - `POST /…/business/{nino}` — **Create a Test Business**; `DELETE /…/business/{nino}/{businessId}`
  - `POST/PUT /…/itsa-status/{nino}/{taxYear}` — **Create and Amend Test ITSA Status**
  The SE cumulative endpoint's STATEFUL scenario doc explicitly requires a test business created via this API,
  and says stateful cumulative submissions support both **standard** and **calendar** update types, with annual/
  latent submissions driven by test-business latency and test ITSA status.
- **Three sandbox behaviour classes** (testing docs): *stateless* (canned responses), *stateful* ("send test data
  through create (POST) or update (PUT) requests and then read back that same data through GET"), and *supported
  stateful* (GET-only APIs paired with a test support API to seed data). Where data can't be cleared, "the best
  way to start anew is to create a new test user."

---

## 4. Gov-Test-Scenario headers

- Sandbox-only request header `Gov-Test-Scenario`; every endpoint documents its accepted values in a "Test data"
  table in its OAS description. Omitting it = DEFAULT success simulation.
- **`STATEFUL`** — performs a real create/update/retrieve against your sandbox state (per-endpoint; e.g. SE and
  property cumulative summaries, ITSA status).
- **`DYNAMIC`** — response echoes values from your request (e.g. Obligations income-and-expenditure with magic
  businessIds `XBIS12345678901` self-employment / `XPIS12345678901` UK property / `XFIS12345678901` foreign).
- **`CUMULATIVE`** — Obligations: "Simulates a success response with cumulative quarterly updates."
- Error simulations are endpoint-specific, e.g. Trigger Calculation: `NO_INCOME_SUBMISSIONS_EXIST`,
  `FINAL_DECLARATION_RECEIVED`, `TAX_YEAR_NOT_ENDED`, `CALCULATION_IN_PROGRESS`; Submit Final Declaration:
  `OUTSIDE_AMENDMENT_WINDOW`, `FINAL_DECLARATION_IN_PROGRESS`, `SUBMISSION_FAILED`; SE cumulative:
  `EARLY_DATA_SUBMISSION_NOT_ACCEPTED` ("cannot submit data more than 10 days before end of Period"),
  `START_DATE_NOT_ALIGNED_TO_COMMENCEMENT_DATE`, `END_DATE_NOT_ALIGNED_WITH_REPORTING_TYPE`,
  `SUBMISSION_END_DATE_CANNOT_MOVE_BACKWARDS`, `BOTH_EXPENSES_SUPPLIED`.
  (Sources: the endpoint YAML files cited in §1d.)

---

## 5. Rate limits & platform mechanics

Source: https://developer.service.hmrc.gov.uk/api-documentation/docs/reference-guide

- **Standard limit: 3 requests per second per application.** Exceeding it returns **HTTP 429** with error code
  **`MESSAGE_THROTTLED_OUT`**. (Higher limits negotiable with HMRC support.)
- Versioning via the Accept header: `application/vnd.hmrc.[version]+json` (e.g. `application/vnd.hmrc.5.0+json`
  for SE Business v5.0). Backwards-incompatible changes only ship in new versions.
- IP allow-listing available (CIDR, largest netmask /24).
- Standard error codes: 401 `MISSING_CREDENTIALS`/`INVALID_CREDENTIALS`, 403, 404 `MATCHING_RESOURCE_NOT_FOUND`,
  429, 5xx.
- Responses carry `X-CorrelationId`; deprecated versions signal via `Deprecation` and `Sunset` headers
  (defined in every OAS common/headers.yaml).

---

## 6. What changed 2025–2026 (from hmrc/income-tax-mtd-changelog, the official changelog)

Source: https://raw.githubusercontent.com/hmrc/income-tax-mtd-changelog/main/README.md ("the date shown is the
date that the change was released to Sandbox or Production"). Roadmap:
https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/ (linked from changelog).

### The cumulative-quarterly-updates shift (the big one)
For **tax years 2025-26 onwards** quarterly updates moved from four standalone period summaries to a single
**cumulative period summary per business per tax year**, PUT-overwritten each quarter with year-to-date figures
(SE Business v5.0, Property Business v6.0). Old `period` endpoints remain for TY ≤ 2024-25. Corrections =
resubmit the cumulative summary; no separate correction cycle. The **End of Period Statement is gone** — its
obligations endpoint was removed from the Obligations API on **20 Aug 2025**; year-end adjustment now flows
through BSAS + annual submissions + final declaration.

### Version timeline (release → deprecation → retirement)
- **Obligations v3.0**: Sandbox 11 Dec 2024, Production 14 Apr 2025 (v3.0 introduced lowercase `open`/`fulfilled`
  status values and the `CUMULATIVE` scenario). **v2.0 retired 28 Oct 2025.**
- **Self Employment Business v5.0, Property Business v6.0, Individual Losses v6.0**: Sandbox 24 Mar 2025,
  **Production 16 Jun 2025** (cumulative period summary endpoints). SE **v3.0 and Property v4.0 retired
  28 Oct 2025**.
- **BSAS v7.0, Self Assessment Accounts v4.0, Individuals Expenses v3.0**: Production 16 Jun 2025.
  BSAS **v5.0 and BISS v2.0 retired 28 Oct 2025**.
- **Individual Calculations v8.0**: Sandbox 13 Jun 2025, **Production 15 Sep 2025**. v7.0 deprecated 16 Oct 2025,
  **retired 1 May 2026**. (v5.0 retired 25 Sep 2025.)
- **Business Details v2.0**: Sandbox 16 Jun 2025, **Production 15 Sep 2025** (adds accounting-type, periods of
  account, late-accounting-date-rule endpoints; TY 2025-26+ for the write endpoints). v1.0 deprecated
  16 Oct 2025, **retired 1 May 2026**.
- **16 Apr 2026 deprecations**: Individuals Capital Gains Income v2.0, Individuals Reliefs v2.0.

### TY 2026-27 wave (Sandbox 23 Mar 2026 → Production 16 Jun 2026)
- **Individual Losses v7.0**: consolidated Retrieve/Create-or-Amend/Delete "Losses and Claims" endpoints for
  TY 2026-27+ (replacing the separate brought-forward-losses and loss-claims model). Production 16 Jun 2026.
- **Individuals Partner Income API v1.0** (new): partner income submissions, TY 2026-27+. Production 16 Jun 2026.
- **Individuals Tax Liability Adjustments API v1.0** (new): TY 2026-27+. Production 16 Jun 2026.
- **Individual Calculations v8.0 reshaped for 2026-27** (16 Jun 2026): losses/claims arrays removed from
  calculation inputs (moved to the new Losses model), `partnerIncome` objects added, student loan `plan5`,
  new NIC fields.
- Obligations sandbox data updated (Dec 2025) for **aligned quarterly due dates for TY 2026-27 onwards**.
- ITSA status vocabulary: `Digitally Exempt` added (24 Mar 2026); deprecated `Non Digital` removed (18 Jun 2026).
  (Note: the 18 Jun 2026 changelog entry mislabels Self Assessment Individual Details as "version 7.0" — the
  Developer Hub lists v2.0 as current; treat the changelog line as a typo.)

---

## 7. Product-shaping engineering conclusions for TaxSorted

1. **Minimum viable API set for a sole-trader + landlord product (TY 2025-26 live now)**: Business Details v2.0,
   Obligations v3.0, Self Employment Business v5.0 (cumulative endpoint), Property Business v6.0 (UK cumulative +
   annual), Individual Calculations v8.0 (trigger `in-year`/`intent-to-finalise` + retrieve + submit final
   declaration), BSAS v7.0, Individual Losses (v6 for ≤2025-26 years, v7 for 2026-27+), Self Assessment
   Individual Details v2.0 (ITSA status gate), plus the supplementary income APIs relevant to each user's other
   income for the final declaration, and Self Assessment Accounts v4.0 for "what do I owe" UX.
2. **Quarterly flow is now trivial to model**: one PUT of cumulative year-to-date figures per business per
   quarter against `/cumulative/{taxYear}`; check `/obligations/details/{nino}/income-and-expenditure` for due
   dates and fulfilment.
3. **Final declaration flow**: trigger `intent-to-finalise` → poll retrieve (≥5 s) → show calc → user agrees →
   POST final declaration (`final-declaration`). Post-final-declaration amendments (TY 2025-26+): trigger
   `intent-to-amend` → `confirm-amendment`.
4. **Plan for version churn**: HMRC ships a new major version wave roughly every spring (sandbox ~March,
   production ~June), deprecates in autumn, retires ~6 months later. Watch `Deprecation`/`Sunset` headers and
   the changelog repo (releases feed).
5. **Fraud prevention headers are a legal requirement** and a build-cost item from day one; validate with the
   FPH Test API before production credentials.
6. **Sandbox CI**: create test user (`mtd-income-tax`) → create test business via SA Test Support API → set test
   ITSA status → drive STATEFUL scenarios; use checkpoints/restore for repeatable suites; test users rot after
   3 months, sandbox apps after 30 days idle — CI must recreate them.
7. Not verified in this session (out of scope, flag for the production-access research thread): the exact
   production-approval / minimum-functionality-standards process for becoming "HMRC-recognised" software — the
   end-to-end service guide (https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/)
   notes these standards were updated June 2026.

## Fetched-source index
- https://developer.service.hmrc.gov.uk/api-documentation/docs/api
- https://developer.service.hmrc.gov.uk/api-documentation/docs/api?filter=income-tax-mtd
- https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/
- https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints
- https://developer.service.hmrc.gov.uk/api-documentation/docs/reference-guide
- https://developer.service.hmrc.gov.uk/api-documentation/docs/testing
- https://developer.service.hmrc.gov.uk/api-documentation/docs/testing/test-users-test-data-stateful-behaviour
- https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/mtd-sa-test-support-api/1.0
- https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/api-platform-test-user/1.0
- Per-API overview pages: …/api/service/self-employment-business-api/5.0, property-business-api/6.0,
  business-details-api/2.0, obligations-api/3.0
- OAS files (HMRC GitHub, raw): self-employment-business-api 5.0 (application, create_amend_cumulative_period_summary,
  retrieve_cumulative_period_summary), property-business-api 6.0 (application, uk_property_cumulative_summary,
  uk_property_cumulative_summary_create_or_amend), business-details-api 2.0 (application,
  quarterly_period_type_create_amend, retrieve), obligations-api 3.0 (application,
  retrieve_income_tax_income_expenditure, retrieve_income_tax_crystallisation), individual-calculations-api 8.0
  (application, trigger, submit_final_declaration, common/pathParameters), individual-losses-api 7.0
  (application, losses_and_claims), self-assessment-bsas-api 7.0 (application), self-assessment-biss-api 3.0
  (application), individuals-disclosures-api 2.0 (application), self-assessment-accounts-api 4.0 (application),
  self-assessment-individual-details-api 2.0 (application, ITSA_Status_retrieve), mtd-sa-test-support-api 1.0
  (application), api-platform-test-user 1.0 (application, schemas/create-individual-request.json)
- https://raw.githubusercontent.com/hmrc/income-tax-mtd-changelog/main/README.md (+ GitHub releases API)
