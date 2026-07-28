# UK tax identity

**Last reviewed:** 28 July 2026

**Law and guidance checked to:** 28 July 2026
**Status:** reviewed public framework; educational, not a taxpayer decision

A person, body or arrangement does not have one tax identity.

For a stated place, tax, activity and ruleset it has a **tax identity vector**:

```text
(subject, jurisdiction, tax or regime, activity or context, ruleset)
  + status + effective-date basis or interval
  → sourced classifications
```

The vector keeps eight classification questions apart:

1. What exists under general law?
2. Who is charged or treated as receiving the income?
3. In what capacity is the subject acting?
4. Where is it resident, and where does it have a taxing presence?
5. Which registrations, elections or groups apply?
6. Who legally owns, benefits from or controls it?
7. How is it classified for information reporting?
8. Who must file, pay, withhold or report?

Time, source authority and uncertainty qualify **every assertion**. They are
not a ninth identity category. An unknown PE result, for example, is an
assertion about `nexus:permanent-establishment` with `status: unknown`; it is
not a separate kind of nexus.

The canonical data is
[`data/uk-tax-identity.json`](data/uk-tax-identity.json). It contains:

- 8 interpretation dimensions and their individually sourced classifications;
- 10 UK legal and tax archetypes, including separate Great Britain and
  Northern Ireland LLP lineages;
- 8 named overlaps where two correct labels point to different subjects;
- 13 milestones showing where categories came from and how they changed;
- 7 wholly synthetic worked examples;
- 36 primary, official or model-standard sources; and
- 13 explicit gaps and privacy boundaries.

## Read an identity in this order

1. Fix the **subject**, **jurisdiction**, **tax or regime**, **activity or
   context**, **ruleset** and **date**.
2. Read all eight dimensions. Do not stop at legal form.
3. Read the assertion's status, source IDs and effective-date basis. A stated
   interval must carry a date bound; `current-at-corpus-review` means exactly
   the corpus review date.
4. Keep `unknown`, `conditional`, `disputed` and `not-applicable` distinct.
5. Read the matching overlap rules and their dangerous shortcuts.
6. Treat the result as a worked interpretation, not an authority decision or
   filing position.

For example, a Great Britain LLP can be a body corporate while its trading
profits are normally attributed to members. If one individual meets all
salaried-member conditions, PAYE and Class 1 National Insurance treatment is a
separate overlay and does not change that member's chargeable profit share. A
VAT group can be one taxable person for VAT while each member company remains a
separate legal person. Neither result is a contradiction.

## Public doors

When this work is deployed, its read-only doors are:

```text
GET /v1/tax-identity/uk
GET /v1/tax-identity/uk/graph
GET /v1/tax-identity/uk/dimensions
GET /v1/tax-identity/uk/archetypes
GET /v1/tax-identity/uk/overlaps
GET /v1/tax-identity/uk/timeline
GET /v1/tax-identity/uk/examples
GET /v1/tax-identity/uk/examples/{exampleId}
GET /v1/tax-identity/uk/sources
GET /v1/tax-identity/uk/gaps
GET /v1/tax-identity/uk/schema
GET /v1/tax-identity/uk/rights
GET /openapi/tax-identity-uk.json
```

They accept no taxpayer facts, create no account or session, and make no filing
or external change. The example endpoint interprets only a named synthetic
profile already present in the reviewed corpus.

The operational off-switch is
`UK_TAX_IDENTITY_EMERGENCY_STOP=true`. While it is on, content routes return
`503`; `/schema`, `/rights` and OpenAPI discovery remain readable so callers can
see the boundary and recover safely.

The existing private `/v1/entities` route is different. It stores a user's
coarse navigation record. This public framework neither reads nor changes those
records.

The CC BY-SA 4.0 notice covers TaxSorted's curation, summaries, schema structure
and synthetic examples only. It does not relicense legislation, official
guidance, model standards or linked third-party material.

## What can travel

The **questions** can be tested in another country. The UK classifications and
answers cannot simply be copied. A foreign form may be legally separate in one
place, disregarded for one charge in another, and classified differently again
under a treaty, VAT rule or reporting standard.

Nothing moves into the world schema until it has survived comparison with
another jurisdiction. See [METHOD.md](METHOD.md).

The current named coverage gaps include community interest companies, charitable
incorporated organisations, limited partnerships, mutuals, unincorporated
associations, statutory bodies and investment vehicles. They are gaps, not
silent mappings to the nearest existing archetype.
