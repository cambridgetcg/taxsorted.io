# taxsorted-rails (local: /Users/yuai/Projects/taxsorted-rails)

Remote: github.com/cambridgetcg/taxsorted.io (PRIVATE). Last commit 2026-06-12
(`1075695 fix(rails): accept HMRC's reply however it spells the VRN`). 22 commits total.
Purpose of this analysis: what carries from this MTD VAT build into an open-sourced
MTD Income Tax (ITSA) filing engine.

## Verdict in one line

A small, unusually clean, LIVE MTD VAT sandbox rail — server-side HMRC OAuth, encrypted
token vault, split-collection fraud headers, engine-validated idempotent submission with
immutable receipts — where ~70% of the HMRC plumbing carries to ITSA verbatim and the
VAT-specific parts are cleanly quarantined in `engine/jurisdictions/uk/vat/` and
`api/src/routes/vat.ts`.

## Architecture

npm workspaces monorepo, TypeScript throughout, three workspaces:

- `engine/` — pure TS library, no server. `jurisdictions/uk/vat/` (9-box compute from
  transactions, Flat Rate optimiser, VRN mod-97 validation, deadlines, plain-English
  explain/summary layer, effective-dated config `Dated`/`pick`) +
  `jurisdictions/uk/hmrc/` (endpoint config, browser fraud-header collection, VAT API
  client + `validateVATReturnData` shared by UI and API — "one engine, one truth").
  Exports map: `@taxsorted/engine/uk/vat`, `@taxsorted/engine/uk/hmrc` (raw .ts, run
  via tsx/bundler — no build step).
- `api/` — Hono + @hono/node-server + postgres.js + zod 4. ~900 lines across 7 src
  files + 1 migration. Routes: `/v1/health`, `/v1/entities` (CRUD),
  `/v1/entities/:id/{obligations,liabilities,submissions,returns}` (VAT rail),
  `/v1/hmrc/{status,test-user,start/:entityId,callback,connection/:entityId}` (OAuth).
- `frontend/` — Next.js 16.1.6 App Router **static export** (no server runtime),
  React 19.2.3, Tailwind 4, Radix UI. `/vat` cockpit is the real client of the api;
  demo "sample books" routes kept separately. Typed api client in
  `frontend/src/lib/api.ts` ("the same surface an agent would call").
- `research/` — large markdown corpus (Learn pillar): `uk/filing/mtd/mtd-requirements.md`
  covers MTD ITSA phases; `uk/filing/forms/hmrc/{sa100,sa800,sa900,ct600}.md` exist —
  real ITSA research substrate already present.
- `PRINCIPLES.md` — design language: derive-never-key, both-worlds (human UI + agent
  API from one engine), prepare-vs-file honestly distinct, plain words.

## Deploy state — LIVE (verified 2026-07-02)

- Fly.io app **`taxsorted-api`**, region lhr, `api/fly.toml`. 2 machines (1 started,
  1 suspended), image version 6 deployed ~2026-06-13 — matches last commit, no drift.
  shared-cpu-1x / 256MB, scale-to-zero (`auto_stop_machines = "suspend"`,
  `min_machines_running = 0`) → cold-start latency on first request (a 10s-timeout
  curl returned 000 before a retry got 200).
- `https://api.taxsorted.io/v1/health` and `https://taxsorted-api.fly.dev/v1/health`
  → `{"ok":true,"hmrc":{"configured":true,"env":"sandbox"}}`. Custom-domain cert Ready.
- **HMRC sandbox credentials ARE set**: `fly secrets list` shows DATABASE_URL,
  HMRC_CLIENT_ID, HMRC_CLIENT_SECRET, HMRC_ENV, TOKEN_KEY (all Deployed). The RUNBOOK's
  "waiting for credentials" is stale — the rail is switched on, sandbox env.
