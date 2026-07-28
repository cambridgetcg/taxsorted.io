# Method — interpreting tax identity

**Last reviewed:** 28 July 2026
**Status:** method used by `taxsorted.uk.tax-identity/1`

## The unit of a conclusion

Every conclusion must name:

```text
subject
+ jurisdiction
+ tax or reporting regime
+ transaction, activity or relationship
+ ruleset
+ status
+ effective-date basis and any stated interval
+ sources
```

Change any one of those and the conclusion may change. Corrections and new law
create a new effective-dated assertion; they do not rewrite the earlier period.

Every example declares its synthetic subjects, and every subject must be used by
at least one assertion. The subject of legal existence may differ from the
subject charged, the VAT representative member, a trustee, a beneficiary or an
owner looked through to by another country.

## The eight dimensions

| Dimension | The question it answers | Where the category comes from |
|---|---|---|
| Legal existence and form | What exists? | Company, partnership, trust and association law |
| Tax attribution and charge | Who is treated as receiving or earning? | Charge-specific tax law and elections |
| Capacity and activity | In what role is the subject acting? | The facts and rules for that activity or engagement |
| Residence and nexus | Which places can tax or coordinate the subject? | Domestic residence, source, permanent-establishment, treaty and VAT rules |
| Registration, election and grouping | Which administrative or elective overlay applies? | Revenue and registry systems |
| Ownership, control and benefit | Who owns title, enjoys benefit or ultimately controls? | General law, AML and reporting rules |
| Reporting classification | Which due-diligence bucket applies? | CRS, FATCA and locally enacted reporting rules |
| Filing, payment and withholding role | Who performs each obligation? | Tax procedure and administration law |

A registration number is evidence of a registration. It is not proof of
residence, beneficial ownership, employment status or the tax treatment of
every transaction.

## Time and evidence qualify every assertion

Time and certainty are not identity dimensions. Each assertion has one
`effectiveDateBasis`:

- `stated-interval` — at least one of `effectiveFrom` or `effectiveTo` is
  present, and any two bounds are ordered;
- `current-at-corpus-review` — no date bound is stored and the example's
  `asOf` date must equal the corpus `lawAsAt` date;
- `unknown` — no date bound is asserted; or
- `not-applicable` — used only with `status: not-applicable`.

An `unknown` assertion names the concrete proposition being tested. For
example, an unresolved VAT presence remains
`nexus:vat-fixed-establishment` with `status: unknown`; there is no generic
“unknown nexus” classification.

Scope is part of the proposition. An overlap rule therefore states whether the
matched assertions must use the same or different subject, jurisdiction, tax,
activity or ruleset.

## Source order

Use the narrowest source that actually governs the question:

1. enacted legislation and applicable treaty text;
2. binding court or tribunal decision;
3. regulation or locally implemented international rule;
4. official guidance, with its stated limits;
5. model conventions and standards, clearly labelled as models;
6. commentary only when a primary or official door is absent.

This first corpus admits legislation, official guidance, regulations and model
standards. It does not pretend an OECD or FATF text is itself UK law, or that
HMRC's shorthand replaces the exact provision.

Each source record says both what it supports and what it cannot establish.
Every classification has its own non-empty `sourceIds`. Those source IDs must
also appear in the parent dimension's source list, so the dimension list is a
complete union. Every source in the corpus must be used. Archetypes, overlaps,
milestones and example assertions also point to stable source IDs.

## States are words, not scores

An assertion is:

- `established` — supported within the stated synthetic facts and scope;
- `conditional` — depends on a stated condition or further rule;
- `disputed` — competing positions remain live;
- `unknown` — the corpus does not have enough to say; or
- `not-applicable` — this dimension does not apply in the stated scope.

There is no numerical legal-confidence score. Unknown never silently becomes
false. A one-value dimension with competing active assertions is a conflict and
requires review.

## Overlap is part of the answer

An overlap is not an error to flatten. It records why apparently inconsistent
labels can both be true. The first release tests:

- one natural person acting personally, as employee and as sole trader;
- a Great Britain LLP as body corporate with member-level profit attribution,
  plus a separate salaried-member PAYE and Class 1 National Insurance overlay;
- a Scottish firm as legal person with partnership tax treatment;
- one body that is both a company and a recognised charity;
- separate companies treated as one VAT taxable person;
- a non-separate branch or permanent establishment creating local nexus;
- trustees, beneficiaries and settlors occupying different trust roles; and
- cross-border hybrid classification.

Every overlap names the tempting shortcut, the questions still to ask and the
conditions that call for review.

## Evolution has three clocks

Keep separate:

1. when a source was published or adopted;
2. when the legal rule took effect; and
3. the factual period being interpreted.

The milestone timeline is an origin map, not a complete legislative history.
It records selected turning points such as the statutory partnership
definition, incorporation-based company residence, VAT grouping, US
check-the-box elections, the separate Great Britain and Northern Ireland LLP
lineages, BEPS Action 7's model PE changes, charity definitions,
beneficial-ownership standards and the 2025 UK personal-tax connecting-factor
change. Follow the linked source before relying on any one event.

## Safety boundary

The public service:

- contains synthetic archetypes and examples only;
- accepts no names, tax identifiers, addresses, documents or ownership facts;
- does not decide residence, liability, employment status, beneficial
  ownership, permanent establishment or relief;
- does not file, register, pay, contact an authority or change external state;
  and
- does not alter the private `/v1/entities` store.

A later tool that accepts real facts would need a separate privacy, authority,
retention, access and professional-review design. This release does not imply
permission to build that intake.

## Adding another jurisdiction

1. Keep the eight classification questions unless comparison proves one is
   UK-specific.
2. Create local classifications from local law; do not translate by name alone.
3. State which international standards are enacted locally and from when.
4. Add at least one hybrid, trust or group example that crosses jurisdictions.
5. Record disagreement rather than forcing equivalence.
6. Promote only the tested common shape into `research/_schema/`.
