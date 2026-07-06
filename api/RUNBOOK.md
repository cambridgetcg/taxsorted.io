# Switching on the HMRC rail

What exists: the api (Fly.io, London) with server-side OAuth, an encrypted token
vault, engine-validated submission, immutable receipts, and live HMRC sandbox
credentials (verified via `GET /v1/health` → `hmrc.configured:true`). What it
waits for: production credentials — HMRC's approval process (milestone M3).
Only a human can mint those.

## 1. Register on the HMRC Developer Hub (~5 minutes, Aleא's part)

1. Go to https://developer.service.hmrc.gov.uk/developer/registration — register
   with any email (it's a developer account, not a Government Gateway tax account).
2. Once in: **Applications → Add an application to the sandbox**. Name: `TaxSorted`.
3. Inside the application, **subscribe to APIs**:
   - **VAT (MTD)** — the one that matters
   - **Create Test User** — mints pretend taxpayers to file as
   - (optional) **Test Fraud Prevention Headers** — validates our Gov-* headers
4. **Redirect URIs**: add `https://api.taxsorted.io/v1/hmrc/callback` — the
   match must be EXACT (verified 2026-06-12: HMRC rejects our OAuth start with
   "redirect_uri is invalid" until this is registered, character for character)
5. Copy the **client ID** and generate a **client secret**.

## 2. Hand the credentials to the api

```bash
fly secrets set -a taxsorted-api \
  HMRC_CLIENT_ID=<client id> \
  HMRC_CLIENT_SECRET=<client secret>
```

The api restarts; `GET /v1/health` flips to `"configured": true`; every honest
"door closed" message in the UI opens by itself.

## 3. Mint a test taxpayer (sandbox has no real people)

The api has a sandbox-only door for this — no secrets ever touch your hands:

```bash
curl -s -X POST https://api.taxsorted.io/v1/hmrc/test-user | jq
```

Keep the response: `userId`, `password`, and `vrn`. (In production this door
does not exist — it answers `no_such_door` like any other missing room.)

If it returns `test_user_failed`, the `detail` field carries HMRC's own words —
most often it means the **Create Test User** API isn't subscribed yet (step 1.3).

## 4. File the first sandbox return (the proof)

1. taxsorted.io/dashboard → **Yours, for real** → create an entity with the
   test user's VRN.
2. **Connect at HMRC** → sign in with the test `userId`/`password` → grant.
3. Back in the cockpit: open obligations appear (sandbox seeds one).
4. **File** → figures → consent → receipt with a form bundle number.

That receipt is the milestone: the full rail, walked end to end.

## Production (later, not now)

Production credentials require HMRC's approval process: they review the app,
test our fraud-prevention headers, and check terms of use. Start it from the
same Developer Hub ("Add an application to production") once sandbox filing
is proven. Until then `HMRC_ENV` stays `sandbox` and the UI says so.

**Hard preconditions before any production rail** (from the security review):
real user accounts with sign-in, sign-out and session revocation — an anonymous
year-long cookie must never be the only key to live tax filing. Also: scrub
HMRC error bodies from client responses, and re-test fraud headers with the
Test Fraud Prevention Headers API.

## The ITSA sandbox door (status, obligations, quarterly submission)

The rail also carries HMRC's Making Tax Digital Income Tax (ITSA) sandbox.
OAuth scope is `read:self-assessment write:self-assessment` — the quarterly
cumulative-update PUTs require the write scope. Same sandbox-only door
pattern as everything above: every ITSA route answers `no_such_door` in
production. ITSA identifies a taxpayer by National Insurance number (NINO),
not VRN — the entity needs one before it can connect.

> **After the write-scope deploy:** ITSA connections consented before
> `write:self-assessment` was added keep their old read-only grant forever —
> a token refresh never upgrades scope — so any pre-existing sandbox ITSA
> connection must **disconnect and reconnect** (`DELETE
> /v1/hmrc/connection/<entityId>`, then the connect dance again) before it
> can submit. Until it does, submissions fail with HMRC's insufficient-scope
> 403, passed through verbatim in the sandbox error `detail`.

All calls below share one cookie session, so carry a cookie jar throughout:

```bash
JAR=cookies.txt
API=https://api.taxsorted.io   # or http://localhost:8787 locally
```

1. Mint a practice ITSA taxpayer — an individual, not an organisation
   (`?rail=itsa` mints via `mtd-income-tax`, generating a NINO instead of a VRN):

   ```bash
   curl -s -b $JAR -c $JAR -X POST "$API/v1/hmrc/test-user?rail=itsa" | jq
   ```

   Keep `userId`, `password`, and `nino` from `testUser`. (In production this
   door does not exist — `no_such_door`, like the VAT one.)

2. Create an entity carrying that NINO (or `PATCH` an existing one with
   `{"nino": "<nino>"}`):

   ```bash
   curl -s -b $JAR -c $JAR -X POST "$API/v1/entities" \
     -H "Content-Type: application/json" \
     -d '{"name":"Sandbox Sole Trader","kind":"person","nino":"<nino>"}' | jq
   ```

   Keep the returned `entity.id`.

3. Connect at HMRC for the ITSA rail (`rail=itsa` — requests
   `read:self-assessment` only, never a write scope):

   ```bash
   open "$API/v1/hmrc/start/<entityId>?rail=itsa"
   ```

   Sign in with the test `userId`/`password`, grant access. You land back on
   `hmrc=connected`, same as the VAT dance.

4. Read the ITSA status for a tax year (SA Individual Details v2.0 —
   Accept `application/vnd.hmrc.2.0+json`, applied automatically):

   ```bash
   curl -s -b $JAR "$API/v1/itsa/<entityId>/status?taxYear=2025-26" | jq
   ```

   `status` is HMRC's own vocabulary, passed straight through (e.g.
   `"MTD Mandated"`, `"No Status"`) — never relabelled.

