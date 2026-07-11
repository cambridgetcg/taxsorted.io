# UK tax expert — architecture of understanding

**Last Updated:** 2026-07-11
**Confidence:** High for the architecture and admitted MTD sources; capability depth varies by row
**Status:** First deep path implemented; broader UK coverage mapped

TaxSorted does not call a fluent text generator a tax expert. A professional answer must say:

- which facts it used;
- which facts are still unknown;
- which rule applies to which person, place and period;
- whether the source is law, HMRC's position, an official explanation or commentary;
- how the result was derived;
- what could change it;
- whether TaxSorted can explain, classify, calculate, prepare or file;
- the smallest useful next action when it must stop.

The machine contract is `taxsorted.tax-answer/1`. Its canonical TypeScript shape and semantic
invariants live in `engine/jurisdictions/uk/expert/contract.ts`. Product coverage lives in
`engine/jurisdictions/uk/expert/capabilities.ts`. The public page is `/uk/tax-expert`; the public
machine registry is `GET /v1/uk/tax-expert`.

## Why the first deep path is MTD Income Tax

Making Tax Digital for Income Tax is already in force for the first cohort. The first quarterly
deadline is 7 August 2026. The existing ITSA engine already owns the phased threshold table,
periods, records and preparation logic, so the expert layer reuses that spine instead of creating
a fourth personal-tax calculator.

The readiness assessment covers:

- the legal duty to deliver the relevant return and whether one of its activities continued at
  entry, so non-filing and unrelated source churn never create an escape or a false mandate;
- the strictly-over £50,000, £30,000 and £20,000 phased thresholds;
- residence-aware gross self-employment plus UK and foreign property income, before expenses;
- submitted-return facts versus forecasts;
- exact final-entry-activity cessation, including the last update, notice and annual return;
- concrete return-page or claim evidence, NINO status, digital exclusion and other HMRC
  applications based on expected future-return indicators;
- standard and calendar cumulative update periods;
- the honest 2026/27 penalty position;
- explicit stop points for return amendments, annualisation and other special income rules.

It does not guess a per-business submission count. Exact workload needs each source's start,
prior-return and cessation history, especially for a new activity that has not yet entered quarterly
reporting.

It does not collect names, NINOs, UTRs, addresses or HMRC credentials. The browser check runs
locally. The assessment API is stateless and does not write request facts to application storage.

## Official source ledger for the first path

The canonical structured records, including source kind, legal force, update date, retrieval date,
review date, supported claims and limits, live beside the rules in
`engine/jurisdictions/uk/expert/mtd-income-tax.ts`.

The admitted official sources are:

- [Income Tax (Digital Obligations) Regulations 2026](https://www.legislation.gov.uk/uksi/2026/336/pdfs/uksi_20260336_en.pdf) — regulations 5, 6, 9, 14 and 25 to 27
- [HMRC: before you use MTD Income Tax](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/before-you-use-this-guide)
- [HMRC: work out qualifying income](https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax)
- [HMRC: exemptions](https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax)
- [HMRC: quarterly updates](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates)
- [HMRC: if your circumstances change](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/if-your-circumstances-change)
- [HMRC: penalties](https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax)
- [HMRC: normal Self Assessment deadlines](https://www.gov.uk/self-assessment-tax-returns/deadlines)

HMRC guidance is labelled as an official explanation, not binding law. The regulations are labelled
as secondary legislation. A source URL alone is not treated as proof that a particular person's
facts satisfy a rule.

## Coverage path

Coverage follows taxpayer journeys rather than a flat list of tax names:

1. become a sole trader or landlord;
2. start or change a job or pension;
3. income or family circumstances change;
4. save, invest or dispose of assets;
5. buy, own or sell land;
6. contribute to or draw a pension;
7. arrive, leave or work across borders;
8. give assets, die, or administer a trust or estate;
9. form and run a company;
10. employ or contract people;
11. sell goods or services;
12. correct, dispute, appeal or cannot pay.

The capability registry marks each path as mapped, explained, classified, calculated, prepared or
filed. Missing stages stay visible. The next depth target after MTD readiness is one consolidated
adjusted-net-income and threshold-interaction engine for Personal Allowance, HICBC and Tax-Free
Childcare. It must consolidate the existing overlapping personal-tax modules, not add another one.

## Safety walls

- Unknown, invalid, zero and not-applicable are different states.
- A material unknown prevents a determined answer.
- A required but unsubmitted return cannot become an MTD escape.
- A different new source cannot replace the regulation 5 activity-continuation test.
- A UK resident's foreign property income cannot silently disappear from the threshold.
- An exempt or out-of-scope answer cannot carry an in-scope quarterly penalty warning.
- A proposal or stale source cannot silently support an in-force result.
- Guidance cannot be relabelled as law.
- Determinism means repeatability, not certainty.
- A confidence label is a rule-based summary, never a probability or decorative score.
- Duplicate JSON fields are rejected before semantic parsing.
- No LLM may alter rule data, override deterministic output or submit to HMRC.
- Filing, payment and representation always require separate authority and an explicit human act.
- A determined legal classification requires declared coverage, rules, authoritative evidence and
  reasoning whose fact paths resolve.

That is the architecture of love in practical form: the system never abandons a person at a wall.
It names why it stopped, what fact matters next, the official receipt and who can make the decision.
