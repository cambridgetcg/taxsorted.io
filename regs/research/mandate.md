# MTD for Income Tax — The Mandate: Ground Truth

Research date: 2026-07-02. All claims verified against live sources on this date (fetched via WebFetch). Primary sources: GOV.UK and legislation.gov.uk.

---

## 0. Headline legislative fact (post-2025 development — critical for TaxSorted)

**The principal legislation changed in March 2026.** The Income Tax (Digital Requirements) Regulations 2021 (SI 2021/1076) have been **revoked** and replaced by **The Income Tax (Digital Obligations) Regulations 2026 (SI 2026/336)**, made 24 March 2026, **in force 1 April 2026**.

- Regulation 48: "The following are revoked — (a) the Income Tax (Digital Requirements) Regulations 2021"
- Regulation 1: regulations "come into force on 1st April 2026"
- Source: https://www.legislation.gov.uk/uksi/2026/336/made
- Draft PDF also published: https://assets.publishing.service.gov.uk/media/687a1015a8ee0c6e06f45258/Draft-Income-Tax-Digital-Obligations-Regulations-2026.pdf

Any TaxSorted work referencing "the Digital Requirements Regulations 2021" is referencing revoked law. Cite SI 2026/336.

---

## 1. Mandation thresholds and dates

GOV.UK eligibility page (https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax):

| Qualifying income measured in tax year | Threshold | Mandated from |
|---|---|---|
| 2024–25 | over £50,000 | 6 April 2026 |
| 2025–26 | over £30,000 | 6 April 2027 |
| 2026–27 (and each subsequent year) | over £20,000 | 6 April 2028 |

- The mechanism: HMRC looks at "the Self Assessment tax return that you submitted in the previous tax year" (i.e. the 2024–25 return filed by 31 Jan 2026 determines 2026–27 mandation). Source: https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax
- New businesses: "You do not need to start using Making Tax Digital for Income Tax until after you have submitted your first Self Assessment tax return." Source: eligibility page above.

### Is the £20,000 step legislated?
**Yes — legislated and in force.** SI 2026/336, regulation 27 sets the qualifying amounts:
- "£50,000 for the tax year 2024-25"
- "£30,000 for the tax year 2025-26"
- "£20,000 for the tax year 2026-27 and any subsequent tax year"

Source: https://www.legislation.gov.uk/uksi/2026/336/made

The accompanying policy paper (published 24 March 2026) confirms the April 2028 step was "announced at Spring Statement 2025" and brings ~970,000 additional sole traders and landlords into scope: https://www.gov.uk/government/publications/making-tax-digital-for-income-tax-self-assessment-reducing-the-mandation-threshold-from-30000-to-20000-from-april-2028/reduction-of-the-mandation-threshold-from-30000-to-20000-from-april-2028

