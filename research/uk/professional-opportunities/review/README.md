# Qualified-review pack

This directory makes the remaining human review finite and inspectable. The checked-in
[`qualified-review-pack.json`](qualified-review-pack.json) is a **pending template** bound to the
exact current corpus:

- 67 source checks;
- 9 opportunity reviews;
- 5 scrutiny reviews;
- one right-of-reply row for every scrutiny-record and affected-institution pair; and
- separate privacy, public-surface, emergency-stop, correction and withdrawal controls.

The corpus and these review files are already public through GitHub. The gate controls only
TaxSorted's official hosted API/frontend distribution and the endorsement implied by those
surfaces. A complete pack is evidence for a later decision; it is not that decision and changes no
switch.

## Keep private evidence private

Never put client facts, contact details, document text, filesystem paths or confidential reviewer
material in this directory.

Public evidence may use a credential-free HTTPS URL. Private evidence stays with the organisation
responsible for it and appears here only as:

- a public-safe custodian role; and
- a random UUID v4 that has no meaning outside that custodian's record system.

The ignored `private/` directory is only a local convenience. Each reviewer must use an approved
matter or records system appropriate to their duties; an ignored folder is not a security control.
Genuinely pre-publication work must happen in private review storage. A branch, pull request or
untracked path in a public repository is not private publication control.

## Roles

The final pack must cover five distinct capacities:

1. tax-technical review;
2. legal and procedural review;
3. editorial fairness and institutional reply;
4. privacy and security; and
5. release operations.

One person may hold more than one capacity when the public evidence and scope honestly support it.
The emergency-stop operator must be different from the review lead. No single qualification should
be described as covering every tax, rating, customs, legal, security and operational question.
Every reviewer records an independently verified capacity and a public-safe declaration that they
are independent of the corpus authors and affected institutions in their scope and have no
undisclosed relevant interest. Legal-procedure review must be assigned to the method, every
opportunity and every scrutiny record; merely listing the role is not coverage.

Evidence has one purpose per row. A source link cannot double as evidence of a qualification,
conflict declaration, privacy review, institutional reply or emergency-stop drill.

## Bounded workflow

From the repository root:

```bash
# Make a new working copy. Existing files are never overwritten.
npm run review:professional-opportunities -- \
  prepare ./research/uk/professional-opportunities/review/private/working-pack.json

# Check shape, exact corpus binding, coverage, references and chronology.
# For an explicit working file, the checker computes a candidate digest in
# memory so ordinary edits do not break the workflow. It does not rewrite it.
npm run review:professional-opportunities -- \
  check ./research/uk/professional-opportunities/review/private/working-pack.json \
  --allow-pending

# A complete pack must pass without --allow-pending.
npm run review:professional-opportunities -- \
  check ./research/uk/professional-opportunities/review/private/working-pack.json

# Sealing writes a new directory containing only the digest-sealed public-safe
# pack and its schema. It writes no hosted-distribution decision.
npm run review:professional-opportunities -- \
  seal ./research/uk/professional-opportunities/review/private/working-pack.json \
  ./research/uk/professional-opportunities/review/private/sealed
```

`seal` refuses a pending, expired, future-dated, incomplete or corpus-mismatched pack. It also
refuses to overwrite its output directory. Running `check` with no path validates the stored digest
of the checked-in canonical pack rather than computing a working-copy candidate.

## Separate publisher decision

Sealing ends the evidence workflow. It does not create an approval file.

A separately authorised, named human publisher must then review the exact sealed pack and corpus
diff and record a distinct decision in
`data/publication-approval.json`. An affirmative version 3 decision:

- says `approved-for-hosted-distribution`, not general publication;
- names the decision maker and their capacity;
- cites decision evidence that is separate from the review pack;
- binds the exact review-pack reference;
- confirms that the exact corpus and pack were reviewed; and
- confirms that deployment and serving switches remain separate actions.

The publisher label must differ from the review-lead label, but display-name inequality is not
proof of identity or authority. The reviewed repository change must carry that governance
evidence. An agent may prepare, check and seal review evidence; it must not supply a human identity,
authority, decision evidence or affirmative hosted-distribution decision.

After that separate decision, a reviewed merge is still not activation. Both API and frontend
serving switches remain off until an authorised release action enables them. Before any open
Cloudflare deployment, its narrow Pages Function must be configured to fail closed and a live
response must carry `X-TaxSorted-Professional-Opportunity-Guard: open`.

## What “complete” means

A complete pack must, at minimum:

- bind the current corpus version, digest and ordered source/opportunity/scrutiny IDs;
- retain the generated record digests and exact affected-institution matrix;
- resolve every reviewer and purpose-typed evidence ID;
- give every reviewer independently verified public-safe capacity evidence, a conflict declaration
  and an explicit corpus-bound scope;
- check every source's stated use, version or publication date, and pinpoint or scope;
- confirm law, territory, clocks, routes, professional gates, source support and money boundaries
  for every opportunity;
- confirm the statement, evidence state, proof limit, counterweight and correction route for every
  scrutiny record;
- resolve every institutional reply row with evidence and valid chronology;
- exercise both the API stop and static-frontend containment in a production-closed release;
- assign and test distinct primary and backup correction and withdrawal owners; and
- complete every check within a review cycle of no more than 93 days;
- set a review-by date no more than 93 days after completion.

The API, static build and Cloudflare request-time guard must match the exact evidence and decision
references before hosted distribution can open. The API and `/v1/wake` recheck currentness on every
request. The edge guard uses the UTC date and treats `reviewBy` as inclusive, closing on the next
UTC date. A label such as “qualified reviewer” or an evidence reference such as “trust me” is not
enough.

## Generated schema

[`qualified-review-pack.schema.json`](qualified-review-pack.schema.json) describes the portable
JSON shape. The local checker also enforces cross-record rules that ordinary JSON Schema cannot,
including exact corpus binding, reviewer scope, right-of-reply coverage, chronology, pack digest
and expiry.
