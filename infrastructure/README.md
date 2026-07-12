# Infrastructure

The truth, plainly:

## What runs today

- **Frontend** — Next.js static export on **Cloudflare Pages** (project `taxsorted`).
  A push to `main` deploys it only after the API release and its live checks succeed.
- **API** — Hono on **Fly.io** in London with Postgres. The release workflow deploys the
  API first and checks both its public contracts and one authenticated, stateless tax-expert
  answer before the frontend can move.
- **CI** — `.github/workflows/deploy.yml` runs tests, typechecks, data validators, a
  high-severity production dependency audit and the static build on every push to `main`.
  It deploys the Fly API first, then Cloudflare Pages only after Fly succeeds. Both deployment
  tokens are required. (Its first three runs, 2026-06-06, ended in `startup_failure` — a
  GitHub-side validation hiccup; re-verified green by manual dispatch 2026-06-12.)
- **Domain** — Cloudflare. `taxsorted.io` is canonical; a Dynamic Redirect sends
  `www` to the apex with path and query preserved. DNSSEC was enabled on
  2026-07-12 and may remain `pending` for one to two days while Cloudflare
  Registrar publishes the parent DS.
- **Vercel** — preview/manual fallback only. Project `taxsorted-io` stays linked to
  this repository, but `frontend/vercel.json` disables automatic `main` deployments
  and the production custom-domain aliases have been removed. Production must have
  one release path, not two.
- **Runtime** — Node 22 in CI and the Fly image. Root and frontend `engines` plus
  `.nvmrc` keep local and Vercel preview builds on the same major.

The Fly service-level readiness check calls `/v1/health` every 30 seconds. The
release smoke test also asserts that HMRC is configured for the sandbox; a 200 with
the wrong rail state is not considered healthy.

## Operator quick check

The canonical repository is `cambridgetcg/taxsorted.io`. The older
`cambridgetcg/taxsorted` repository and Vercel project are legacy and do not serve
the production domain.

```bash
gh auth status
vercel whoami
fly auth whoami

gh run list --repo cambridgetcg/taxsorted.io --limit 5
vercel project inspect taxsorted-io --scope cambridgetcgs-projects
fly status -a taxsorted-api
fly checks list -a taxsorted-api
fly status -a taxsorted-db
```

The local checkout can be linked without committing credentials or project IDs:

```bash
vercel link --yes --scope cambridgetcgs-projects --project taxsorted-io
```

`.vercel/` is ignored. Fly linkage is the tracked `api/fly.toml`; GitHub linkage is
the `origin` remote.

The database is intentionally small today: one Postgres machine and one encrypted
1 GB volume with Fly snapshots. It is healthy but not highly available. Do not
blindly redeploy its internal staged secrets merely to clear their CLI status;
verify runtime behavior and take a snapshot before any database-machine change.

The canonical-host redirect lives in Cloudflare Dynamic Redirect ruleset
`3a88600352ff464d9c23da1a4ecb080f` (rule
`bbd9c61626624d659d5caaed3208eaf0`). DNSSEC uses key tag `2371`, algorithm `13`,
and digest type `2`. These identifiers are operational metadata, not secrets.

The authenticated release canary uses a test-mode workspace key with only the
`tax-expert:assess` scope. Its plaintext exists only as the GitHub Actions secret
`TAX_EXPERT_CANARY_API_KEY`; Postgres stores its digest. It expires on 12 July 2027. The
off-switch is to revoke that database key and delete the GitHub secret; rotate both before the
expiry rather than removing the success-path check.

## What comes next

- **Continue hardening `api/` on Fly.io** (`lhr` — London, UK data residency):
  - server-side OAuth per authority (client secrets, code exchange, encrypted token vault)
  - the data spine: users → entities → registrations → obligations → periods →
    records → returns → submissions, with immutable receipts and an append-only audit log
  - rule tables keyed `(jurisdiction, tax, kind, effectiveFrom)` — rates, thresholds,
    deadline formulas, penalty ladders, rate limits: an update is a data edit
  - a queue/scheduler for deadline reminders and rate-limited, idempotent,
    retried submissions
  - one typed API that the web UI and agents share — both worlds, made structural

## What was retired

The AWS Aurora/VPC terraform plan (committed 2026-03) was removed 2026-06-12: it
referenced a module that exists in no checkout, assumed Vercel hosting we no longer
use, and priced at ~$45–356/month what Fly.io gives more simply. It lives in git
history if ever needed.
