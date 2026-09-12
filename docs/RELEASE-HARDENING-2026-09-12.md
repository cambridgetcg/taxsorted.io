# Release and preparation hardening — 2026-09-12

This batch implements PG-01, PG-02, PG-03 and PG-06 from the
[production gap plan](PRODUCTION-GAPS.md), with the PG-12
[operating evidence inventory](OPERATING-EVIDENCE.md). It builds on the consolidated
GitHub history and preserves the backup branch described in [CONSOLIDATION](CONSOLIDATION.md).
It does not open a production filing rail or a customer provider pilot.

The verified code is committed locally at `6c9c820`, in four reviewable slices:

| Commit | Slice |
|---|---|
| `f3347e6` | Dependencies, lockfile and explicit Next configuration |
| `aef8c6b` | MTD evidence renewal and provenance regressions |
| `e83e6f4` | Browser Origin protection and one session operation per request |
| `6c9c820` | Books backup, restore, isolation and confirmation flow |

No remote branch was pushed or deployment run. The following documentation commit
records these results without changing the verified runtime code.

## Dependency review (PG-01)

The initial production audit reported seven affected dependency entries, including
critical Next and high sharp findings. This established a release-gate failure;
it did not demonstrate exploitation of the statically exported site. The application
continues to use static export and unoptimised images.