- Frontend live at `https://taxsorted.io` (Cloudflare Pages, 200 OK).
- CI (`.github/workflows/deploy.yml`): push→ npm ci → test (all workspaces, gates
  build) → build → CF Pages deploy (gated on CLOUDFLARE_API_TOKEN secret presence) →
  Fly deploy (gated on FLY_API_TOKEN presence). Deploy steps skip gracefully when
  secrets absent.
- Docker: node:22-alpine, `npm ci --omit=dev --workspace api`, runs `tsx api/src/index.ts`
  directly (no compile step), USER node.

## HMRC OAuth flow (api/src/hmrc.ts + routes/connect.ts + crypto.ts)

- Authorization-code grant, server-side (confidential client). Scope hardcoded
  `read:vat write:vat` in `authorizeUrl()`.
- State: HMAC-SHA256-signed JSON `{entityId, sessionId, exp}` (10-min TTL),
  base64url `payload.sig`, timing-safe compare; callback verifies state AND that
  `sessionId` matches the caller's cookie — callback can only land on the entity/session
  that started it. Redirect URI fixed: `{API_ORIGIN}/v1/hmrc/callback` (HMRC requires
  exact registration — verified per RUNBOOK).
- Token vault: AES-256-GCM (12-byte IV, 16-byte tag, base64 blob) with HKDF-SHA256
  key separation from one 64-hex `TOKEN_KEY` (labels "vault" vs "state" — neither key
  can substitute for the other). Tokens encrypted at rest in `hmrc_connections`
  (1 row per entity, upsert on reconnect).
- Refresh: transparent in `accessToken()` when <60s to expiry; re-stores rotated pair.
- Revoke: best-effort POST /oauth/revoke for both tokens on disconnect, then row delete.
- Boot: `assertBootConfig()` refuses to start without DATABASE_URL and a 64-hex
  TOKEN_KEY; HMRC credentials optional — rail reports `configured:false` honestly.

## Fraud prevention headers (Gov-Client-*) — WEB_APP_VIA_SERVER split

Design (good): browser collects only what the browser can see
(`engine/uk/hmrc/fraud-headers.ts` → timezone, screens, window-size, JS user agent,
plugins, DNT), forwarded to the api under a strict server-side allowlist
(`api/src/fraud.ts` CLIENT_ALLOWLIST, mirrored in CORS allowHeaders); server asserts
the rest: Connection-Method=WEB_APP_VIA_SERVER, Device-ID (durable `ts_device` cookie
UUID, regenerated if malformed), User-IDs (`taxsorted=<sessionId>`), Public-IP +
Public-IP-Timestamp from `fly-client-ip` ONLY (X-Forwarded-For explicitly distrusted),
Gov-Vendor-Forwarded, Gov-Vendor-Version, Gov-Vendor-Product-Name,
Gov-Vendor-Public-IP from `GOV_VENDOR_PUBLIC_IP` env.