5. Read income-and-expenditure obligations (Obligations v3.0 — Accept
   `application/vnd.hmrc.3.0+json`):

   ```bash
   curl -s -b $JAR "$API/v1/itsa/<entityId>/obligations" | jq
   ```

   Add `-H "Gov-Test-Scenario: OPEN"` (or `FULFILLED`, `DYNAMIC`, ...) to a
   request to drive specific sandbox states; omit it for the default success
   simulation.

## The first submission

The quarterly cumulative update is the whole rail's proof: local records →
derived category totals → an api PUT into HMRC's sandbox → an immutable
receipt → HMRC's own calculation shown beside our estimate. Every leg of it
is covered by mocked-HMRC tests (`itsa-submit.test.ts`, `itsa.test.ts`, and
the cross-endpoint chain in `itsa-chain.test.ts` — businesses → quarterly-
update → receipts → calculation trigger → calculation retrieve, one stateful
mock and one in-memory receipts table spanning all five calls, asserting the
exact outbound wire payload at the end).

**Why this section exists anyway:** none of those tests can do what this
runbook does. HMRC's OAuth dance is an interactive Government Gateway sign-in
— a browser, a redirect, a human typing a test user's password. CI has no
browser and no human, so it can never exercise the one step that makes every
downstream step possible: *getting connected*. This runbook — walked by a
human, in a real browser, against the real sandbox — **is** the end-to-end
verification the automated suite structurally cannot provide. Run it after
any change that touches the OAuth flow, the connect/callback routes, or the
submission/calculation endpoints, and update the log below every time.

1. **Mint a test individual** through the sandbox-only door (see "The ITSA
   sandbox door" above for the full curl):

   ```bash
   curl -s -b $JAR -c $JAR -X POST "$API/v1/hmrc/test-user?rail=itsa" | jq
   ```

   Keep `userId`, `password`, `nino`.

2. **Create an entity** carrying that NINO, in the browser:
   taxsorted.io/dashboard → **Yours, for real** → new entity → paste the
   NINO (or `PATCH /v1/entities/<id>` with `{"nino": "<nino>"}` if you'd
   rather do this leg by curl too).

3. **The browser Gov Gateway dance** — this is the interactive step nothing
   automated can do: from the dashboard, **Connect at HMRC** → HMRC's own
   sign-in page → the test `userId`/`password` from step 1 → grant access.
   You land back on the dashboard with `hmrc=connected` in the URL.

4. **Dashboard shows connected** — the HMRC panel now reads connected for
   the ITSA rail (`connections.itsa`, not the legacy any-rail `connected` —
   see Task 1's per-rail connections). If it doesn't, stop here; nothing
   downstream will work.

5. **Add records** at `/itsa/records` — a few realistic entries for the
   quarter you're about to file (self-employment or UK property). Records
   never leave the browser; only their category totals do.

6. **Open `/itsa/quarter`** — the QuarterCard shows the derived cumulative
   totals for the source and quarter you picked. The submission flow
   (`submit-flow.tsx`) appears beneath it once HMRC is connected and records
   exist — otherwise it shows the honest locked state instead of a dead
   button.

7. **Send to HMRC (sandbox demo)** — pick the business (auto-selected if
   there's only one), review the exact totals about to leave the device (the
   review screen names every category and repeats the privacy line: "HMRC
   receives these totals — never your individual records"), then confirm.
   The button is labelled **"Send to HMRC (sandbox demo)"** — never anything
   implying a production filing.

8. **Receipt** — a card appears with the quarter, period end, submitted-at,
   and a sandbox badge. Reload the page: the receipt is still there (it's
   server-side, from `GET /v1/itsa/:id/receipts`, not local state).

9. **HMRC calculation** — trigger it from the "What HMRC calculates" panel;
   it polls (max 5 tries, backoff) until HMRC's `incomeTaxAndNicsDue` and
   `totalTaxableIncome` appear beside our own engine estimate. A material
   difference is expected and is labelled honestly ("HMRC's number wins —
   ours is an estimate; differences usually mean records we can't see"),
   never hidden or force-reconciled.

That receipt, plus a calculation HMRC computed independently of our engine,
is the milestone: the full rail, walked end to end, by a human, because only
a human can complete step 3.

> **If step 7 fails with a 403 naming `INVALID_SCOPE` or similar:** the
> entity's ITSA connection predates the `write:self-assessment` scope (see
> "After the write-scope deploy" above) — disconnect
> (`DELETE /v1/hmrc/connection/<entityId>`) and redo the connect dance
> (step 3) before retrying. The sandbox error's `detail` names this
> explicitly; that's `hmrcFail`'s sandbox-only passthrough doing its job.

### Verification log

Record every human walk-through here — date, who, and the outcome (receipt +
calculation, or where it broke):

| Date | Who | Result |
|------|-----|--------|
| last human-verified: ____ | | |
