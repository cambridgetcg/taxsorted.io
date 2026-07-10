# Stamp Duty Land Tax — first API ruleset

**Last checked:** 2026-07-10
**Confidence:** high inside the stated boundary
**Status:** implemented as `uk.sdlt.residential.individual.2025-04-01`
**Jurisdiction:** England and Northern Ireland

This is the source ledger for the first TaxSorted developer API calculation. It is deliberately
smaller than SDLT as a whole. The engine calculates one ordinary residential purchase by
individuals; it names cases it cannot safely decide and returns `needs_review` without a tax
figure.

## Current rates

For ordinary transactions whose legal effective date is on or after 1 April 2025:

| Slice of chargeable consideration | Standard | Non-resident | Higher rates | Both surcharges |
|---|---:|---:|---:|---:|
| First £125,000 | 0% | 2% | 5% | 7% |
| £125,000–£250,000 | 2% | 4% | 7% | 9% |
| £250,000–£925,000 | 5% | 7% | 10% | 12% |
| £925,000–£1.5 million | 10% | 12% | 15% | 17% |
| Above £1.5 million | 12% | 14% | 17% | 19% |

The standard table comes from [Finance Act 2003 section 55](https://www.legislation.gov.uk/ukpga/2003/14/section/55).
[Schedule 4ZA](https://www.legislation.gov.uk/ukpga/2003/14/schedule/4ZA) adds five
percentage points when the transaction is a higher-rates transaction. [Section
75ZA](https://www.legislation.gov.uk/ukpga/2003/14/section/75ZA) adds two percentage
points when it is a non-resident transaction; [Schedule
9A](https://www.legislation.gov.uk/ukpga/2003/14/schedule/9A) supplies that test.

HMRC's current plain-language tables and examples agree: [residential
rates](https://www.gov.uk/stamp-duty-land-tax/residential-property-rates), [higher
rates](https://www.gov.uk/guidance/stamp-duty-land-tax-buying-an-additional-residential-property),
and [non-resident rates](https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents).

## The £40,000 cliff

For this ordinary purchase scope, neither the higher-rates addition nor the non-resident
addition applies below £40,000. At exactly £40,000 either can apply. That means:

- £39,999.99 with facts otherwise pointing to both surcharges: £0
- £40,000 with higher rates only: £2,000
- £40,000 with non-resident surcharge only: £800
- £40,000 with both: £2,800

The engine never treats an omitted or unknown classification as “no.” At £40,000 or above,
an unknown higher-rates or non-resident status produces `needs_review`. Below the statutory
cliff those unknowns cannot change the amount and the engine can safely calculate zero.

## First-time buyers

[Schedule 6ZA](https://www.legislation.gov.uk/ukpga/2003/14/schedule/6ZA) gives the
current relief:

| Slice | Resident transaction | Non-resident transaction |
|---|---:|---:|
| First £300,000 | 0% | 2% |
| £300,000–£500,000 | 5% | 7% |

The price cap is all-or-nothing. At £500,000 the relief can apply; one penny above it the
whole transaction returns to the ordinary table. The non-resident addition can sit on top of
first-time-buyer relief. First-time-buyer relief cannot apply when Schedule 4ZA higher rates
apply.

Eligibility itself is richer than the arithmetic. Every purchaser must be an individual who
has never acquired a qualifying residential interest anywhere in the world and who intends to
occupy this one as their only or main home. Joint purchasers, inherited or gifted shares,
older leases and linked land all matter. See HMRC [SDLTM29811](https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm29811)
and [SDLTM29845](https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm29845).
The API therefore accepts the professional caller's treatment decision; it does not infer
eligibility from a few friendly questions.

Older protected contracts can retain earlier surcharge treatment. The higher-rates saving is
in [Finance Act 2025 section 51(3) to (5)](https://www.legislation.gov.uk/ukpga/2025/8/section/51)
and is explained in [HMRC SDLTM09845A](https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm09845a).
The non-resident surcharge's commencement and transition sit in [Finance Act 2021 Schedule
16](https://www.legislation.gov.uk/ukpga/2021/26/schedule/16). Any possible protected contract
therefore returns `needs_review`; the current surcharge is never silently imposed.

## Consideration, date and rounding

The caller supplies **chargeable consideration**, in integer pence. It may be more than the
headline property price: VAT, assumed debt, mandatory property fees, non-cash value,
contingent amounts and connected-person payments can enter the legal amount. See [Schedule
4](https://www.legislation.gov.uk/ukpga/2003/14/schedule/4) and HMRC's [amount used to
calculate SDLT](https://www.gov.uk/guidance/stamp-duty-land-tax-the-amount-used-to-calculate-whats-payable).
The first API returns review for complex consideration unless a professional has already
settled and supplied the final figure.

The caller also supplies the legal **effective date**. It is normally completion, but
substantial performance can make it earlier under [Finance Act 2003 section
44](https://www.legislation.gov.uk/ukpga/2003/14/section/44). The current engine refuses
dates before its 1 April 2025 table. The table has no known legal end date; its separate 10
July 2026 review date stays visible in every result so research freshness can be monitored
without pretending that the law expired on the day it was checked.
The hosted route separately returns review for dates after its current UTC date rather than
presenting current law as a prediction of future legislation.

Rates are stored as integer basis points and money as integer pence. The engine keeps the
whole exact numerator across all bands, then rounds the final SDLT down to a whole pound once.
That order follows [HMRC SDLTM00050](https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm00050).

## Calculated boundary

The engine calculates only when every statement below is settled:

- land is in England or Northern Ireland;
- one ordinary residential dwelling;
- freehold or assignment of an existing lease, with no rent calculation;
- every beneficial purchaser is an individual;
- fixed final chargeable consideration is supplied;
- no linked transaction, shared ownership or other relief;
- no old protected contract can retain earlier rates;
- the caller has classified first-time-buyer, higher-rates and non-resident treatment.

It returns `needs_review`, with source-linked reasons and no tax amount, for mixed or
non-residential land; companies, trusts or partnerships; new leases; multiple dwellings;
linked purchases; shared ownership; other reliefs; complex consideration; uncertain facts;
or transitional contracts.

The higher-rates and residence tests are intentionally not reduced to `ownsAnotherProperty`
or `buyerLivesAbroad`. Spouses, joint purchasers, worldwide interests, replacement homes,
trust interests, lease lengths and the special SDLT residence window can all change the legal
classification.

## Source warning found during review

HMRC's current non-resident page contains a Fifi example dated 1 April 2025 that says
first-time-buyer relief fails above £625,000. The statutory cap reverted to £500,000 on that
date. Fifi's stated price is £700,000, so the example's tax total is unchanged, but that one
sentence is stale. The engine follows Schedule 6ZA and HMRC's dedicated current residential
rate page: £500,000.

## Submission is a later rail

SDLT filing is not a modern Developer Hub REST API. HMRC's current [technical
pack](https://www.gov.uk/government/publications/stamp-duty-land-tax-technical-specifications)
uses legacy XML and GovTalk:

- baseline schema 6.3;
- business rules 2.6a;
- response messages 4.4a;
- GovTalkHeader and IRheader rules 1.4;
- test-service guide 2.6.

Recognition requires a four-digit vendor ID, HMRC test credentials, TPVS schema tests, ETS
conversation tests and a new-applicant review. HMRC's [recognition
instructions](https://www.gov.uk/government/publications/stamp-duty-land-tax-technical-specifications/sdlt-recognition-instructions-version-10)
say to request the pack from its Software Developers Support Team.

The sequence stays honest:

```text
calculate → explain → validate XML → prepare → submit → poll → preserve the UTRN and receipt
```

Only the first two steps are implemented in this ruleset.
