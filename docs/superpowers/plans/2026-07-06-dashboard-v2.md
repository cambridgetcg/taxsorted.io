# Dashboard v2 Implementation Plan — the ITSA Cockpit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock-data dashboard with an honest ITSA cockpit: where-you-stand strip, records/estimate/quarter cards from real local data, a REAL HMRC sandbox connect panel (first ITSA bytes through our pipes), and a civic "your voice" panel — one screen that tells a sole trader where they stand and what's next.

**Architecture:** Frontend stays static-export; all HMRC traffic goes through the existing `api/` (Hono on Fly, OAuth vault, fraud headers) which gains ITSA sandbox endpoints. The old mock-data dashboard page is REPLACED (mock data violates the honesty line); the VAT cockpit at /vat stays untouched. Aesthetic: calm bento grid on the existing paper/ink/accent tokens — big cited numbers, status pills, generous whitespace; no new UI deps.

**Tech Stack:** existing stack only. Engine `uk/itsa` for all derivations; `frontend/src/lib/api.ts` client extended for ITSA endpoints.

## Global Constraints

- **No fake states, ever**: sandbox connections badged "Sandbox demo — production filing unlocks with HMRC recognition"; no mock figures anywhere; empty states are honest prompts, not sample numbers.
- Money integer pence in engine/api; `gbp`/`gbpCompact` at display. Every tax figure Cited or engine-derived (zero hardcoded rates).
- HMRC calls: reuse `api/src/hmrc.ts` `hmrcRequest` + vault + fraud pipeline; Accept version PER ENDPOINT (Obligations v3.0 → `application/vnd.hmrc.3.0+json`; SA Individual Details v2.0 → `application/vnd.hmrc.2.0+json`); ITSA OAuth scope `read:self-assessment` (+`write:self-assessment` only when submission lands, NOT now).
- Sandbox-only guard on new ITSA routes exactly like the test-user door pattern (404 `no_such_door` in prod env).
- Static-export constraints; jsdom docblock for component tests; i18n deferred comments; copy discipline ("working towards HMRC recognition", never "approved").
- All suites stay green (engine 128, frontend 79, api 20 + new). Commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: api — ITSA sandbox rails (scope, status, obligations)

**Files:**
- Modify: `api/src/hmrc.ts` (parameterise scope + Accept version), `api/src/routes/connect.ts` (rail param: `vat` | `itsa` — itsa uses `read:self-assessment` scope)
- Create: `api/src/routes/itsa.ts` (GET `/v1/itsa/status`, GET `/v1/itsa/obligations` — both sandbox-only-guarded, session-entity-bound like existing VAT routes)
- Test: `api/src/routes/__tests__/itsa.test.ts` (follow existing api test patterns — 20 existing tests show the mocking style)

