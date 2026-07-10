# Infrastructure

The truth, plainly:

## What runs today

- **Frontend** — Next.js static export on **Cloudflare Pages** (project `taxsorted`),
  deployed manually via `npm run deploy` for now.
- **CI** — `.github/workflows/deploy.yml` runs tests, typechecks, data validators, a
  high-severity production dependency audit and the static build on every push to `main`.
  It deploys the Fly API first, then Cloudflare Pages only after Fly succeeds, when both
  deployment tokens are present. (Its first three runs, 2026-06-06, ended in `startup_failure`
  — a GitHub-side validation hiccup; re-verified green by manual dispatch 2026-06-12.)
- **Domain** — Cloudflare.

## What comes next

- **`api/` on Fly.io** (`lhr` — London, UK data residency) with Postgres:
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
