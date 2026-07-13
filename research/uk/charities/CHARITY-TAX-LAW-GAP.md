# UK charity tax law gap — exact route from guidance to binding provisions

**Reviewed:** 13 July 2026
**Status:** selected non-charitable-expenditure spine admitted; wider tax-law map remains open

The charity-sector corpus now contains its first exact primary-law rule records for one treatment:
non-charitable expenditure. The selected trust and company provisions appear in `/tax-rules` and
in that treatment's why graph. Every other treatment still stops at
`gap:binding-provision-not-mapped`. Guidance is never labelled as law.

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

These provisions can ground `tax-income-and-gains` after admission. They do not prove that every
donation, property receipt, trade or investment gain qualifies, or that recognition alone satisfies
the receipt-specific conditions.

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

The admitted records cover ITA sections 539–543 and 562–564 and CTA sections 492–496 and 515–517.
The supplementary middle provisions—ITA 544–561 and CTA 497–514—remain deliberately unmapped.
This slice does not establish that a particular payment is non-charitable, automatic deregistration,
dishonesty, a tax amount, a return deadline, an appeal right or a collection route.

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

| Current treatment | Primary-law path for a later release | Present boundary |
| --- | --- | --- |
| `tax-hmrc-recognition` | FA 2010 Schedule 6; F(No.2)A 2023 section 344; territorially correct charity law | application and recognition process remains guidance |
| `tax-income-and-gains` | ITA 521–538; CTA 471–491A; TCGA 256–256D | category, application and claim conditions must stay separate |
| `tax-non-charitable-expenditure` | Selected admission: ITA 539–543, 562–564; CTA 492–496, 515–517. Full chains: ITA 539–564; CTA 492–517 | supplementary middle, TCGA attribution and case procedure remain explicit gaps |
| `tax-charity-trading` | ITA 524–530; CTA 478–484 | “ancillary” remains an HMRC interpretation |
| `tax-trading-subsidiary` | ITA 558 and CTA 511 for the parent's investment slice | does not prove separate-company risk, tax or donation deductions |
| `tax-gift-aid` | ITA Part 8 Chapter 2 plus FA 2026 section 56 and Schedule 9 | 2026 changes are not the complete Gift Aid regime |
| `tax-public-benefit-bargain-analysis` | charity-purpose law plus the exemption and restriction provisions | “bargain” remains TaxSorted analysis |
| VAT, rates and SDLT treatments | their separate exact statutory regimes | this direct-tax backbone cannot ground them |

## 6. Admission result and next pipeline

The selected slice completed these admission steps: exact current provision URLs; stable trust and
company rule IDs; field and reasoning-step mappings; explicit dates or `null`; conditions and
non-proofs; and adversarial tests for valid-provision substitution, guidance promotion, taxpayer
class drift and invented application or enforcement.

The next slice must:

1. admit the supplementary middle provisions one exact selector at a time;
2. admit the separate chargeable-gains attribution spine;
3. connect Finance Act 2026 transitions only where the commencement rule is exact;
4. map return, amendment, enquiry, assessment, payment, appeal and debt procedures by taxpayer and
   decision type, without inventing one universal HMRC route;
5. preserve the treatment's case-applicability and case-enforcement gaps until that capability has
   the actual facts, notice and dates it requires.

The remaining gap is therefore concrete, not vague: a useful exact spine is public, while the
unadmitted middle, gains and procedural law remains named and machine-readable as incomplete.
