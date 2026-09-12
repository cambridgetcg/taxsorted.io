# Release checks

The production workflow stays in
[`deploy.yml`](../../.github/workflows/deploy.yml). These scripts own its API and
frontend smoke checks. Run them from the repository root, under Bash, only as part
of an authorised release or an explicitly scoped operator check.

| Script | Reads and prerequisites | Effect |
| --- | --- | --- |
| `smoke-api.sh` | Deployed `api.taxsorted.io`, tracked schemas/corpora, `RUNNER_TEMP`, `GITHUB_OUTPUT`, `TAX_EXPERT_CANARY_API_KEY`; curl, jq and coreutils | Checks public routes and authenticated workspace/SDLT/MTD contracts using synthetic inputs; writes temporary responses and the publication-state job output. It sends authenticated calculation POST requests. |
| `smoke-frontend.sh` | Deployed `taxsorted.io` and API agent manifest, `frontend/out`, tracked public assets, `RUNNER_TEMP`, `FRONTEND_PROFESSIONAL_OPPORTUNITIES_STATE`; curl, jq and coreutils | Checks HTTP headers, publication gates, expected page text and exact discovery/media bytes. Writes temporary responses. |

Neither script deploys, migrates, files a return or changes a publication switch.
Their network calls, retries, fixed production hosts, checks and output contracts
were extracted unchanged from the workflow. They are not a local offline test
suite. Do not put credentials in arguments or committed files.

The workflow still owns credential preflight, rollback capture, append-only release
checks, HMRC fraud-header validation, Fly deployment, frontend build/publication
alignment and Pages deployment. API checks must finish before the frontend moves.

Offline syntax check:

```sh
bash -n scripts/release/smoke-api.sh
bash -n scripts/release/smoke-frontend.sh
```

This syntax check does not prove deployed behaviour. Live smoke execution remains
part of the separately authorised release process.
