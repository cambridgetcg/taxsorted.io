# Release checks

The production workflow stays in
[`deploy.yml`](../../.github/workflows/deploy.yml). Run the offline contract checks
from the repository root with Node 22. Run the live Bash smoke scripts only as part
of an authorised release or an explicitly scoped operator check.

| Script | Reads and prerequisites | Effect |
| --- | --- | --- |
| `frontend-contract.mjs check-build [directory]` | Local generated pages; defaults to `frontend/out` | Checks the shared page contract without network access, credentials or writes. |
| `frontend-contract.mjs check-page /route html-file` | One already-fetched HTML response | Applies the same page criteria used for generated output; exits nonzero on a missing or wrong page. No network access. |
| `smoke-api.sh` | Deployed `api.taxsorted.io`, tracked schemas/corpora, `RUNNER_TEMP`, `GITHUB_OUTPUT`, `TAX_EXPERT_CANARY_API_KEY`; curl, jq and coreutils | Checks public routes and authenticated workspace/SDLT/MTD contracts using synthetic inputs; writes temporary responses and the publication-state job output. It sends authenticated calculation POST requests. |
| `smoke-frontend.sh` | Deployed `taxsorted.io` and API agent manifest, `frontend/out`, tracked public assets, `RUNNER_TEMP`, `FRONTEND_PROFESSIONAL_OPPORTUNITIES_STATE`; Node 22, curl, jq and coreutils | Checks HTTP headers, publication gates, the shared page contract and exact discovery/media bytes. Writes temporary responses. |

None of these scripts deploys, migrates, files a return or changes a publication
switch. Live smoke scripts use fixed production hosts. Do not put credentials in
arguments or committed files.

[`frontend-pages.json`](frontend-pages.json) is the one route/title/content contract
for generated and deployed pages. It includes the service directory and audience
paths, preparation, My tax year, local download, Books views and the existing guide
and source routes. The validator checks the actual document title and main heading
or initial workspace content; navigation text and serialized script data cannot
satisfy a heading. When a page deliberately changes, update this contract once.

The Books routes initially render a loading shell, so those entries verify route
identity and that shell. They do not prove client hydration, IndexedDB, account
access or backup/restore behavior; browser and native runtime tests cover those
separately. These page checks are not a source-review or publication approval.

The existing professional-opportunity open/closed headers, publication markers,
leakage checks, agent-manifest identity and Window Tax media hashes remain separate
checks. Their state-dependent requirements are not replaced by the page contract.

The workflow still owns credential preflight, rollback capture, append-only release
checks, HMRC fraud-header validation, Fly deployment, frontend build/publication
alignment and Pages deployment. API checks must finish before the frontend moves.
Both CI workflows test the checker and validate generated output. The deployment
workflow runs the generated check in its initial quality job before API deployment,
then checks the final frontend artifact again before Pages deployment.

Offline verification:

```sh
node --test scripts/release/frontend-contract.test.mjs
node scripts/release/frontend-contract.mjs check-build
bash -n scripts/release/smoke-api.sh
bash -n scripts/release/smoke-frontend.sh
```

The build check needs an existing `frontend/out` from `npm run build`. Tests use
disposable local HTML fixtures and cover missing/wrong pages, false script/navigation
matches and CLI failure status. These offline checks do not prove deployed behavior.
Live smoke execution remains part of the separately authorised release process.
