# Switching on the HMRC rail

What exists: the api (Fly.io, London) with server-side OAuth, an encrypted token
vault, engine-validated submission, and immutable receipts. What it waits for:
HMRC application credentials. Only a human can mint those.

## 1. Register on the HMRC Developer Hub (~5 minutes, Aleא's part)

1. Go to https://developer.service.hmrc.gov.uk/developer/registration — register
   with any email (it's a developer account, not a Government Gateway tax account).
2. Once in: **Applications → Add an application to the sandbox**. Name: `TaxSorted`.
3. Inside the application, **subscribe to APIs**:
   - **VAT (MTD)** — the one that matters
   - **Create Test User** — mints pretend taxpayers to file as
   - (optional) **Test Fraud Prevention Headers** — validates our Gov-* headers
4. **Redirect URIs**: add `https://api.taxsorted.io/v1/hmrc/callback`
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

The Create Test User API needs only the application's own credentials:

```bash
TOKEN=$(curl -s https://test-api.service.hmrc.gov.uk/oauth/token \
  -d "grant_type=client_credentials&client_id=$HMRC_CLIENT_ID&client_secret=$HMRC_CLIENT_SECRET" \
  | jq -r .access_token)

curl -s https://test-api.service.hmrc.gov.uk/create-test-user/organisations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/vnd.hmrc.1.0+json" \
  -d '{"serviceNames": ["mtd-vat"]}' | jq
```

Keep the response: `userId`, `password`, and `vatRegistrationNumber` (the VRN).

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
