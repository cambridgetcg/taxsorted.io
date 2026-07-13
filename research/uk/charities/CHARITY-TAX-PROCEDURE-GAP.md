# UK charity tax procedure gap — decisions before deadlines

**Reviewed:** 13 July 2026
**Status:** two narrow attribution procedures admitted; general case procedure not mapped

Tax administration is not one straight line from “rule” to “debt”. The route depends on the
taxpayer class, tax, period, return, the exact act HMRC took, the document that records it and its
date. A sector API without those selectors must stop before saying that a deadline, payment,
appeal or collection power applies.

## What is admitted

The first two records cover only attribution specification:

- [ITA 2007 section 542](https://www.legislation.gov.uk/ukpga/2007/3/section/542) for a charitable
  trust;
- [CTA 2010 section 495](https://www.legislation.gov.uk/ukpga/2010/4/section/495) for a charitable
  company.

In each branch the charity may specify attributable income by notice. HMRC's determination power
is conditional: HMRC must actually require the specification, and the charity must not provide it
within the statutory period of 30 days beginning with the day of that requirement. The API records
the trigger and time-limit wording but does not calculate a deadline without the actual HMRC
requirement-made date and the charity's specification-notice status.

These sections do not by themselves say that tax is payable, suspend collection, create a general
appeal route or establish that expenditure was non-charitable. The records therefore expose
`paymentEffect`, `requiredCaseSelectors` and `doesNotProve` instead of filling those gaps with a
generic HMRC story.

## What is not admitted

The API does not yet select among charity or company return filing, taxpayer amendment, HMRC
amendment, enquiry and closure, discovery or other assessment, payment and interest, statutory
review or appeal, enforcement and debt recovery. Nor does it say that an allocation determination
under section 542 or 495 has a standalone appeal right. Those propositions require their own exact
procedural law and decision-specific review.

The public gap record
`gap-non-charitable-expenditure-law-and-procedure-coverage` makes this absence queryable. The why
graph retains `gap:case-enforcement-and-challenge-not-mapped` and contains no process or
`enforced-through` edge.

## Minimum shape for the next procedure records

Every later route must state:

1. taxpayer class, tax and period;
2. decision or document type and who issued it;
3. the factual trigger and exact legal basis;
4. notice, issue, receipt and deadline dates required to calculate time;
5. whether payment is due, postponed or unaffected;
6. review, appeal or other challenge route only where the exact decision carries one;
7. next institutional actor and possible outcomes;
8. what the record does not prove.

A guidance summary may help a reader find the door. It cannot replace the legal trigger. An own
self-assessment is not silently turned into an HMRC decision, and a neighbouring appeal provision
is not borrowed merely because it would make the graph look complete.

Machine doors:

```text
GET /v1/charities/uk/official-procedures
GET /v1/charities/uk/official-procedures/{id}
GET /v1/charities/uk/gaps?status=bounded-by-design
```

This is a sector procedure map, not legal or tax advice and not a case deadline calculator.