| Change | Reason and reviewed source |
|---|---|
| Next and eslint-config-next 16.2.11 → 16.3.5 | Aligned framework/lint releases; fixes are described by [Next's Windows-server advisory](https://github.com/advisories/GHSA-p293-qw3h-jr36) and [image-optimisation advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4). The selected [release](https://github.com/vercel/next.js/releases/tag/v16.3.5) supports the repository's Node 22 and React 19 contracts |
| Remove sharp 0.35.3 override; resolve 0.35.4 under Next's declared `^0.35.4` | Removes the incompatible override and admits the [libheif fix](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c); native sharp/libvips optional packages follow that release |
| Hono direct pin and shared override 4.12.34 → 4.13.7 | Matches the [reviewed release](https://github.com/honojs/hono/releases/tag/v4.13.7); clears the audit's traversal, body-parser and query-parser findings without changing the API adapter/OpenAPI package pins |
| baseline-browser-mapping 2.10.36 → 2.11.22 | Compatible transitive update past the [invalid-input process-termination fix](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) |
| Vitest family 4.1.10 → 4.1.11 across workspaces and coverage | Keeps the test packages aligned and admits the [mock redirect file-read fix](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9) |
| brace-expansion 1.1.16 → 1.1.18 and 5.0.8 → 5.0.9 | Compatible transitive patches for [unbounded expansion](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-rgw5-rvv9-x895) |
| browserslist 4.28.2 → 4.28.9 | Compatible tooling update for [unbounded cache growth](https://github.com/browserslist/browserslist/security/advisories/GHSA-c83g-rgw3-j3cx) and the audit's stats-normalisation finding; related browser mapping data and update helper follow it |
| fast-uri 3.1.4 → 3.1.7 | Compatible validator-tool dependency patch for [URI normalisation](https://github.com/fastify/fast-uri/security/advisories/GHSA-f65p-4m7j-42xc) and related audit findings |
| js-yaml 4.3.0 → 4.3.2 | Compatible lint-tool dependency patch for [merge-source CPU limits](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh) |
| undici 7.28.0 → 7.29.1 | Compatible jsdom dependency update for [private-cache handling](https://github.com/nodejs/undici/security/advisories/GHSA-4cwx-7wf7-3272) and the audit's related parser/header fixes |

No dependency was added to implement Books restore or the Origin guard. Existing
WebAuthn, React, Vite and TypeScript pins/resolutions remain unchanged. The lockfile
also records required Next helpers/native packages and a compatible fastq patch.

[Next configuration](../frontend/next.config.ts) now anchors `outputFileTracingRoot`
to the repository, following the [documented monorepo option](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
The unrelated home lockfile is preserved. Node 22 and the root lockfile remain the
reproducibility contract.

Next 16.3's local development command also generates agent-guidance files by
default. The documented `agentRules: false` option preserves the repository's
explicitly maintained guidance; the two files created by the local smoke start
were removed. Existing user-authored guidance was not changed.

## Verification

Clean `npm ci` completed on Node 22.23.2; `npm ls --all` reports a valid tree.
Both production and full dependency audits report zero findings on 2026-09-12.
The npm install-script policy reported pending scripts for existing esbuild,
fsevents and unrs-resolver packages; no global approval or policy was changed.
Corpus validators passed and retained the pending professional-opportunity review.

| Check | Result |
|---|---|
| Engine full suite | 388 passed / 31 files |
| API full suite, including generated Passport schema check | 1,086 passed + 1 existing TODO / 71 files |
| Frontend full suite | 683 passed / 102 files |
| Frontend lint and all workspace typechecks | Passed |
| Corpus validators | Passed; professional-opportunity review remains pending |
| Static production build | 73 pages generated; no inferred-root warning; publication worker state `closed` |
| Frontend release script | Shell syntax passed; manual-backup wording matches the built workspace HTML |

Total: **2,157 passing tests**, with **one pre-existing TODO**, across **204 files**.
The final clarification that Books are not *automatically* backed up also passed
its focused 11-test workspace regression. The backup UI is hydrated after the
browser mounts; its code is present in the generated chunk and its component flow
is covered by DOM tests, not asserted from the initial static HTML.

## Source evidence (PG-02)

The [dated review](../research/uk/tax-expert/source-review-2026-09-12.md) records all
ten primary URLs, the cessation-page move, recurring deadline support and corrected
source metadata. Evidence admission is 12 September through 12 October; the following
day stops even when the caller requests a historical assessment date. Capability
coverage and classifier version stay bounded. Engine, API, Passport and frontend
consumer regressions passed. A named human owner for the next review remains unassigned.

## Browser mutation protection (PG-06)

The [shared guard](../api/src/browser-mutation-origin.ts) runs before session handling
for the five explicit browser route trees. Missing, malformed and unapproved Origins
stop before cookies, SQL or provider work. OAuth GET callbacks, safe reads and
workspace-key machine tasks retain their own authentication rules. Accepted requests
retain the existing ownership, passkey and recovery restrictions.

Assembled-app tests exposed overlapping root/wildcard registrations that ran session
middleware twice on exact roots. One wildcard registration per tree now covers both
root and descendants; regressions verify one session operation and exclude nearby
prefixes. These tests use real routers/session code with mocked SQL, fetch and
listener. They do not establish live Postgres or provider behavior. Manual curl
examples in the runbook now include Origin; no live smoke script was executed.

## Books recovery (PG-03)

The [backup contract](BOOKS-BACKUP.md) documents the versioned envelope, explicit
replacement flow, bounds, retained evidence and invalidated authority. Shared internal
validation and IndexedDB transaction handling have separate modules. Fifty-four new
frontend tests cover malformed/oversized input, emitted-state round trips, review and
source provenance, replica/store isolation, preview invalidation, interrupted writes
and deliberate confirmation.

An independent review reproduced and verified fixes for unrelated provider mappings,
conflict/history provenance, emitted ISO timestamps and post-commit notifications.
The actual synthetic normaliser → staged/acknowledged/completed sync → review-edited
records path exported successfully using disposable memory storage. Native restore
requires the existing shared Web Lock to coordinate with older open v3 tabs.

**Remaining verification:** the IndexedDB request/transaction tests use a deterministic
staged-write harness. No native browser session was available (`No browser is available`;
browser discovery returned an empty list), so native IndexedDB and visual/interactive
walkthroughs remain unverified. The local Next development server started successfully
and was stopped afterward. No person's browser records or provider account was used.

The [operating inventory](OPERATING-EVIDENCE.md) records remaining recognition,
recovery, security, privacy, edge, continuity and customer-provider decisions.
Production filing and customer provider admission remain separate release gates.
