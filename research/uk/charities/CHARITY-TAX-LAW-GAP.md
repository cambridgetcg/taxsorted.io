# UK charity tax law gap — exact route from guidance to binding provisions

**Reviewed:** 13 July 2026
**Status:** selected spine and 31-rule supplement admitted into the repository v3 corpus; live state is checked separately through the release manifest

The charity-sector corpus contains exact primary-law records for non-charitable expenditure. The
repository v3 loader now assembles the supplement
`data/uk-charity-tax-law-additions.json`: 31 atomic rules covering the supplementary trust and
company provisions and the chargeable-gains spine. Repository admission does not by itself prove
what any live host serves; consumers can compare the live manifest version and digest with the
declared release checkpoint. Guidance is never labelled as law.

This note records both the admitted slice and the larger spine still needed. It is not a claim that
every listed section applies to every charity, receipt, expenditure item, return or notice.

## The chain that must stay separate

```text
tax-law charity definition
  → receipt- or activity-specific exemption
  → charitable-application condition
  → claim requirement where one applies
  → non-charitable-expenditure restriction
  → case-specific return, assessment, collection and challenge procedure
```

There is no single blanket exemption. A graph should never replace this chain with “charity status
means no tax”.

## 1. The tax-law charity gateway

[Finance Act 2010 Schedule 6](https://www.legislation.gov.uk/ukpga/2010/13/schedule/6)
contains the current cross-tax definition:

- [paragraph 1](https://www.legislation.gov.uk/ukpga/2010/13/schedule/6/paragraph/1):
  charitable-purpose, jurisdiction, registration and management conditions;
- [paragraph 2](https://www.legislation.gov.uk/ukpga/2010/13/schedule/6/paragraph/2):
  court-jurisdiction condition;
- [paragraph 3](https://www.legislation.gov.uk/ukpga/2010/13/schedule/6/paragraph/3):
  regulator-registration condition;
- [paragraphs 4–5](https://www.legislation.gov.uk/ukpga/2010/13/schedule/6/paragraph/4):
  managers, fit-and-proper condition and HMRC's limited just-and-reasonable treatment;
- [paragraph 7](https://www.legislation.gov.uk/ukpga/2010/13/schedule/6/paragraph/7):
  enactments to which the definition applies.

[Finance (No. 2) Act 2023 section 344](https://www.legislation.gov.uk/ukpga/2023/30/section/344)
removed the former non-UK relevant-territory limb. Its transition dates vary by tax and prior
status, so a historical graph must not invent one universal effective date.

[Charities Act 2011 sections 2–4](https://www.legislation.gov.uk/ukpga/2011/25/section/2)
provide the England and Wales charitable-purpose descriptions and public-benefit requirement.
Territorial charity law still differs; UK tax extent does not make one charity-law analysis valid
for Scotland and Northern Ireland.

HMRC's [recognition chapter](https://www.gov.uk/government/publications/charities-detailed-guidance-notes/chapter-2-applications-for-recognition-as-a-charity-for-tax-purposes)
and [application service](https://www.gov.uk/charity-recognition-hmrc) explain the administrative
process. That process is guidance and administration; it is not itself the operative exemption.
Application identity details are not public-corpus material.

## 2. Income and gains exemptions

### Charitable trusts — Income Tax Act 2007 Part 10

The exact current part is [ITA 2007 Part 10](https://www.legislation.gov.uk/ukpga/2007/3/part/10).

| Subject | Provisions |
| --- | --- |
| Gift Aid receipts | [sections 520–521](https://www.legislation.gov.uk/ukpga/2007/3/section/520) |
| Company gifts and inter-charity payments | [sections 522–523](https://www.legislation.gov.uk/ukpga/2007/3/section/522) |
| Legacies received from 6 April 2026 | [section 523A](https://www.legislation.gov.uk/ukpga/2007/3/section/523A) |
| Charitable trade | [sections 524–525](https://www.legislation.gov.uk/ukpga/2007/3/section/524) |
| Small trade and its conditions | [sections 526 and 528](https://www.legislation.gov.uk/ukpga/2007/3/section/526) |
| Fundraising events and lotteries | [sections 529–530](https://www.legislation.gov.uk/ukpga/2007/3/section/529) |
| Property income | [section 531](https://www.legislation.gov.uk/ukpga/2007/3/section/531) |
| Savings and investment income | [section 532](https://www.legislation.gov.uk/ukpga/2007/3/section/532) |
| Miscellaneous and estate income | [sections 536–537](https://www.legislation.gov.uk/ukpga/2007/3/section/536) |
| Claim requirement and exceptions | [section 538](https://www.legislation.gov.uk/ukpga/2007/3/section/538) |

### Charitable companies — Corporation Tax Act 2010 Part 11

The parallel company provisions are in
[CTA 2010 Part 11](https://www.legislation.gov.uk/ukpga/2010/4/part/11).

| Subject | Provisions |
| --- | --- |
| Gift Aid receipts | [sections 471–472](https://www.legislation.gov.uk/ukpga/2010/4/section/471) |
| Company gifts and inter-charity payments | [sections 473–474](https://www.legislation.gov.uk/ukpga/2010/4/section/473) |
| Legacies received from 6 April 2026 | [section 474A](https://www.legislation.gov.uk/ukpga/2010/4/section/474A) |
| Charitable trade | [sections 478–479](https://www.legislation.gov.uk/ukpga/2010/4/section/478) |
| Small trade and its conditions | [sections 480 and 482](https://www.legislation.gov.uk/ukpga/2010/4/section/480) |
| Fundraising events and lotteries | [sections 483–484](https://www.legislation.gov.uk/ukpga/2010/4/section/483) |
| Property income | [section 485](https://www.legislation.gov.uk/ukpga/2010/4/section/485) |
| Investment income | [section 486](https://www.legislation.gov.uk/ukpga/2010/4/section/486) |
| Miscellaneous and estate income | [sections 488–489](https://www.legislation.gov.uk/ukpga/2010/4/section/488) |
| Claim machinery | section-specific rules plus [sections 477A and 491A](https://www.legislation.gov.uk/ukpga/2010/4/section/477A) |

### Capital gains

[Taxation of Chargeable Gains Act 1992 section 256](https://www.legislation.gov.uk/ukpga/1992/12/section/256)
excludes a gain only where it accrues to a charity and is applicable and applied for charitable
purposes. Subsections (3)–(4) restrict that result for attributed non-exempt amounts;
[sections 256A–256D](https://www.legislation.gov.uk/ukpga/1992/12/section/256A) contain the
attribution machinery.

The v3 supplement now admits seven section 256–256D records for the gain exemption, cessation,
attribution and specification effects that connect to `tax-non-charitable-expenditure`. That does
not complete the wider `tax-income-and-gains` treatment or prove that every donation, property
receipt, trade or investment gain qualifies, or that recognition alone satisfies the
receipt-specific conditions.

## 3. Non-charitable expenditure

For charitable trusts:

- [ITA section 539](https://www.legislation.gov.uk/ukpga/2007/3/section/539) restricts exemptions;
- [section 540](https://www.legislation.gov.uk/ukpga/2007/3/section/540) uses the lesser of
  non-charitable expenditure and attributable income and gains;
- [sections 541–542](https://www.legislation.gov.uk/ukpga/2007/3/section/541) provide attribution
  and specification machinery;
- [section 543](https://www.legislation.gov.uk/ukpga/2007/3/section/543) defines categories of
  non-charitable expenditure;
- the machinery continues through [section 564](https://www.legislation.gov.uk/ukpga/2007/3/section/564),
  including supplementary rules for investments, loans, overseas payments and excess expenditure.

For charitable companies, the parallel chain is
[CTA sections 492–517](https://www.legislation.gov.uk/ukpga/2010/4/section/492): sections 492–493
restrict and calculate the non-exempt amount, sections 494–495 attribute it, and section 496 defines
non-charitable expenditure.

The original admitted records cover ITA sections 539–543 and 562–564 and CTA sections 492–496 and
515–517. The authored v3 supplement now adds 12 trust rules from ITA 544–548 and 558–561, 12 company
rules from CTA 497–501 and 511–514, and 7 TCGA 1992 section 256–256D rules. It uses 23 exact
substantive-section sources, the exact Finance Act 2026 section 55 transition source, and three
Finance Act 2011 Schedule 3 transition sources. Repository admission still does not establish that
a particular payment is non-charitable, automatic deregistration, dishonesty, a tax amount, a return
deadline, an appeal right or a collection route.

### Authored v3 admission: 31 atomic rules

The current-law research is represented in the supplement by 31 admitted rule records: 12 for
trusts, 12 for companies and 7 for chargeable gains. One rule states one legal proposition and cites
its exact current provision; sections containing distinct tests are not compressed into a single
outcome. The records use the stable prefixes `rule-ita-2007-`, `rule-cta-2010-` and
`rule-tcga-1992-` respectively. This is a repository-corpus result; live publication is a separate
observable release state.

| Trust source and admitted records | Company source and admitted records | Safe proposition boundary |
| --- | --- | --- |
| [ITA 544](https://www.legislation.gov.uk/ukpga/2007/3/section/544): `s544-loss-calculation`, `s544-miscellaneous-transaction` | [CTA 497](https://www.legislation.gov.uk/ukpga/2010/4/section/497): `s497-loss-calculation`, `s497-miscellaneous-transaction` | Keep the calculation cross-references separate from the hypothetical-charge definition. ITA additionally requires that the trustees would have been liable. |
| [ITA 545](https://www.legislation.gov.uk/ukpga/2007/3/section/545): `s545-expenditure-scope` | [CTA 498](https://www.legislation.gov.uk/ukpga/2010/4/section/498): `s498-expenditure-scope` | Capital expenditure is included; investing funds, making a loan and repaying a borrowing are excluded only from the ordinary-expenditure limb. |
| [ITA 546](https://www.legislation.gov.uk/ukpga/2007/3/section/546): `s546-commitment-timing` | [CTA 499](https://www.legislation.gov.uk/ukpga/2010/4/section/499): `s499-commitment-timing` | Time commitment-related expenditure by whether hypothetical UK-GAAP accounts for the tax year or accounting period would take it into account. |
| [ITA 547](https://www.legislation.gov.uk/ukpga/2007/3/section/547): `s547-overseas-reasonable-steps` | [CTA 500](https://www.legislation.gov.uk/ukpga/2010/4/section/500): `s500-overseas-reasonable-steps` | An overseas payment can be non-charitable expenditure despite a solely charitable purpose if the charity did not take the steps HMRC considers reasonable to ensure charitable application. |
| [ITA 548](https://www.legislation.gov.uk/ukpga/2007/3/section/548): `s548-same-year-recycling` | [CTA 501](https://www.legislation.gov.uk/ukpga/2010/4/section/501): `s501-same-period-recycling` | Same-year or same-period reinvestment or lending, capped at the original sum, is protected only from the specified investment and loan limbs. |
| [ITA 558](https://www.legislation.gov.uk/ukpga/2007/3/section/558): `s558-listed-purpose-gateway`, `s558-unlisted-claim-route`, `s558-allowable-purpose` | [CTA 511](https://www.legislation.gov.uk/ukpga/2010/4/section/511): `s511-listed-purpose-gateway`, `s511-unlisted-claim-route`, `s511-allowable-purpose` | Separate listed investment types, HMRC approval of an unlisted type on claim, and the all-circumstances benefit/no-tax-avoidance purpose test. |
| [ITA 559](https://www.legislation.gov.uk/ukpga/2007/3/section/559): `s559-security-types` | [CTA 512](https://www.legislation.gov.uk/ukpga/2010/4/section/512): `s512-security-types` | These sections identify securities capable of entering the Type 1 route; they do not by themselves satisfy the conditions or post-2026 purpose test. |
| [ITA 560](https://www.legislation.gov.uk/ukpga/2007/3/section/560): `s560-security-conditions` | [CTA 513](https://www.legislation.gov.uk/ukpga/2010/4/section/513): `s513-security-conditions` | Preserve Conditions A, B and C, the predecessor-company rules and the limited supervised-money-market exception as one linked test. |
| [ITA 561](https://www.legislation.gov.uk/ukpga/2007/3/section/561): `s561-approved-loan` | [CTA 514](https://www.legislation.gov.uk/ukpga/2010/4/section/514): `s514-approved-loan` | A loan must not be an investment and must meet one statutory route; only the charity-benefit/no-tax-avoidance route depends on HMRC approval on claim. |

The seven gains records are deliberately split by effect and taxpayer:

- [TCGA 256](https://www.legislation.gov.uk/ukpga/1992/12/section/256):
  `s256-charitable-gain-exemption`, `s256-cessation-deemed-disposal` and
  `s256-attributed-gains-chargeable`. The first is the charitable-application exemption; the second
  is the trust-only market-value and tracing rule when property ceases to be held on charitable
  trusts; the third treats gains attributed to a non-exempt amount as being, and always having been,
  chargeable.
- [TCGA 256A](https://www.legislation.gov.uk/ukpga/1992/12/section/256A) and
  [256B](https://www.legislation.gov.uk/ukpga/1992/12/section/256B):
  `s256a-trust-gain-attribution` and `s256b-trust-gain-specification`. These use the ITA 540
  non-exempt amount and give trustees the notice route, followed by HMRC determination only after an
  actual requirement and expiry of the 30-day period.
- [TCGA 256C](https://www.legislation.gov.uk/ukpga/1992/12/section/256C) and
  [256D](https://www.legislation.gov.uk/ukpga/1992/12/section/256D):
  `s256c-company-gain-attribution` and `s256d-company-gain-specification`. These are the separate
  company/accounting-period route linked to CTA 493–494.

### Events and legacy law that must not be flattened

[Finance Act 2026 section 55](https://www.legislation.gov.uk/ukpga/2026/11/section/55) changes
ITA 558 and CTA 511 only for **investments made on or after 6 April 2026**. The API therefore needs
an investment-made event qualifier, not a generic section-level effective date. An earlier
investment remains governed by the former version of the section, including its Type 12 route; the
current consolidated wording must not be applied backwards merely because it appears in the default
legislation view.

The supplement encodes that boundary on the six ITA 558 and CTA 511 rules as an `investment-made`
event beginning on 6 April 2026. Each carries Finance Act 2026 section 55 as a separate source,
evidence record and transition authority. ITA 559–561 and CTA 512–514 are not given that date merely
because the amended gateway refers to them; section 55 amends sections 558 and 511.

The substantial-donor provisions in
[ITA 549–557](https://www.legislation.gov.uk/ukpga/2007/3/section/549) and
[CTA 502–510](https://www.legislation.gov.uk/ukpga/2010/4/section/502) are dotted out, but their
repeal is not a clean date boundary. [Finance Act 2011 Schedule 3 paragraphs
12–13](https://www.legislation.gov.uk/ukpga/2011/11/schedule/3/paragraph/12) removed the trust
categories and provisions; [paragraphs
22–23](https://www.legislation.gov.uk/ukpga/2011/11/schedule/3/paragraph/22) did the same for
companies. [Paragraph
27](https://www.legislation.gov.uk/ukpga/2011/11/schedule/3/paragraph/27) applies the relevant
repeals to transactions occurring on or after 1 April 2013 **except** a transaction under a
contract made before that date, unless the contract was varied on or after that date.
[Paragraphs 29](https://www.legislation.gov.uk/ukpga/2011/11/schedule/3/paragraph/29) and
[30](https://www.legislation.gov.uk/ukpga/2011/11/schedule/3/paragraph/30) contain the separate
trust and company transition from 1 April 2011. Current ITA 543 and CTA 496 still point to these
ranges. The supplement now records paragraphs 27, 29 and 30 as exact primary-law sources and carries
a structured `legacy-contract-transition` gap with transaction, contract and variation-date
selectors. It does not admit the repealed ranges as ordinary current rules. A later case engine still
needs the conditional historical rules and the actual contract, variation, donation and transaction
facts; the old text must not be erased as irrelevant.

### Gaps that remain explicit

- The pre-6-April-2026 Type 12 investment branch and the pre-/post-event connection between an
  investment and its governing test are not represented.
- The substantial-donor excluded-contract selector and 2011 transition are represented as a
  structured transparency gap, but the repealed trust and company rules are not yet implemented as a
  conditional historical decision branch.
- ITA 559 and CTA 512 retain EU-government and Council Directive 2003/48/EC Annex references; the
  required frozen, ambulatory or later-repeal interpretation is not resolved here. The savings for
  funds established under older Charities Acts named in ITA 558 and CTA 511 are also unresolved.
- The primary provisions say “claim” or “notice” but do not in this slice establish the current
  form, channel, evidence, decision notice, amendment or appeal route for an investment, loan or
  gains-attribution case.
- “Reasonable steps”, “allowable purpose”, security and market status, charity benefit and tax
  avoidance remain fact-sensitive legal applications. A rule record cannot decide them without case
  facts and, where the statute requires it, an HMRC decision.
- CTA commencement and later TCGA definition changes use accounting-period or tax-year qualifiers.
  The legislation service's consolidated-version date is not itself the legal event date.
- Return, enquiry, assessment, payment, appeal, collection and debt routes remain outside this
  substantive-law admission. None of these records proves tax due, misconduct, deregistration or
  enforcement against a person or organisation.
- Case-law propositions, precedent relationships and case-specific application remain outside this
  supplement; they require their own exact authorities, facts and procedural posture.

## 4. Finance Act 2026 changes

The enacted charity package is [Finance Act 2026 sections 54–56](https://www.legislation.gov.uk/ukpga/2026/11/crossheading/charities/enacted).

| Provision | Effect | Applies from |
| --- | --- | --- |
| [section 54](https://www.legislation.gov.uk/ukpga/2026/11/section/54) | Inserts ITA 523A and CTA 474A for legacies and changes related carry-back treatment | gifts received on or after 6 April 2026 |
| [section 55](https://www.legislation.gov.uk/ukpga/2026/11/section/55) | Changes approved-charitable-investment tests in ITA 558 and CTA 511 | investments made on or after 6 April 2026 |
| [section 56 and Schedule 9](https://www.legislation.gov.uk/ukpga/2026/11/section/56) | Changes tainted-donation tests and later-period recovery machinery | relievable donations made on or after 6 April 2026, subject to transition |

An [earlier policy paper](https://www.gov.uk/government/publications/changes-to-charity-compliance-measures/changes-to-the-charity-compliance-measures)
proposed a 1 April corporation-tax date. The enacted Act uses 6 April for
these provisions; the Act controls. The same policy paper discussed sanctions for persistent tax
non-compliance, but sections 54–56 do not enact a fourth charity sanctions measure. A graph must not
invent one.

## 5. Existing record admission map

| Current treatment | Primary-law path or authored coverage | Present boundary |
| --- | --- | --- |
| `tax-hmrc-recognition` | FA 2010 Schedule 6; F(No.2)A 2023 section 344; territorially correct charity law | application and recognition process remains guidance |
| `tax-income-and-gains` | ITA 521–538; CTA 471–491A; TCGA 256–256D, with the section 256–256D non-exempt-amount connection authored in the supplement | receipt categories, application and claim conditions remain separate and incomplete |
| `tax-non-charitable-expenditure` | Original admission: ITA 539–543, 562–564; CTA 492–496, 515–517. Admitted supplement: ITA 544–548, 558–561; CTA 497–501, 511–514; TCGA 256–256D | pre-2026 Type 12, conditional donor history, case application, wider procedure and case law remain open |
| `tax-charity-trading` | ITA 524–530; CTA 478–484 | “ancillary” remains an HMRC interpretation |
| `tax-trading-subsidiary` | ITA 558 and CTA 511 for the parent's investment slice | does not prove separate-company risk, tax or donation deductions |
| `tax-gift-aid` | ITA Part 8 Chapter 2 plus FA 2026 section 56 and Schedule 9 | 2026 changes are not the complete Gift Aid regime |
| `tax-public-benefit-bargain-analysis` | charity-purpose law plus the exemption and restriction provisions | “bargain” remains TaxSorted analysis |
| VAT, rates and SDLT treatments | their separate exact statutory regimes | this direct-tax backbone cannot ground them |

## 6. Admission result and remaining pipeline

The v3 supplement completes repository admission and default-loader assembly for the 31-rule slice:
exact current provision
URLs; stable trust, company and gains rule IDs; field and reasoning-step mappings; explicit temporal
objects; conditions and non-proofs; exact Finance Act 2026 section 55 commencement evidence; and a
structured Finance Act 2011 legacy-contract gap. It also preserves taxpayer-class separation and
does not promote guidance, consolidated-page dates or editorial analysis into law.

No deployment claim follows from this research note. The central release checkpoint declares the
intended corpus digest; observing the live manifest and endpoints is the separate release check.

The next slice must:

1. verify any claimed live release against its manifest version and corpus digest;
2. model the pre-6-April-2026 Type 12 investment branch with the correct event-version connection;
3. turn the structured substantial-donor transition gap into a conditional historical branch only
   when the repealed provisions and case selectors can be represented safely;
4. close the named procedure gaps, including enquiry-closure directions, wider recovery and
   clause-level provenance, without inventing one universal HMRC route;
5. map case-law propositions and precedent separately from legislation, then preserve case-
   applicability and enforcement gaps until the actual facts, notices and dates are available.

The remaining gap is therefore concrete, not vague: the supplementary middle and gains spine is
admitted as exact repository data, while historical branches, case application, wider procedure
and case law remain named and machine-readable as incomplete.
