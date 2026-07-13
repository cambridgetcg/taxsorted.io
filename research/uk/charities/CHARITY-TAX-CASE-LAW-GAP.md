# UK charity tax case-law gap — bounded search, no effects admitted yet

**Reviewed:** 13 July 2026
**Status:** official procedural sources checked; no judgment holding or case-effect edge admitted

The procedure map now has a primary-law spine. It does **not** yet say how a court or tribunal has
interpreted that spine. This note records exactly what was searched, what was not searched, and
why the API must continue to show a case-law gap.

## What the bounded search covered

The search was deliberately limited to current legislation and official HMRC material needed to
identify the trust and company state machines. It was a procedural-source search, not a complete
search of judgments.

On 13 July 2026 the review:

1. opened the current consolidated text on legislation.gov.uk for the trust return, enquiry,
   assessment, appeal, payment and territorial recovery provisions;
2. did the same for the company-return provisions in Schedule 18 to the Finance Act 1998;
3. checked 40 identified primary-law `data.xml` endpoints, all of which responded successfully at
   that snapshot date;
4. compared the statutory structure with the following GOV.UK and HMRC explanations.

| Question checked | Official explanatory sources reviewed |
| --- | --- |
| Charity returns and forms | [HMRC Chapter 6: claims and returns](https://www.gov.uk/government/publications/charities-detailed-guidance-notes/chapter-6-claims-and-returns), [SA900](https://www.gov.uk/government/publications/self-assessment-trust-and-estate-tax-return-sa900), [SA907](https://www.gov.uk/government/publications/self-assessment-trust-and-estate-charities-sa907) and [CT600E](https://www.gov.uk/government/publications/corporation-tax-charity-and-community-amateur-sports-clubs-ct600e-2015-version-3) |
| Default determinations | [Self Assessment Legal Framework SALF209](https://www.gov.uk/hmrc-internal-manuals/self-assessment-legal-framework/salf209) |
| Trust discovery assessments | [EM3202](https://www.gov.uk/hmrc-internal-manuals/enquiry-manual/em3202), [EM3211](https://www.gov.uk/hmrc-internal-manuals/enquiry-manual/em3211), [EM3220](https://www.gov.uk/hmrc-internal-manuals/enquiry-manual/em3220), [EM3232](https://www.gov.uk/hmrc-internal-manuals/enquiry-manual/em3232) and [EM3233](https://www.gov.uk/hmrc-internal-manuals/enquiry-manual/em3233) |
| Company discovery and payment | [COTAX COM23070](https://www.gov.uk/hmrc-internal-manuals/cotax-manual/com23070) and [COM90010](https://www.gov.uk/hmrc-internal-manuals/cotax-manual/com90010) |
| Appeals, reviews and payment | [ARTG2010](https://www.gov.uk/hmrc-internal-manuals/appeals-reviews-and-tribunals-guidance/artg2010), [ARTG2210](https://www.gov.uk/hmrc-internal-manuals/appeals-reviews-and-tribunals-guidance/artg2210) and [GOV.UK tax appeals](https://www.gov.uk/tax-appeals) |
| Debt collection | [DMBM657020](https://www.gov.uk/hmrc-internal-manuals/debt-management-and-banking/dmbm657020) and [what happens if a tax bill is not paid](https://www.gov.uk/guidance/what-will-happen-if-you-do-not-pay-your-tax-bill) |

Successful access proves only that those sources were available and reviewed. It does not prove
that the provisions apply to a particular charity, or that a manual states the law completely.

## What surfaced but was not admitted

HMRC manuals use concepts shaped by decided cases, including the “hypothetical officer”, what
counts as information made available, carelessness, deliberateness and a person acting on a
taxpayer’s behalf. Search results and manuals also surfaced candidate names including *HMRC v
Hicks* and *Bessie Taube*.

No holding from those cases is recorded here. A search-result snippet is not a judgment. An HMRC
manual states HMRC’s view, not a binding holding. The bounded search did not retrieve, read and
classify a complete authoritative set of judgments for any issue.

## Why no case effect enters the API

A case cannot safely be reduced to “court says rule applies”. Its effect can depend on:

- the exact provision and version considered;
- the material facts and evidence;
- the procedural posture and question the tribunal was empowered to decide;
- whether the relevant words were part of the holding or only commentary;
- the court or tribunal level — a First-tier Tribunal decision does not bind other tribunals in
  the same way as an appellate judgment;
- later appeal, reversal, approval, distinction or statutory amendment.

Until those matters are checked, the API admits no case node, holding, outcome or edge such as
`applies-rule`, `narrows-rule`, `enforced-through` or `challenge-available`. It may expose the
primary procedural rule and this gap, but it must not attribute a legal effect to a named case.

“No effects admitted” is not a claim that no relevant cases exist. It is an honest statement that
the necessary judgment research has not yet been completed.

## Questions requiring a separate judgment search

The next case-law work should be split by issue rather than by the word “charity”:

1. discovery assessments — what counts as a discovery, information made available, careless or
   deliberate conduct, action by a person on behalf of the taxpayer, and statutory finality;
2. the scope and validity of partial and final closure notices;
3. whether and how an attribution determination under ITA 2007 section 542 or CTA 2010 section
   495 can be challenged outside an appeal from a later assessment;
4. classification of the particular expenditure said to be non-charitable;
5. recovery, injunction, judicial-review and insolvency interactions.

Each queue needs its own provisions, dates, search terms and stopping rule. A negative search must
be recorded as “no decision found in this bounded search”, never “there are no cases”.

## Admission test for a future case record

Before a judgment affects the public graph, the research record should contain:

1. neutral citation, court or tribunal, decision date and authoritative full-text URL;
2. the exact statutory provision and version in issue;
3. material facts and procedural history;
4. issue, holding and disposition, kept separate from the parties’ arguments;
5. the smallest proposition the decision supports and the facts that limit it;
6. appellate and subsequent treatment checked to the review date;
7. a quotation locator or paragraph references, without copying excessive text;
8. an independent second review before an effect edge is published.

The search should start with the Supreme Court, Courts and Tribunals Judiciary, the National
Archives’ Find Case Law service and the Upper Tribunal Tax and Chancery Chamber. BAILII can help
locate a public judgment copy, but the citation, text and subsequent history still need checking.
Every run should record the repository, exact query, provision, filters, run date and results
reviewed.

## Present boundary

The public explanation may currently say:

> The legislation creates this procedural route. HMRC guidance explains HMRC’s current
> administrative view. Relevant case-law application has not yet been reviewed and is not
> represented.

It may not say that a court approved HMRC’s position, that a case guarantees an outcome, or that a
challenge exists merely because a manual or search result mentions one.
