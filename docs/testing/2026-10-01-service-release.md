# Service rebuild release — 1 October 2026

Candidate: `c787af75c28441510c971abc14b303914fae3cb0` in
[PR #35](https://github.com/cambridgetcg/taxsorted.io/pull/35).
Merged at **04:23:42 UTC** as `07941b00116e71a0678b6b0394f43212ad41be8f`.
Its repository tree is identical to the candidate. Production
[run 36814914580](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36814914580)
passed all four jobs at **04:35:09 UTC**. The rebuild is live at **https://taxsorted.io**.
The final native campaign passed all four targets at **04:27:25 UTC**.

## What is included

The rebuilt service starts with individuals, sole traders and landlords. It connects
the service catalogue, My tax year, separate preparation years, evidence tasks,
Money records and selective handovers. Local recovery covers saved Books, Passport,
both preparation years and the checklist through encrypted exports and deliberate
atomic replacement. Browser and desktop profiles remain unencrypted by the app.

Secondary tools and VAT descriptions now state their supported scope. VAT takes
manual figures in HMRC's test system; Books does not derive VAT boxes. Public source,
feedback and installer access are described accurately: the development repository
is private, and public download/feedback routes are not yet available.

Next.js and eslint-config-next are pinned to **16.3.8**. The preceding 16.3.5 lock
triggered [GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j).
The production dependency audit reports zero findings after the repair. TaxSorted's
frontend is a static export without a Next.js server or use of `next/og` ImageResponse;
the finding is dependency evidence, not evidence of exploitation.

No tax rules, source-review deadlines, research corpus or database migrations changed.
The professional-opportunity publication gate remains closed.

## Verification

| Scope | Observed evidence |
|---|---|
| Local suites | 388 engine, 1,265 frontend, 1,086 API and 79 desktop tests passed; one existing API TODO. The frontend count increased by seven when eight existing expensive rejection cases were separated into individual tests. |
| Local release checks | Lint, full typecheck, research validators, 36 infrastructure tests, production dependency audit, static build and all 35 contracted routes passed. |
| Local isolated browser | 10 journey and 8 layout checks passed, with zero page errors or external requests. Covers year selection/resume, task focus, unsaved changes, selective summary and unchanged saved data. |
| Local source Electron | Eight runtime checks passed after repairing the external-link test locator. This is not installer or consumer acceptance. |
| Candidate quality CI | Both [PR checks](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36814072751) and [release quality](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36814072766) passed on the final candidate. |
| PostgreSQL CI | [Run 36814072782](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36814072782) passed PostgreSQL 16.15 and 17.11. Each applied 8 migrations, compared 21 tables, passed all 16 recovery checks and completed owned cleanup. |
| Native desktop CI | [Run 36814068231](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36814068231) passed Windows x64, Linux x64, Intel Mac and Apple silicon on exact candidate `c787af7`, including source, packaged and installed runtimes and installer lifecycles. Detailed report and installer-byte verification belongs in the [desktop record](../DESKTOP-TESTING.md). |
| Production workflow | Quality/build, HMRC sandbox fraud-header validation, Fly API deployment/authenticated synthetic smoke, and Cloudflare Pages deployment/live smoke all passed. The live checks include all 35 contracted routes, exact machine manifests, headers and closed research gates. |
| Real-site browser | At 04:35:24 UTC, an isolated Chrome context on `https://taxsorted.io` passed all 10 synthetic journey and 8 layout checks, with zero page errors or blocked external requests. Context and browser cleanup completed. |

Database CI identifies feature head `c787af7` and actually tested clean PR merge
`a7bbd6ed0900017107a0f278620ef56078711881`. Sanitised reports are retained locally
under ignored `desktop/test-results/database-ci-2026-10-01/36814072782/` and in the
workflow artifacts. These synthetic logical restores do not establish hosted backup,
role/privilege, token-key or production recovery.

The real-site browser reused the checked-in preparation journey with only its
origin and report destination changed in an ephemeral local runner. Its records
were synthetic and stayed in an isolated browser context; no existing profile or
account was used. Reports and screenshots are retained under ignored
`desktop/test-results/live-2026-10-01/`. Checkout metadata in that report describes
the working checkout, not the provenance of remotely served files; the production
workflow above identifies the published revision.

## Publication and rollback evidence

The workflow captured the serving Fly release/image and Cloudflare Pages deployment
before mutation, then checked the public-funding and central-release-ledger prefixes.
The rollback targets are retained in the
[API job summary](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36814914580/job/110219434948).
The preceding production source revision was `3e3fa56`. No rollback was exercised.

The new API image is
`registry.fly.io/taxsorted-api:deployment-01M3TVNY3A03HMN5TM27XERF22`.
The frontend artifact is
[566b6891.taxsorted-3po.pages.dev](https://566b6891.taxsorted-3po.pages.dev),
serving the production domain `taxsorted.io`.
API deployment and synthetic contract checks completed before the frontend changed.
An additional read-only check returned healthy HMRC **sandbox** configuration and
matched the public API manifest byte-for-byte to the candidate. Frontend smoke then
verified agreement between the API and both frontend manifest routes.

## Repairs found by the release checks

- The first PostgreSQL 16 run passed a socket readiness probe before database creation
  failed. The [official image](https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh#L264-L285) starts a temporary socket-only bootstrap server, then
  stops it before starting the final server. This supports a startup-race diagnosis;
  it was not reproduced deterministically locally. Readiness now waits for TCP
  `127.0.0.1:5432`, with bounded retries and a separate database-creation report stage.
  Both versions passed fresh local and CI rehearsals after the repair.
- The earlier native run used an obsolete source-code link locator after that public
  claim was corrected. Its replacement exercises the real public GNU AGPL link and
  retains Cancel, explicit approval, browser-stub and unchanged-page assertions.
- Intel Mac exceeded one test's deadline while running eight real password-derivation
  rejection cases in series. Each case now has its own normal deadline. The real
  600,000-iteration work factor, tamper coverage and generic rejection contract remain.

The initial failed native run is
[36813409782](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36813409782);
its obsolete remaining Windows work was cancelled after the shared locator failure
was diagnosed. The final candidate uses the corrected tests.

Vercel's optional preview was blocked with `COMMIT_AUTHOR_REQUIRED`: its integration
could not associate the commit author with a Git account. No account association or
commit identity was changed to bypass that boundary. Vercel is not the production
hosting path; the existing production workflow uses Fly.io and Cloudflare Pages.

## Remaining work

Consumer installation/recovery acceptance, trusted signing/notarisation, public
installers, public source distribution and a usable public feedback route remain
unfinished. Four current acceptance packets identify `c787af7`, contain independently
verified installer bytes and retain all **60** manual cases as **NOT RUN**. Earlier
`af4a5ab` packets remain historical; see the [current desktop campaign](../DESKTOP-TESTING.md#service-release-native-campaign--1-october-2026).
Hosted database recovery, readiness/alerts and an exercised rollback remain separate
operating work. Capturing rollback targets does not demonstrate a rollback.

The MTD source review remains due **12 October 2026**, with the **13 October** overdue
stop preserved. Complete annual calculation and production filing remain unavailable.