**Interfaces:**
- Consumes: existing session/entity model, vault, `hmrcRequest`.
- Produces (frontend Task 3 depends on):
  - `GET /v1/itsa/status` → `{ taxYear: string, status: string /* HMRC itsaStatusDetails value passed through */, source: 'hmrc-sandbox' }` via SA Individual Details v2.0 `GET /individuals/person/itsa-status/{nino}/{taxYear}` (Accept 2.0; nino from the connected sandbox test-user's stored enrolment — persist nino on connect like vrn is today)
  - `GET /v1/itsa/obligations` → `{ obligations: [{ periodStart, periodEnd, dueDate, status: 'open'|'fulfilled' }], source: 'hmrc-sandbox' }` via Obligations v3.0 income-and-expenditure endpoint (Accept 3.0; Gov-Test-Scenario header passthrough for testing)
- Scope change is additive: `hmrc.ts` gains `scopeFor(rail)`; VAT behavior byte-identical (existing tests prove it).

- [ ] **Step 1: Failing tests** — itsa route tests: sandbox guard 404s in prod config; status endpoint returns mapped payload from mocked HMRC response; obligations maps periods+dueDate; connect with `rail=itsa` requests the `read:self-assessment` scope (assert on the authorize URL). Run api suite → new tests FAIL, existing 20 PASS.
- [ ] **Step 2: Implement** (scopeFor, acceptFor(endpoint), routes, nino persistence on itsa connect — study how VAT stores vrn and mirror it).
- [ ] **Step 3: GREEN** — full api suite; typecheck.
- [ ] **Step 4: Sandbox smoke** (manual, controller-verified later against live sandbox — NOT in CI): documented curl sequence appended to api/RUNBOOK.md ("The ITSA sandbox door") using the existing test-user mint flow.
- [ ] **Step 5: Commit** `feat(api): ITSA sandbox rails — status + obligations through the vault`.

### Task 2: Dashboard shell — the honest cockpit

**Files:**
- Rewrite: `frontend/src/app/(dashboard)/dashboard/page.tsx` (+ `dashboard-client.tsx`)
- Create: `frontend/src/components/dashboard-v2/stand-strip.tsx`, `frontend/src/components/dashboard-v2/quarter-timeline.tsx` (reuse/wrap existing prep cards for records+estimate — import QuarterCard/EstimateCard/quarterSummaryFor, do NOT duplicate)
- Delete usage of `mock-data` from the dashboard (file stays if /vat demo uses it; dashboard imports must be zero)
- Test: `frontend/src/components/dashboard-v2/__tests__/stand-strip.test.tsx`

Layout (bento grid, mobile-first): row 1 **Where you stand** — next deadline countdown (quartersFor + todayIsoLocal, mounted-gated), penalty position pill (2026-27 no-points badge with both-halves tooltip via Cited), eligibility prompt card (links /itsa/am-i-in; no stored verdict = honest "check in 60s" prompt); row 2 — Records YTD (quarterSummaryFor per source, links /itsa/records), Estimate headline (deriveFigures→estimateLiability, LOUD estimate label, links /itsa/quarter), QuarterTimeline (Q1-Q4, deadlines, current highlighted, fulfilled/open from local records presence — clearly "your records" not HMRC until connected); row 3 — HMRC connect panel (Task 3) + Your voice panel (Task 4); row 4 — VAT link card ("the VAT cockpit lives at /vat") replacing all mock widgets.

- [ ] Steps: RED (stand-strip test: renders deadline countdown from engine quarters; penalty pill text) → implement → GREEN + suite + build → commit `feat(web): dashboard v2 — honest ITSA cockpit shell`.

### Task 3: HMRC connect panel (sandbox, real OAuth)

**Files:**
- Create: `frontend/src/components/dashboard-v2/hmrc-panel.tsx`
- Modify: `frontend/src/lib/api.ts` (typed client methods: `itsaStatus()`, `itsaObligations()`, `connectUrl('itsa')` — follow existing VAT client patterns)
- Test: `frontend/src/components/dashboard-v2/__tests__/hmrc-panel.test.tsx` (mock the api client module)

States (all designed, no fake data): (a) api unreachable → quiet card "HMRC connection needs our api — it may be asleep, retry" (Fly scale-to-zero reality); (b) not connected → "Connect to HMRC (sandbox demo)" button → api OAuth dance, SANDBOX badge always visible + one-line "production filing unlocks with HMRC recognition — we're walking that path in the open" linking /learn/mtd-income-tax; (c) connected → ITSA status chip + obligations table (period, due date, open/fulfilled) each row noting sandbox source; disconnect button (existing revoke route). Fraud-header browser-collect piggyback exactly as the VAT flow does it (lib/api.ts already implements — reuse).

- [ ] Steps: RED → implement → GREEN + suite + build → commit `feat(web): HMRC sandbox connect panel — first ITSA bytes`.

### Task 4: Your-voice civic panel

**Files:**
- Create: `frontend/src/components/dashboard-v2/voice-panel.tsx`
- Test: `frontend/src/components/dashboard-v2/__tests__/voice-panel.test.tsx`

Content (ALL from `frontend/src/lib/gov/contacts.ts` + corpus URLs — zero invented links): "Find your MP" link-out (members.parliament.uk finder — note: your postcode never touches our site); Treasury Committee + Budget representations entries from ROLES (with as-of/staleness badge); "How tax law is made" teaser linking the gov guides WHEN they exist (feature-flag by route presence at build time is overkill — link /learn/gov/how-tax-law-is-made and land gov-pillar Tasks 2-5 BEFORE this ships to prod; ordering enforced at ship task); anti-phishing one-liner on any HMRC contact shown.

- [ ] Steps: RED (renders MP finder href + a staleness-badged role) → implement → GREEN + suite + build → commit `feat(web): your-voice civic panel`.

### Task 5: Ship gate

- [ ] Gov-pillar Tasks 2-6 complete (guides exist — civic panel links resolve).
- [ ] Full three-workspace suite + typecheck + build green.
- [ ] Controller: final whole-branch review (this plan + gov pillar together), merge main, push, manual `npm run deploy`, live verification: /dashboard renders cockpit; sandbox connect completes against api.taxsorted.io (controller does one real sandbox dance with a minted test user); civic links 200.

---

## Self-review notes
- Reuse discipline: records/estimate/quarter logic imported from prep components — the dashboard is composition, not re-derivation.
- The mock-data dashboard dies; nothing user-visible claims data it doesn't have. VAT cockpit untouched at /vat.
- API scope addition is additive + tested against VAT regression (existing 20 tests).
- Ordering: gov guides land before dashboard ships (Task 5 gate) so the civic panel never links 404s.