Scale (GOV.UK press release, https://www.gov.uk/government/news/one-year-until-making-tax-digital-for-income-tax-launches): "Around 780,000 self-employed individuals and landlords will be required to use MTD for Income Tax from April 2026, with a further 970,000 joining from April 2027."

---

## 2. What counts as qualifying income

Source: https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax

- **Gross, not net**: "HMRC will assess your gross income (income before you deduct expenses, also called your turnover)."
- **Included**: self-employment (sole trade) income; UK property income; foreign property income (if UK tax resident); your share of jointly-owned property income; plus edge cases — disguised investment management fees taxed as trade profits, income-based carried interest, continuing transactions-in-UK-land income, trade/property income received as a bare-trust beneficiary or directly from an interest-in-possession trust.
- **Excluded**: "income from: employment (PAYE), your share of profit from a partnership as an individual partner, dividends (including those from your own company), a State Pension, private pensions"; also UK REIT/PAIF income, qualifying care relief income, basis-period-reform transition profits, one-off UK land transactions.
- **Jointly-owned property**: "Your share of the property income will count towards your qualifying income." If the taxpayer is only notified of income after expense deduction, HMRC assesses that post-deduction figure (also reflected on the eligibility page: "your share of the income after expenses have been deducted").
- **Non-UK residents**: only UK property income and self-employment income declared on a UK Self Assessment return count; foreign income does not. (Non-residents are therefore in scope, not exempt as a class.)

---

## 3. Annual cycle for a mandated person

### 3a. Quarterly updates
Source: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates and SI 2026/336 regs 12–13.

**Standard (tax-year) quarters and deadlines:**

| Cumulative period covered | Deadline |
|---|---|
| 6 April – 5 July | 7 August |
| 6 April – 5 October | 7 November |
| 6 April – 5 January | 7 February |
| 6 April – 5 April | 7 May (in the following tax year) |

**Calendar-quarter election** (per SI 2026/336 reg 13; GOV.UK): periods run 1 April–30 June, –30 September, –31 December, –31 March, with the **same deadlines** (7 Aug / 7 Nov / 7 Feb / 7 May).

**For tax year 2026–27 the first deadline is 7 August 2026** (period 6 April–5 July 2026, or 1 April–30 June 2026 under calendar election). SI 2026/336 reg 12 states the first period ends "5th July" with deadline "7th August". CONFIRMED.

**Cumulative**: "Each time you send a quarterly update it will cover from the start of the tax year to the end of the update period, not just the previous three months. This means you can correct your records without having to resend previous updates." (Cumulative reporting was introduced by the Income Tax (Digital Requirements) (Amendment) Regulations 2024, SI 2024/167, which replaced "quarterly period" with "quarterly update period": https://www.legislation.gov.uk/uksi/2024/167/contents/made)

**Content**: "totals for each income and expense category you've used for your self-employment and property income" — summary totals per category, **per business source** (separate updates per self-employment business and for the property business); no transaction-level data is transmitted; **no accounting or tax adjustments are required** at the quarterly stage. Errors are corrected by resending an update (year-to-date figures) — e.g. resend the fourth update before submitting the return.

### 3b. Year-end: the tax return (EOPS abolished; "final declaration" terminology dropped)
Source: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/submit-your-tax-return

- **EOPS (End of Period Statement) is abolished** — removed by SI 2024/167 (regs 18–19 of the 2021 regulations omitted; https://www.legislation.gov.uk/uksi/2024/167/contents/made). It does not exist in SI 2026/336 and GOV.UK guidance does not mention it.
- **Current GOV.UK terminology is simply "your tax return"** (submitted through MTD software). The earlier "final declaration" label is no longer used on the current guidance page. (Older documents/commentary may still say "final declaration" for the crystallisation step.)
- What it involves: make accounting/tax adjustments to the quarterly-reported self-employment and property figures; **add all other income sources and gains** — employment (PAYE), pensions, state benefits, CIS deductions, capital gains, savings interest, dividends, partnership profit share, Marriage Allowance etc.; "Before you submit your tax return, you must add all income sources and gains and check all information is correct and complete."
- **Deadline: "31 January following the end of the relevant tax year"** (for 2026–27: 31 January 2028). Can be submitted earlier.
- **Must be submitted through MTD-compatible software**: "you will need to use your Making Tax Digital software to complete and submit your tax return." HMRC's standard online filing is not presented as an option for MTD users.
- Payment dates unchanged (normal Self Assessment payment dates; balancing payment 31 January).

### 3c. Sign-up is NOT automatic
Source: https://www.gov.uk/guidance/sign-up-your-business-for-making-tax-digital-for-income-tax
- Taxpayer (or agent) must actively use the online sign-up service; "If you're required to use Making Tax Digital for Income Tax for the 2026 to 2027 tax year, you should sign up now."
- Sign-up needs: NI number/UTR context, business start date, business name/address/nature (sole traders), and confirmation that "you have software that works with Making Tax Digital for Income Tax".

---

## 4. Exemptions and deferrals

Sources: https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax ; https://www.gov.uk/guidance/apply-for-an-exemption-from-making-tax-digital-for-income-tax ; Budget 2025 changes summarised by ICAS: https://www.icas.com/news-insights-events/news/tax/making-tax-digital-for-income-tax-self-assessment-developments-announced-in-budget-2025

### Automatic (no application) — permanent
- Qualifying income at or below the threshold (ultimately "£20,000 or less" once the 2028 step lands).
- No National Insurance number before the start of the tax year.
- Non-resident companies filing SA700.
- Trusts filing SA900 (including charitable trusts and trusts of non-registered pension schemes).
- Personal representatives of deceased persons.
- Lloyd's members (SA103L underwriting pages).
- Recipients of Married Couple's Allowance (born before 6 April 1935) or Blind Person's Allowance.
- People unable to engage due to disability/incapacity where a **power of attorney** or Court of Protection **deputyship** is in place (Budget 2025 made these permanent exemptions).
- Ministers of religion (SA102M) — listed with permanent status on the GOV.UK exemption page (fetched 2026-07-02); note the ICAS Budget-2025 write-up frames some categories as one-year deferrals, so treat the exact permanent-vs-temporary split of this category as worth re-checking on the live page before publishing user-facing copy.

### Automatic — temporary (deferred to April 2027; based on entries in the 2024–25 return)
- Qualifying care relief claims (foster carers, shared lives, kinship, staying-put carers).
- SA107 (income from trusts or estates).
- SA109 (residence/remittance basis).
- Averaging adjustment users (farmers, market gardeners, creators of literary/artistic works).
- Non-UK resident foreign entertainers/sportspeople (per Budget 2025, ICAS source).
These groups join from April 2027 instead of April 2026 (if still over threshold).

### By application
- **Digitally excluded**: must show it is "not reasonable" to use compatible software — age, health/disability, religious beliefs incompatible with electronic use, or no internet access at the location. NOT acceptable: previously filed on paper, unfamiliar with software, few records, cost. Application by the individual, an authorised agent, or friend/family with permission; HMRC aims to respond within 28 calendar days; two outcomes offered: temporary exemption "until at least April 2027" or a digitally-excluded exemption that "may be permanent depending on your circumstances."
- If exempt: continue filing normal Self Assessment; existing SA penalty regime applies.

### Partnerships
- **No date.** GOV.UK eligibility page: partnerships timeline "to be announced". Individual partners' partnership profit shares do NOT count toward qualifying income. (General partnerships were once slated for 2025 under the old plan; that date is dead.)

---

## 5. Penalty regime

Source: https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax (fetched 2026-07-02); volunteers: https://www.gov.uk/guidance/penalties-for-income-tax-self-assessment-volunteers

### Late submission (points-based)
- 1 penalty point per missed deadline; **threshold 4 points → £200 penalty**, and a further £200 for each subsequent miss while at threshold.
- Only one point per deadline even with multiple businesses/updates late.
- Points below threshold expire automatically **24 months** after the missed deadline. At/above threshold, points reset only after (a) 12 months of on-time submissions and (b) submitting everything due in the prior 24 months.
- **First-year easement (legislated at Autumn Budget 2025): "There are no penalties for missing a quarterly update deadline for the 2026 to 2027 tax year."** Points for quarterly updates start with tax years after 2026–27. The tax return deadline (31 Jan) still attracts points.
- **Volunteers** (people who signed up though not mandated): "While you are volunteering you will not get penalties for missing quarterly update deadlines" — but updates must still be submitted before the return.

### Late payment
- 2026–27 tax year: nothing up to 15 days late; **3% of tax owed at day 15**; a further **3% of what is still owed at day 30**; from day 31, **10% per annum accruing daily** (per the volunteers page; main page's day-31+ text for 2026-27 consistent) — with **no penalty at the 15-day point in your first year** (first-year 30-day grace before penalties start).
- 2027–28 onwards: rates rise to **4% at day 15 and 4% at day 30** (increase announced at Budget 2025, effective from April 2027); day-31+ annualised rate reported as 10% p.a. — re-verify the annualised figure on the live page when drafting user-facing copy.
- Late payment **interest** unchanged: accrues daily from day 1 at HMRC's published rate.

---

## 6. Digital record-keeping requirements

Source: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records ; SI 2026/336 reg 15.

- Must keep digital records of **each item of self-employment and property income and expense**: "A digital record is a record of your income or expense that is created and stored using software that works with Making Tax Digital for Income Tax."
- Each record must include: **the amount**, **the date** (income received / expense incurred — per the taxpayer's accounting basis), and **the category**.
- SI 2026/336 reg 15(2): records of "the financial information required to be included in each quarterly update" and "details of the items comprised in the financial information", kept "using functional compatible software".
- **Functional compatible software**: software that creates digital records and submits to HMRC via the API — or a combination of products, including **bridging software** connecting spreadsheets to HMRC.
- **Digital links** required between products in a chain: acceptable = "linked cells in spreadsheets", "XML, CSV importing and exporting", "API transfer", "automated data transfer". (Manual retyping between products is not a digital link.)
- **Relaxations**: retailers may record **daily gross takings** instead of individual sales; businesses with turnover **below £90,000** may use simplified (three-line-style) categorisation, recording each transaction only as income or expense.
- Timing: create records "as close to the date of the transaction as possible", and at latest before the relevant quarterly update is sent / deadline passes.

---

## 7. Implications checklist for TaxSorted

1. Cite **SI 2026/336** as the governing law (not SI 2021/1076 — revoked 1 April 2026).
2. Build for **cumulative** quarterly updates (year-to-date totals per category per business source) — correction = resubmit YTD, no amendment endpoint gymnastics.
3. Support both **standard (5th-based)** and **calendar** quarter elections; deadlines identical (7 Aug / 7 Nov / 7 Feb / 7 May). First live deadline: **7 Aug 2026**.
4. No EOPS. Year-end = adjustments + all other income sources + submission of the full tax return **through software** by 31 January.
5. Onboarding must include the **sign-up step** (not automatic) and a **qualifying income calculator** (gross SE + property income, share of joint property, exclusions).
6. Educate on the 2026–27 **quarterly-penalty holiday** (deadline still exists; no points this year) and the 3%→4% late-payment escalation from April 2027.
7. Exemption checker: automatic categories, April-2027 deferral categories, digitally-excluded application route.

---

## Source register (all fetched 2026-07-02)

| # | Source | URL |
|---|---|---|
| 1 | GOV.UK — Find out if and when you need to use MTD IT | https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax |
| 2 | GOV.UK — Use MTD for Income Tax (collection/landing) | https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax |
| 3 | GOV.UK — Send quarterly updates | https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates |
| 4 | GOV.UK — Create digital records | https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records |
| 5 | GOV.UK — Submit your tax return | https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/submit-your-tax-return |
| 6 | GOV.UK — Work out your qualifying income | https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax |
| 7 | GOV.UK — Find out if you can get an exemption | https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax |
| 8 | GOV.UK — Apply for an exemption | https://www.gov.uk/guidance/apply-for-an-exemption-from-making-tax-digital-for-income-tax |
| 9 | GOV.UK — Penalties for MTD for Income Tax | https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax |
| 10 | GOV.UK — Penalties for ITSA volunteers | https://www.gov.uk/guidance/penalties-for-income-tax-self-assessment-volunteers |
| 11 | GOV.UK — Sign up your business | https://www.gov.uk/guidance/sign-up-your-business-for-making-tax-digital-for-income-tax |
| 12 | legislation.gov.uk — Income Tax (Digital Obligations) Regulations 2026, SI 2026/336 | https://www.legislation.gov.uk/uksi/2026/336/made |
| 13 | legislation.gov.uk — Income Tax (Digital Requirements) (Amendment) Regulations 2024, SI 2024/167 | https://www.legislation.gov.uk/uksi/2024/167/contents/made |
| 14 | GOV.UK — TIIN: reducing threshold £30k→£20k from April 2028 (pub. 24 Mar 2026) | https://www.gov.uk/government/publications/making-tax-digital-for-income-tax-self-assessment-reducing-the-mandation-threshold-from-30000-to-20000-from-april-2028/reduction-of-the-mandation-threshold-from-30000-to-20000-from-april-2028 |
| 15 | GOV.UK — News: One year until MTD IT launches | https://www.gov.uk/government/news/one-year-until-making-tax-digital-for-income-tax-launches |
| 16 | ICAS — MTD ITSA developments announced in Budget 2025 | https://www.icas.com/news-insights-events/news/tax/making-tax-digital-for-income-tax-self-assessment-developments-announced-in-budget-2025 |
