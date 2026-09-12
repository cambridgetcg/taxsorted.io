# Local and GitHub history consolidation

2026-09-12. The working baseline is GitHub `origin/main` at
`25871cc1bde61b858ab89650692e52333f3f4f28`, followed by the reviewed local
architecture/refactor commits. No remote branch was rewritten or pushed.

## Decision

Use the current GitHub product as the base. Preserve the four July local-only
commits on `backup/local-main-before-consolidation-20260912`, whose tip is
`d6f94ab1a50d0b3aa272aaca50be59d5aed4f820`. They are not replayed into the
active product. This is an explicit baseline alignment, not a claim that the four
patches were already upstream or that a conflict-free rebase would preserve their
meaning.

The original `main` and GitHub history shared `2c92bd9`; the original branch had
four unique commits and lacked 184 remote-main commits. A wholesale replay would
restore older UI and tax-teaching assumptions across the current Books/passkey/
expert/publication architecture. The backup preserves complete source and history
for selective future ports. The dirty `taxsorted-rails` artist work is separate and
unchanged.

## Disposition of each local commit

| Commit | Unique work | Current disposition / useful next action |
| --- | --- | --- |
| `91b4252` | Query-string locale aliases, old threshold trainer, three presets, four multilingual teaching cards and five source entries | Current `PersonalThresholdCheck` supersedes the weaker trainer. Shareable locale selection is still useful and absent upstream; port it independently with query/hash preservation, external-link handling, URL navigation updates, storage failure and RTL tests. Review teaching cards before promotion. |
| `f7fbd43` | Seven-entry Policy Watch timeline, labels, renderer and validator | Retained as a July research snapshot. Before publishing, distinguish announcement/enactment/commencement, correct start/end date meanings, review primary sources and add per-entry freshness. The threshold-freeze entry currently uses an end date as `effectiveFrom`. |
| `1988b88` | Same-origin heartbeat manifest, browser mesh, animation and explanatory UI | Unique experimental work, not an upstream replacement. Keep separate from the default tax workspace. If revived, define its product home and explicit behavior first; preserve the current global layout and privacy boundaries. |
| `d6f94ab` | Creator-guild/Love Leveling model, UI, manifests and checks | Unique experimental work. Retained for an independently scoped feature or separate project; it is not a prerequisite for reliable Books or tax filing. |

The local heartbeat is not the old sibling repository's GitHub heartbeat job.
Upstream's `520c360` removed the separate personal `ember.js` artifact before
open-sourcing. Neither fact establishes that the two unique local experiments
were deliberately removed upstream. Do not reintroduce `ember.js` by restoring an
old layout wholesale.

The four recoverable teaching cards are `salary-sacrifice-time-machine`,
`gift-aid-boomerang`, `marriage-allowance-tag-team` and `tax-code-goblin`.
Their preservation does not renew their source review.

Reviving the experiments also needs behavioral fixes: the heartbeat script and React
component use incompatible message shapes on the same channel, and Love Leveling
awards repeated XP after its five quests are complete. Love's manifest/validator also
depends on the heartbeat manifest. A future feature should define one validated
event contract, handle storage failure, test quest completion and confine optional
animation to its own route. Unlinked Next routes and public assets still deploy;
keeping them out of navigation alone would not archive them.

## Reviewed commits retained on the working branch

| Commit | Change |
| --- | --- |
| `f9379a0` | API composition separated from process bootstrap; 20 mounted-boundary tests |
| `1494c57` | Shared Books feature home, stable route wrappers and readiness assertions; honest VAT capability copy |
| `ebac505` | Release smoke scripts extracted with identical commands, environment and job order |
| `fb09485` | Architecture audit and current documentation map |

The final consolidation commit adds this record and the
[prioritized production gap plan](PRODUCTION-GAPS.md). The
[initial audit](ARCHITECTURE-AUDIT.md) retains the detailed evidence and original
verification results.

## Verification in the canonical checkout

The original `taxsorted.io` checkout now uses the GitHub base plus five local
commits, with `main` tracking `origin/main`. Its working tree is clean. Dependencies
were restored from the unchanged root lockfile using Node 22.23.2.

- Full suite: **2,001 tests passed, one existing todo**, across 201 test files.
- Production static build: **passed**, including the closed publication worker.
- Explicit production dependency audit: **still fails**, reporting seven affected
  entries. A successful install summary does not replace the standalone audit.
- Next still warns about its inferred workspace root; PG-01 includes the fix.
- Documentation targets and whitespace checks passed.

No remote changes, deployment or provider operations were performed. The separate
artist worktree remains dirty with its original work preserved.

## Recover or inspect the old work

These commands are read-only:

```sh
git log --oneline 2c92bd9..backup/local-main-before-consolidation-20260912
git show --stat 91b4252
git show f7fbd43 -- research/uk/politics/politics.json
git diff 2c92bd9 backup/local-main-before-consolidation-20260912
```

For a future port, create a dedicated branch from the current working main and
implement the selected behavior against today's contracts. Keep the archive branch
until every local-only change has an explicit adopted, moved or retired disposition.
It is a local Git recovery reference, not an off-device backup.
