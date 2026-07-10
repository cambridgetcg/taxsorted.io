# Method — how this transparency corpus is collected

**Last reviewed:** 10 July 2026
**Status:** Operational method for the reviewed static v1

The production API is intentionally not a live scraper. A tax authority page
can change, disappear, conflict with legislation or expose a new personal-data
field without warning. A request handler must not turn that surprise directly
into legal information for a caller.

## The collection and publication pipeline

```text
allowlisted official source
  → retrieve bounded public material
  → classify its authority and reuse status
  → extract a narrow claim
  → attach source + locator + fields + observation date
  → validate graph, dates, permissions and privacy
  → review the diff as a human
  → publish one immutable snapshot
  → API loads the snapshot at boot
```

1. **Choose an official source.** Statute, regulations, judgment, official
   register, policy, guidance, manual, audit or parliamentary scrutiny. Search
   results and commentary are discovery tools, not final authority.
2. **Record what it can prove.** Every source has `supports` and
   `doesNotProve`. A manual explains HMRC practice; it is not promoted to law.
3. **Check reuse.** GOV.UK and Contracts Finder material can be normalised where
   OGL applies. Other judgment and regulator pages are used link-first unless a
   reuse permission is confirmed. No logos, portraits or wholesale judgments
   are copied.
4. **Extract the smallest useful claim.** An actor, relationship, permission,
   system, pipeline step, case summary or gap. No inferred ownership, influence,
   misconduct, contract or permission from a name match.
5. **Pin evidence to fields.** Each record names the source, JSON-pointer fields,
   page heading or statutory section, observation date and whether the record is
   a manual review or a derived join.
6. **Validate.** The API boot check rejects duplicate IDs, missing references,
   missing sources, broken evidence pointers, impossible date ranges, future
   observations, invalid pipeline edges and duplicate lane order.
7. **Review meaning, not only shape.** Particular red flags need human review:
   new private actors, enforcement changes, professional permissions, legal
   case outcomes, source conflicts, large deletions and licence changes.
8. **Publish atomically.** The reviewed JSON is the release unit. A failed
   update leaves the prior snapshot untouched.
9. **Load once.** API requests query the in-memory validated snapshot and never
   call upstream official services.
10. **Expose uncertainty.** Source conflicts and missing public records become
    gap objects. They are never filled with a plausible guess.

## Source hierarchy

The API's `authorityLevel` means exactly this:

1. `primary-law` — enacted legislation;
2. `judgment` — decided court or tribunal material;
3. `official-register` — an official status or procurement record;
4. `official-policy` — what the institution says it intends or requires;
5. `official-guidance` — public explanation of law or process;
6. `official-manual` — the authority's published operational interpretation;
7. `public-audit` and `parliamentary-scrutiny` — independent/systemic review;
8. `professional-regulator` — standards within that regulator's membership or
   statutory scope.

Higher is not always more useful. A statute proves a power; current guidance
may prove the phone number and operational path. The API returns both labels so
the caller can decide what kind of claim is being made.

## Freshness

- Current contacts, office structures, adviser registration, debt agencies and
  permission status: review every 30 days.
- Guidance, manuals, systems and current contracts: every 90 days.
- Legislation, frameworks and decided cases: every 180 days, or earlier when an
  update feed or official announcement gives a reason.

`reviewAfter` is a review alarm, not a claim that law expires that day.
`effectiveFrom` is used only when the cited material supports the operative date
for the provision or regime actually described. Royal Assent is not treated as
whole-Act commencement; an ambiguous date is omitted instead of guessed.

## Conflict rule

When sources disagree:

1. keep both source records;
2. identify the exact field and effective date;
3. prefer enacted law over guidance for the legal rule;
4. prefer a current tax-specific official page over an old general summary for
   operational detail, while still checking the law;
5. create a `source-conflict` gap; and
6. do not publish a deterministic calculation until the effective answer is
   supportable.

The live taking-control fee conflict is the first worked example.

## Permission rule

A record may state only the permission actually proved. The validator and tests
protect the most dangerous category errors:

- an HMRC debt agency cannot gain visit or seizure powers;
- a framework supplier cannot become an HMRC contractor without an HMRC award;
- API production access cannot become user OAuth authority;
- software recognition cannot become approval or accreditation;
- an ASA cannot become endorsement or client authority;
- AML supervision cannot become legal authorisation; and
- professional membership cannot regulate non-members.

## Privacy boundary

Published v1 may contain institutional roles, role-holder-free descriptions,
generic professional contact points, public register links and procurement
identifiers already present in an official award.

It excludes taxpayer identifiers and records, passwords and tokens, case files,
personal or residential contacts, junior staff, salaries, company officers,
portraits, allegations, inferred relationships and security-sensitive system
topology. A public source is not permission to copy every field it exposes.

## Runtime and off-switch

The route is public, read-only, wildcard-CORS and never creates a taxpayer
session. Successful responses carry a deterministic SHA-256 ETag and cache
headers. Errors use `no-store`.

Production publication defaults closed behind:

```text
UK_TAX_SYSTEM_PUBLIC_DATA_ENABLED=true
```

While closed, `/sources`, `/gaps` and `/manifest` remain available so the
decision and evidence are still visible. The graph is static and can be turned
off without disabling tax calculations or filing routes.

## Updating safely

```bash
npm run validate:uk-tax-system
npm test --workspace api -- --run src/__tests__/uk-tax-system.test.ts
npm run typecheck --workspace api
```

Then read the diff as prose. A green schema can still contain a misleading
verb. “Oversees,” “authorises,” “recognises,” “contracts with” and “supplies
data to” each have different consequences; keep the real word.