Completeness vs HMRC spec for WEB_APP_VIA_SERVER — **incomplete**:
- Missing entirely: `Gov-Client-Public-Port` (not obtainable from Fly's header set),
  `Gov-Client-Multi-Factor` (no MFA exists — anonymous sessions), `Gov-Vendor-License-IDs`.
- `GOV_VENDOR_PUBLIC_IP` is NOT among the Fly secrets and not in fly.toml env →
  `Gov-Vendor-Public-IP` is omitted and `Gov-Vendor-Forwarded` is emitted as
  `by=&for=<ip>` (empty `by=` — spec-violating as deployed).
- Never validated against HMRC's **Test Fraud Prevention Headers API** — RUNBOOK
  explicitly lists this as pending; HMRC audits these headers before production approval.
- Vendor version strings disagree: engine config says 1.0.0, api/src/fraud.ts says 0.1.0.
- Engine `getDeviceId()` returns literal `"server-generated"` server-side (unused on
  the server path, but a landmine if anyone calls the engine client from Node).

## VAT endpoints actually wired (api/src/routes/vat.ts)

- GET `/organisations/vat/{vrn}/obligations` (default `status=O`, or from/to) —
  passthrough of `Gov-Test-Scenario` in sandbox.
- GET `/organisations/vat/{vrn}/liabilities` (from/to, ISO-date validated).
- POST `/organisations/vat/{vrn}/returns` — double gate (zod shape incl.
  `finalised: z.literal(true)`, then engine `validateVATReturnData` re-run server-side);
  **one submission per period ever**: pre-check + `unique(entity_id, period_key)` with
  23505 race recovery returning the winning receipt (409 `already_filed`). Receipt +
  payload + `X-CorrelationId` stored in immutable `submissions`.
- GET `/v1/entities/:id/submissions` — local receipts.
- Engine additionally defines viewReturn / payments / penalties endpoints + client fns
  (`getVATReturn`, `getVATPayments`, `getVATPenalties`) — NOT exposed through api routes.
- Rate limit: in-process sliding-window 3 req/s (HMRC's limit) in hmrc.ts — per-machine
  only; with 2 Fly machines the app could exceed it.
- `hmrcRequest` core: bearer auth, `Accept: application/vnd.hmrc.1.0+json` (hardcoded
  v1.0), fraud-header spread, Gov-Test-Scenario in sandbox, correlation-id capture by
  temporarily grafting `_correlationId` onto the parsed body (routes delete it before
  responding — works but fragile), `HmrcError(status, message, body)` with 428
  "not connected" convention and 5xx→502 mapping. Error redaction discipline: never
  dump upstream bodies (taxpayer data); on shape mismatch name the keys, never values.

## Test-user minting (sandbox practice door)

`POST /v1/hmrc/test-user` — exists only when `HMRC_ENV=sandbox` (404 `no_such_door`
in production, tested), 503 `rail_not_configured` without credentials (tested).
Flow: client_credentials app token → `POST /create-test-user/organisations` with
`serviceNames: ["mtd-vat"]` → tolerant response parsing (`vatRegistrationNumber` OR
`vrn` — the last commit's fix), returns userId/password/vrn/name. No human handles a
secret; diagnostics name response keys, never values. RUNBOOK documents the full
end-to-end sandbox proof procedure (mint → connect → obligations → file → receipt).

## Database / storage

Postgres (postgres.js, pool max 5) — DATABASE_URL on Fly (likely Fly Postgres).
Migrations: plain .sql in `api/migrations/`, applied sequentially at boot inside a
transaction, tracked in `_migrations`. Schema v1 (`001_init.sql`):
`sessions` (anon) → `entities` (kind ∈ person/business/charity/trust, `vrn` text,
cascade) → `hmrc_connections` (UNIQUE entity_id, encrypted token pair, env, scope,
expires_at) → `submissions` (immutable: payload jsonb, receipt jsonb, correlation_id,
UNIQUE(entity_id, period_key)). Comment: "Records/figures arrive in a later migration"
— i.e. **no bookkeeping/records storage exists yet** (transactions live client-side only).

## Auth / sessions

Anonymous device sessions (`api/src/session.ts`): `ts_session` (uuid row in DB,
last_seen touch) + `ts_device` (uuid feeding Gov-Client-Device-ID), both httpOnly,
Secure in prod, SameSite=Lax, host-only, 1-year maxAge (within the 400-day cap —
that was a dedicated fix commit). No accounts, no sign-out, no revocation. The repo
is honest about this: RUNBOOK's hard preconditions for production = real accounts,
scrubbed HMRC error bodies, fraud-header re-test.

## Tests — all green (run 2026-07-02, Node 25)

87 tests: engine 55 (vat-engine, teaching layer, hmrc config), frontend 12 (mock-data),
api 20 (crypto roundtrip + state signing/expiry/tamper, sandbox-door gating by env,
return contract: zod gate + engine validation incl. box-3/box-5 arithmetic, whole-pound
boxes, finalised). CI runs them before every build. Gaps: no tests for hmrc.ts
(refresh path), fraud.ts, session.ts, or any route touching Postgres (no DB harness);
no HMRC-sandbox integration tests; the zod schema is duplicated in the test file
instead of imported (comment admits it — drift risk).

## Code quality

High. Small single-purpose modules, plain-language naming and comments, honest error
vocabulary (`no_such_door`, `rail_not_configured`, `already_filed`), consistent
redaction discipline, security choices reasoned in comments (host-only cookies,
fly-client-ip vs XFF, key separation). Deps are current-generation (mid-2026): Next 16,
React 19, zod 4, hono ^4.7, vitest ^4, node 22 container. Nothing stale. `tsx` runs
TS directly in the 256MB prod container (no build step — fine at this scale).

## What carries over VAT → ITSA (the open-source commons build)

Reusable nearly verbatim:
- **OAuth dance**: `api/src/routes/connect.ts` + authorize/exchange/refresh/revoke in
  `api/src/hmrc.ts`. Only the scope string changes (`read:self-assessment
  write:self-assessment`) — parameterize per rail.
- **Token vault + signed state**: `api/src/crypto.ts` — fully generic, well tested.
- **Fraud-header pipeline**: `api/src/fraud.ts` + `engine/uk/hmrc/fraud-headers.ts` +
  the CORS allowlist pattern — identical legal requirement for ITSA (fix the gaps once,
  both rails benefit).
- **`hmrcRequest` core**: rate limit, bearer, test-scenario, correlation-id, HmrcError
  taxonomy — generic, but the Accept header must become per-endpoint (ITSA APIs are
  versioned v2–v8 per API, not uniform 1.0).
- **Test-user minting door**: same HMRC endpoint; `serviceNames: ["mtd-income-tax"]`,
  response yields nino/mtdItId instead of vrn — the tolerant-parsing pattern and the
  sandbox-only gating carry directly.
- **Session/device plumbing** (device-id → Gov-Client-Device-ID), migrations runner,
  **immutable-receipts pattern** (submissions table shape generalizes to quarterly
  updates + final declaration receipts), config/boot assertions, CORS setup.
- **Deploy skeleton**: fly.toml + Dockerfile + gated CI workflow; RUNBOOK-as-genre.
- **Engine architecture**: jurisdiction-plugin layout, one import surface, shared
  UI/API validation, `Dated`/`pick` effective-dating, plain-English explain layer —
  the pattern (not the VAT content) is the asset.
- **Frontend typed api client** pattern (`frontend/src/lib/api.ts`) incl. browser
  fraud-collection piggyback.
- **Research corpus**: `research/uk/filing/mtd/mtd-requirements.md` (has an ITSA
  section), sa100/sa800/sa900 form docs, deadlines/penalties research.

VAT-specific (does NOT carry):
- All of `engine/jurisdictions/uk/vat/` (9-box compute, FRS optimiser, VRN check,
  VAT deadlines/teaching copy).
- `api/src/routes/vat.ts` paths (`/organisations/vat/{vrn}/…`); ITSA lives under
  `/individuals/business/…` keyed by NINO + businessId, obligations are quarterly
  updates + final declaration, and **calculations are HMRC-side** (trigger + retrieve
  Individual Calculation) rather than client-computed boxes — a structurally different
  submit flow.
- `entities.vrn` column and the VRN-required middleware → needs nino/mtdItId and a
  business(es) sub-model.

Missing for ITSA (build list):
- Entire ITSA endpoint set: Business Details, Obligations, Self-Employment/Property
  cumulative period summaries, Individual Calculations (trigger/retrieve), Final
  Declaration, annual adjustments/allowances.
- Records storage ("later migration" never arrived) — quarterly updates need cumulative
  income/expense records and a digital-links story.
- Multi-rail connection model: `hmrc_connections` is one row per entity with one scope
  string; VAT+ITSA on one entity needs per-rail rows or scope union.
- Real accounts/auth (self-declared hard precondition), HMRC production approval,
  fraud-header validation via the test API.

## Hazards / debt

1. **GitHub OAuth token embedded in the git remote URL** (`.git/config`:
   `https://x-access-token:gho_…@github.com/cambridgetcg/taxsorted.io`) — plaintext on
   disk; rotate it and switch to the gh credential helper. Never copy the `.git` dir
   into an open-source extraction. (Tracked tree and full 22-commit history are clean —
   scanned: no .env/keys/secret-strings ever committed; .gitignore hardened.)
2. **engine imports `date-fns` without declaring it** (engine/package.json has no
   dependencies; works only via workspace hoisting from frontend) — breaks the moment
   the engine is extracted/open-sourced standalone. The api Docker image survives only
   because its import path happens to avoid compute.ts.
3. **Refresh-token rotation race**: HMRC refresh tokens are single-use; two concurrent
   requests hitting a stale token both refresh, the loser strands an invalidated
   refresh token in the vault → connection silently breaks. No per-entity lock.
4. **Fraud headers incomplete as deployed** (see section above): no Public-Port /
   Multi-Factor / License-IDs; GOV_VENDOR_PUBLIC_IP unset → malformed
   `Gov-Vendor-Forwarded` (`by=&for=…`); never run through HMRC's header-test API;
   vendor version mismatch 0.1.0 vs 1.0.0. Must be fixed before production approval —
   same work serves ITSA.
5. **Anonymous 1-year cookie is the only key** to entities and encrypted HMRC tokens —
   acknowledged production blocker, fine for sandbox.
6. **Rate limiter is per-process** while 2 Fly machines exist — app-wide 3 rps can be
   exceeded; also implemented via recursion (harmless at this depth).
7. Zod submit schema duplicated in the test rather than exported/imported — drift risk.
8. `Accept: application/vnd.hmrc.1.0+json` hardcoded — blocks multi-version ITSA APIs.
9. `frontend/public/ember.js` fetches `https://ai-love.cc/data/pulse.json` — that
   domain was repurposed ~2026-06-27, so the ember is likely dead (fails silently);
   it's also a personal artifact to strip before open-sourcing.
10. RUNBOOK/CLAUDE.md say credentials are pending — stale; they are live in Fly secrets
    (sandbox). Docs drift.
11. Engine money is floating-point pounds (correct for the HMRC VAT JSON contract,
    with careful rounding helpers), but the promised minor-units core abstraction was
    never extracted — decide deliberately for ITSA sums.
12. Minor: Cloudflare account id committed in the workflow; engine tokens TTL config
    declared but unused; `getVATReturn/getVATPayments/getVATPenalties` engine fns
    unexposed (dead surface).

## Key file map

- api/src/hmrc.ts — OAuth + vault + rate limit + hmrcRequest + test-user minting
- api/src/crypto.ts — AES-256-GCM vault, HKDF key separation, signed state
- api/src/fraud.ts — server-side Gov-* assembly (WEB_APP_VIA_SERVER)
- api/src/session.ts — anon session + device cookies, entity ownership
- api/src/routes/{connect,vat,entities}.ts — OAuth dance / VAT rail / entity CRUD
- api/migrations/001_init.sql — sessions→entities→connections→submissions
- api/RUNBOOK.md — how the rail switches on + production preconditions
- engine/jurisdictions/uk/hmrc/{config,fraud-headers,vat-api}.ts — HMRC client layer
- engine/jurisdictions/uk/vat/ — the VAT-specific brain (pattern reusable, content not)
- frontend/src/lib/api.ts — the typed client agents would call
- .github/workflows/deploy.yml — gated CF Pages + Fly deploy
- api/fly.toml — app `taxsorted-api`, lhr, scale-to-zero
