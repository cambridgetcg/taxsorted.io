# TaxSorted — UK Tax Substance for 2026-27 (the content layer)

Research date: 2026-07-02. All facts below were verified by fetching the cited pages live on 2026-07-02. Figures are for tax year 6 April 2026 – 5 April 2027 unless stated.

**Re-verified 2026-07-03** (independent second pass): all headline figures below re-fetched and confirmed — bands/rates, PA taper, dividend rates 10.75/35.75/39.35, Class 2 credited at ≥£7,105 / voluntary £3.65pw, Class 4 6%/2%, 55p mileage, WFH £10/£18/£26, living-at-premises £350/£500/£650, £1,000 allowances, S24 lowest-of-three, Rent-a-Room £7,500/£3,750, FHL abolition 6 Apr 2025, POA mechanics, MTD thresholds 50/30/20k, quarterly deadlines 7 Aug/Nov/Feb/May, £90k consolidated expenses, pension AA £60k with £200k/£260k taper, Marriage Allowance £1,260/£252, Gift Aid 4× rule, 2027-28 property/savings 22/42/47 technical note. Second-pass additions are marked **[+07-03]**.

---

## 1. Income tax bands and rates 2026-27

### England, Wales, Northern Ireland (rUK)

Source (fetched, states "from 6 April 2026 to 5 April 2027"): https://www.gov.uk/income-tax-rates

| Band | Taxable income | Rate |
|---|---|---|
| Personal Allowance | up to £12,570 | 0% |
| Basic rate | £12,571 – £50,270 | 20% |
| Higher rate | £50,271 – £125,140 | 40% |
| Additional rate | over £125,140 | 45% |

- **Personal allowance taper**: "Your personal allowance goes down by £1 for every £2 that your adjusted net income is above £100,000. This means your allowance is zero if your income is £125,140 or above." → Effective ~60% marginal rate in the £100,000–£125,140 corridor (the tool MUST surface this).
- **Freeze extended**: Budget 2025 (Nov 2025) froze the personal allowance at £12,570 and the basic rate limit at £37,700 for **2028-29 through 2030-31** (i.e. frozen thresholds run to April 2031). Source: https://www.gov.uk/government/publications/budget-2025-overview-of-tax-legislation-and-rates-ootlar/budget-2025-overview-of-tax-legislation-and-rates-ootlar

### Dividend rates 2026-27 (UK-wide) — CHANGED from 6 April 2026

Source (fetched, table states "from 6 April 2026 to 5 April 2027"): https://www.gov.uk/tax-on-dividends
- Dividend allowance: **£500**
- Basic/ordinary: **10.75%** (was 8.75%)
- Higher/upper: **35.75%** (was 33.75%)
- Additional: **39.35%** (unchanged)
Confirmed as a Budget 2025 measure (+2ppts on ordinary and upper rates from 6 April 2026): https://www.gov.uk/government/publications/changes-to-tax-rates-for-property-savings-and-dividend-income/change-to-tax-rates-for-property-savings-and-dividend-income-technical-note

### Savings income (needed for a complete liability calc) **[+07-03]**

Source (fetched 2026-07-03): https://www.gov.uk/apply-tax-free-interest-on-savings
- **Personal Savings Allowance**: £1,000 (basic rate) / £500 (higher rate) / **£0** (additional rate).
- **Starting rate for savings**: up to £5,000 of interest at 0%; reduced £1-for-£1 by non-savings income above the PA; gone entirely once other income ≥ **£17,570**.
- Page is not year-stamped for 2026-27 specifically (operative current rules — confidence high on figures, medium on year-stamp). Savings rates rise to 22/42/47 from 2027-28 (see "Looking ahead" below).
- Tool relevance: a sole trader's/landlord's marginal band determines their PSA — the S24 gross-up (§5a) can halve or kill it.

### Scotland (note, not deep-dived)

Source (fetched, 2026-27): https://www.gov.uk/scottish-income-tax

| Band | Taxable income | Rate |
|---|---|---|
| Starter | £12,571 – £16,537 | 19% |
| Basic | £16,538 – £29,526 | 20% |
| Intermediate | £29,527 – £43,662 | 21% |
| Higher | £43,663 – £75,000 | 42% |
| Advanced | £75,001 – £125,140 | 45% |
| Top | over £125,140 | 48% |

- Scottish rates apply to **non-savings, non-dividend income** (so a Scottish sole trader's profits and a Scottish landlord's rents are taxed at Scottish rates). "You'll pay the same tax as the rest of the UK on dividends and savings interest." Personal allowance and its taper are UK-wide.
- Tool implication: residency (S-code) switches the band engine for trading/property income but NOT for Class 4 NIC (UK-wide thresholds) or dividends/savings.

### LOOKING AHEAD (must be built into the engine roadmap): separate property/savings rates from 6 April 2027

Source (fetched): https://www.gov.uk/government/publications/changes-to-tax-rates-for-property-savings-and-dividend-income/change-to-tax-rates-for-property-savings-and-dividend-income-technical-note
- From **2027-28**: property income taxed at **22% / 42% / 47%** (property basic/higher/additional) in England, Wales, NI; savings rates also +2ppts to 22/42/47 UK-wide... (savings rates apply UK-wide; property rates E/W/NI, with devolution engagement for Scotland/Wales).
- The Section 24 finance-cost credit moves with it: "relief for residential finance costs will be calculated at the property basic rate (22%)" from 2027-28.
- Legislation: Finance Bill 2025-26 (announced, in progress — treat as "announced" not yet enacted). Also in OOTLAR: https://www.gov.uk/government/publications/budget-2025-overview-of-tax-legislation-and-rates-ootlar/budget-2025-overview-of-tax-legislation-and-rates-ootlar
- **For 2026-27 (this product year) property income is still taxed at normal rates 20/40/45.** But teach the 2027 change now — it changes landlord planning (e.g. timing of income/expenses).

---

## 2. National Insurance for the self-employed 2026-27

Source (fetched, states tax year 2026 to 2027): https://www.gov.uk/self-employed-national-insurance-rates

- **Class 2 — no longer compulsorily paid.** For profits at/above the Small Profits Threshold, "Class 2 contributions are treated as having been paid to protect your National Insurance record" — i.e. State Pension/benefit credit for free.
  - **Small Profits Threshold 2026-27: £7,105.** Profits below it → nothing due; **voluntary Class 2 at £3.65/week** available to protect the NI record.
  - (Budget 2025 confirmed Class 2/Class 3 uprated by Sept 2025 CPI 3.8% for 2026-27 — consistent with £3.65/wk. Source: OOTLAR, above.)
- **Class 4** (paid via Self Assessment / MTD final declaration):
  - **6%** on profits between **£12,570 and £50,270** (Lower Profits Limit → Upper Profits Limit)
  - **2%** on profits above **£50,270**
- Teaching points:
  - Combined marginal rate for a basic-rate sole trader: 20% IT + 6% Class 4 = 26%; higher-rate: 40% + 2% = 42%.
  - The £7,105–£12,570 window: credited Class 2 for free (no Class 4 due) — important for low-profit years and State Pension qualifying years.
  - Below £7,105: consider voluntary Class 2 (£189.80/yr at £3.65/wk) — one of the cheapest ways to buy a qualifying year.
  - Landlords do NOT pay Class 4 on rental profits (property income is not self-employment earnings) — common confusion to teach.

---

## 3. Cash basis and simplified expenses

### Cash basis for sole traders — default from 2024-25

- Gov.uk guide (fetched): https://www.gov.uk/simpler-income-tax-cash-basis — cash basis is "the standard way to record your income and expenses if you're a sole trader or partnership without corporate partners". Opt-out: "When you send your Self Assessment tax return you'll need to say that you've used traditional accounting."
- Policy paper (fetched): https://www.gov.uk/government/publications/expanding-the-income-tax-cash-basis-for-self-employed-individuals-and-partnerships — the measure "sets the cash basis as the default method of calculating trading profits for eligible businesses, with an opt-out for accruals" and "removes the entry and exit thresholds based on turnover, and removes restrictions specific to the cash basis on interest deductions and loss relief." (Published 22 Nov 2023 = Autumn Statement 2023 measure, effective 2024-25.)
- Who cannot use it (fetched): https://www.gov.uk/simpler-income-tax-cash-basis/who-can-use-cash-basis — limited companies, LLPs, partnerships with corporate partners, Lloyd's underwriters, farming with herd-basis elections, farming/creative businesses with profit-averaging claims, businesses that claimed BPRA in last 7 years, mineral extraction, ever-claimed R&D allowance. **No turnover limit remains** for trading cash basis.
- Confidence note: the exact "from 2024-25" start year is stated in the policy paper's context (published Nov 2023, Finance Act 2024); the live guide doesn't restate the year. Confidence: high (both pages consistent).

### Cash basis for landlords — default since 2017-18, £150,000 threshold

Source (fetched): https://www.gov.uk/hmrc-internal-manuals/property-income-manual/pim1092
- "Since the 2017-18 tax year, it has been the default basis for most property businesses" run by individuals/partnerships.
- Cash basis does NOT apply where cash-basis receipts for the year **exceed £150,000** (pro-rated for part years), where the business is run by a company/LLP/trustees/corporate firm, in certain BPRA balancing-event years, and spouses/civil partners jointly taxed 50/50 must use the same basis.
- Landlord can **elect out to GAAP (accruals)**; "The election must be made within one year of the filing date for that tax year."
- KEY ASYMMETRY the tool must encode: trading cash basis = unlimited turnover (2024-25 rules); property cash basis = £150,000 receipts cap, and it's year-by-year with an election out.

### Interaction with MTD categories

- MTD digital records use the same income/expense categories either way; the accounting-basis choice changes WHEN items are recognised, not the category list. The final declaration is where basis adjustments land. (See §8 for categories.)

### Simplified expenses (flat rates) — MAJOR 2026 CHANGE

- Vehicles (fetched, 2026-27 figures): https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles
  - Cars and goods vehicles: **55p/mile first 10,000 business miles; 25p/mile thereafter**
  - Motorcycles: **24p/mile**
  - Cannot use the flat rate for a vehicle you've already claimed capital allowances on (or claimed actual costs for); once you use the flat rate for a vehicle you must stick with it for that vehicle.
- The 45p→55p increase (fetched, published 17 June 2026, **retrospective to 6 April 2026**, applies to employee AMAPs AND self-employed simplified mileage): https://www.gov.uk/government/publications/increase-to-approved-mileage-allowance-payments-amaps-and-self-employed-simplified-mileage-rates/increasing-mileage-rates — "The per mile rates for cars and vans (cars and goods vehicles for simplified mileage rates) for the first 10,000 miles will be increased from 45 pence per mile to 55 pence per mile."
  - Tool implication: any mileage computation for 2026-27 must use 55p; users who logged Q1 at 45p need a recalc. Great teaching moment / marketing hook ("your software still says 45p?").
- Working from home (fetched): https://www.gov.uk/simpler-income-tax-simplified-expenses/working-from-home — minimum 25 hrs/month; **£10/month (25-50 hrs), £18 (51-100), £26 (101+)**; flat rate excludes telephone/internet (claim business proportion of actual cost on top). Claim per-month at the correct band, not an average.
- Living at business premises (fetched): https://www.gov.uk/simpler-income-tax-simplified-expenses/living-at-your-business-premises — deduct personal-use flat rate from actual premises costs: **£350/month (1 person), £500 (2), £650 (3+)**.
- Simplified expenses are unavailable to limited companies and partnerships with a corporate partner (overview page, fetched): https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles-

---

## 4. Trading allowance and property allowance (£1,000 each) — and the traps

Source (fetched): https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income

- Both are **£1,000 per tax year**; you can have both (one for trading income, one for property income).
- **Full relief**: gross income ≤ £1,000 → no need to report (records still required).
- **Partial relief**: gross income > £1,000 → deduct £1,000 **instead of** actual expenses/capital allowances. Deduction can't exceed income (→ can never create a loss).
- **Trading allowance exclusions** — cannot claim on income from: a company you (or a connected person) own/control; a partnership you or a connected person is a partner in; your employer or your spouse/civil partner's employer.
- **Property allowance exclusions** — cannot claim if you: claim tax relief for finance costs (mortgage interest) on residential property; deduct expenses from Rent-a-Room income instead of using that scheme; and it "cannot be used on income from letting a room in your own home under the Rent a Room Scheme."

### When claiming is a trap (teach these)

1. **Expenses > £1,000** → claiming the allowance instead of expenses overpays tax ("If your expenses are more than your income it may be beneficial to claim expenses instead of the allowances").
2. **Loss trap**: allowance can't create/increase a loss. Real expenses exceeding income create a loss that can carry forward (or, for trading, sideways in some cases) — claiming the allowance throws that away.
3. **Landlord finance-cost trap**: claiming the property allowance forfeits the Section 24 20% credit entirely (it's an exclusion — you can't have both).
4. **Rent-a-Room overlap**: property allowance can't be stacked on rent-a-room income.
5. **Connected-party trap**: side income from your own company or your employer doesn't qualify for the trading allowance at all — a common wrong claim.
6. **Full relief ≠ invisible for MTD**: MTD "qualifying income" is judged on GROSS income before the allowance, so a £900 side hustle plus £49,500 rents still crosses £50k. (Qualifying income basis: https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax)

### Announced (NOT in force 2026-27): £3,000 reporting threshold

Source (fetched, published 11 March 2025): https://www.gov.uk/government/news/boost-for-side-hustlers-as-300000-people-to-be-taken-out-of-tax-returns-government-announces
- "The ITSA trading income reporting threshold will increase from £1,000 to £3,000 gross within this parliament", with "a new simple online service" to pay tax owed. ~300,000 taken out of SA returns.
- The **£1,000 tax-free trading allowance itself is unchanged** — this is reporting-only. No commencement date set as of 2026-07-02. Treat as roadmap/education content, confidence on timing: low.

---

## 5. Landlord specifics

### 5a. Finance-cost restriction ("Section 24") — 20% basic-rate credit

Source (fetched): https://www.gov.uk/guidance/changes-to-tax-relief-for-residential-landlords-how-its-worked-out-including-case-studies
- Since 6 April 2020, individual landlords get NO deduction for residential finance costs (mortgage interest, loan interest and similar); instead a **tax reduction = 20% × the LOWEST of**:
  1. finance costs not deducted (incl. any brought forward),
  2. property business profits,
  3. adjusted total income (income exceeding personal allowance, excluding savings & dividend income).
- "The tax reduction can't be used to create a tax refund."
- Excess finance costs (when capped by profits or ATI) **carry forward** to compute the next year's reduction.
- Computation subtlety the tool MUST get right: because finance costs are no longer deducted, taxable property income is higher → can push people over £50,270 (higher rate, HICBC territory), over £100k (PA taper), over £125,140 — even when their "real" economics haven't changed. Teach this explicitly.
- From 6 April 2027 the credit is recalculated at the 22% property basic rate (see §1 technical note).

### 5b. Replacement of Domestic Items relief

Source (fetched): https://www.gov.uk/guidance/income-tax-when-you-rent-out-a-property-working-out-your-rental-income
- Applies to residential lets (not available where Rent-a-Room used; from April 2025 it's also what ex-FHL landlords use). Conditions: an old domestic item "provided for use in the dwelling-house is replaced"; old item "must no longer be available for use by the lessee".
- Qualifying: movable furniture, furnishings, household appliances, kitchenware (beds, curtains, fridges, crockery...).
- **Like-for-like cap**: relief limited to the cost of an equivalent replacement — "if a new sofa costs £400 but a sofa bed costs £550, you can only claim the £400" (improvement element disallowed); modern functional equivalents (e.g. energy-efficient fridge) get full relief. Add disposal costs of the old item, deduct any sale proceeds.
- NOT for the initial purchase of items (only replacements) — teach this trap.

### 5c. Jointly-held property splits

- Married couples / civil partners living together: "usually taxed in equal shares" (50/50) regardless of actual ownership. Source: https://www.gov.uk/guidance/income-tax-when-you-rent-out-a-property-working-out-your-rental-income
- To be taxed on actual unequal beneficial ownership: **Form 17** declaration + evidence ("a declaration or deed") that beneficial interests are unequal. Source (fetched): https://www.gov.uk/government/publications/income-tax-declaration-of-beneficial-interests-in-joint-property-and-income-17
- **60-day rule** (fetched, HMRC manual TSEM9860): "Income ... is split in the new way from the date of the Form 17 declaration (which is the date the Form 17 declaration was signed by the last spouse or civil partner to sign) provided the notice of declaration reaches HMRC within 60 days of the date it was signed." Late = invalid, no effect. Source: https://www.gov.uk/hmrc-internal-manuals/trusts-settlements-and-estates-manual/tsem9860
- Unmarried joint owners: split "usually based on the share of the property you own, unless you agree a different allocation" — no Form 17 needed (flexibility unmarried couples have that spouses don't; classic planning point).
- MTD wrinkle: joint owners each report their share; PIM1092 notes jointly-taxed spouses sharing 50/50 must use the same accounting basis.

### 5d. Rent-a-Room

Source (fetched): https://www.gov.uk/rent-room-in-your-home/the-rent-a-room-scheme
- **£7,500/year tax-free** from letting furnished accommodation in your own home; **halved to £3,750** if income is shared with someone else.
- Automatic if below threshold; above it you must file and choose: (a) opt into the scheme — taxed on gross receipts minus £7,500, no expenses; or (b) normal property rules (income minus actual expenses).
- Resident landlords (owner or not) and B&B/guest houses qualify; NOT for homes converted into separate flats.
- Can't combine with the property allowance on the same income (§4).

### 5e. FHL regime abolished — from April 2025

Source (fetched): https://www.gov.uk/government/publications/furnished-holiday-lettings-tax-regime-abolition/abolition-of-the-furnished-holiday-lettings-tax-regime
- Effective **6 April 2025** (income tax & CGT), **1 April 2025** (corporation tax). So 2026-27 is the second year with NO FHL regime — the tool should have no FHL concept except transition education.
- Four advantages removed: (1) finance costs now restricted to the basic-rate credit like other residential lets; (2) capital allowances for new expenditure gone → Replacement of Domestic Items relief instead; (3) CGT business reliefs (rollover, business asset disposal relief, gift relief) gone; (4) FHL income no longer "relevant UK earnings" for pension relief.
- Transition: existing capital-allowance pools continue with writing-down allowances; unused FHL losses fold into the person's wider UK (or overseas) property business and offset future property profits; anti-forestalling from 6 March 2024 on contrived pre-abolition contracts.
- Post-abolition: former FHLs are just part of the UK/overseas property business.

---

## 6. Payments on account (POA)

Source (fetched): https://www.gov.uk/understand-self-assessment-bill/payments-on-account
- Two POAs per year, "due by midnight on **31 January and 31 July**", each "usually half of the tax you owed the previous year".
- POAs include Class 4 NIC: "'Payments on account' are payments towards your next tax bill (including Class 4 National Insurance if you're self-employed)."
- NOT required if: "the amount of tax you owed last year was less than £1,000" OR "last year you paid more than 80% of the tax you owed ... outside of Self Assessment" (e.g. via PAYE).
- **Balancing payment** due "by midnight on 31 January the following year" = total liability minus POAs made. Capital gains and student loan amounts are settled in the balancing payment (they are not part of the POA calculation itself).
- Reduce POAs via online account ('Reduce payments on account') or form SA303 — but "If you reduce your payments on account and your tax bill is higher than expected, you'll be charged interest on the difference."
- MTD does NOT change payment dates: "Making Tax Digital for Income Tax will not change the way you pay tax or the dates that payments are due." Final declaration/tax return deadline stays **31 January** after year end. Source (fetched): https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/submit-your-tax-return
- Teach the first-year double-hit: year 1 balancing payment + 50% POA on the same 31 January (150% cash-flow shock) — the single most useful thing a free tool can forecast from quarterly data.

---

## 7. The honest optimisation list (and the warnings)

### Legitimate reliefs (all verified)

1. **Pension contributions** — https://www.gov.uk/tax-on-your-private-pension/annual-allowance and https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief (both fetched)
   - Annual allowance **£60,000**; taper when threshold income > £200,000 AND adjusted income > £260,000; carry-forward of unused allowance from previous 3 years.
   - Relief limited to 100% of annual earnings; non-earners: £2,880 net (£3,600 gross). NB: since April 2025 **rental profits are not relevant earnings** (and FHL income no longer counts — §5e); a landlord-only client is effectively capped at £3,600 gross. Trading profits DO count.
   - Relief at source: provider adds basic 20% automatically; higher/additional-rate taxpayers claim the extra via Self Assessment ("20% up to the amount of any income you have paid 40% tax on"; Scottish rates differ).
   - Killer use-case: contributions restore the personal allowance in the £100k–£125,140 taper zone (60%+ effective relief) and can pull a Section 24 landlord's income back under band thresholds.
2. **Allowable expenses people miss** — https://www.gov.uk/expenses-if-youre-self-employed (fetched): office costs, travel (fuel, parking, fares), uniforms, staff/subcontractors, stock/raw materials, insurance & bank charges, premises heating/lighting/business rates, marketing & website costs, and "training courses related to your business, for example refresher courses". Landlord equivalents (fetched, working-out-rental-income page): general maintenance/repairs, landlord insurance, letting agent fees, legal fees for lets ≤ 1 year, accountant's fees, utilities/council tax when paid by landlord, vehicle running costs (business proportion). Non-deductible: capital improvements, the capital part of mortgage payments, personal expenses, ordinary clothing.
   - Plus (self-employed): WFH flat rates, mileage at the NEW 55p, pre-trading expenses, bad debts (accruals), the business proportion of phone/internet.
3. **Marriage Allowance** — https://www.gov.uk/marriage-allowance (fetched): transfer **£1,260** of personal allowance to a spouse/civil partner; saves the recipient "up to £252"; transferor must normally have income below £12,570, recipient a basic-rate taxpayer (rUK £12,571–£50,270; Scotland £12,571–£43,662); backdate up to 4 years.
4. **Gift Aid** — https://www.gov.uk/donating-to-charity/gift-aid (fetched): charity claims 25p per £1; higher-rate donors claim back the difference via SA (£100 gift → £125 gross → £25 back at 40%); donations must be ≤ 4× tax paid that year (income + CGT); can also restore personal allowance in the taper zone (basic-rate band extension).
5. Structural, free wins the tool should surface: choose expenses vs £1,000 allowances correctly (§4); Form 17 / joint-ownership splits (§5c); Rent-a-Room opt-in/out comparison (§5d); voluntary Class 2 at £3.65/wk for low-profit years (§2); reduce POAs honestly when profits genuinely fall (§6); accounting-basis choice cash vs accruals where losses/financing make accruals better (§3).
6. **High Income Child Benefit Charge planning** **[+07-03]** — https://www.gov.uk/child-benefit-tax-charge (fetched 2026-07-03): charge starts at adjusted net income **over £60,000**, full clawback at **£80,000** ("1% of your Child Benefit for every £200 you earn over the threshold"), 2024-25 onwards figures. Adjusted net income includes savings/dividends and rental profit gross of finance costs — so S24 landlords hit it on paper income; pension contributions and Gift Aid reduce it. A quiet, high-value alert for the tool.

### Warn against (honest-education layer)

- **HMRC Spotlights** (fetched): https://www.gov.uk/government/collections/tax-avoidance-schemes-currently-in-the-spotlight — if you use an avoidance scheme HMRC will open an enquiry and pursue the tax + penalties. Directly relevant:
  - **Spotlight 63** "Property business arrangements involving hybrid partnerships" and **Spotlight 63a** (indemnities variant) — the heavily-marketed "put your rentals in a hybrid LLP to beat Section 24" scheme. HMRC's position: it doesn't work.
  - **Spotlight 66** — LLP arrangements disguising employment income; **Spotlight 69** — LLP liquidation to avoid CGT.
- Generic red flags to teach: "HMRC-approved" claims (HMRC never approves schemes), fees contingent on tax saved, anything that promises Section 24 disappears without changing real ownership economics, incorporation pitched without CGT/SDLT analysis.
- **Disguised remuneration signs** **[+07-03]** (https://www.gov.uk/government/publications/tax-avoidance-facts/spot-the-signs-of-tax-avoidance and https://dontgetcaughtout.campaign.gov.uk/tax-avoidance/): pay split into a taxable minimum-wage element plus a "non-taxable" loan/grant/advance (often via an umbrella company) — "all money paid to you in return for your services should be subject to PAYE income tax and National Insurance". Named schemes/promoters list: https://www.gov.uk/government/publications/named-tax-avoidance-schemes-promoters-enablers-and-suppliers/current-list-of-named-tax-avoidance-schemes-promoters-enablers-and-suppliers. HMRC exit help: CAGetHelpOutOfTaxAvoidance@hmrc.gov.uk.

---

## 8. MTD for Income Tax: quarterly updates and the category lists

### Mandation context

Source (fetched): https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax
- Qualifying income (gross self-employment + property turnover) **> £50,000** in 2024-25 → mandated **6 April 2026**; **> £30,000** in 2025-26 → **6 April 2027**; **> £20,000** in 2026-27 → **6 April 2028**. Digitally-excluded exemption exists; exempt people still file SA returns.

### Quarterly update mechanics

Source (fetched): https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates
- Standard (tax-year) quarters and deadlines:
  | Period (cumulative from 6 April) | Deadline |
  |---|---|
  | 6 Apr – 5 Jul | 7 August |
  | 6 Apr – 5 Oct | 7 November |
  | 6 Apr – 5 Jan | 7 February |
  | 6 Apr – 5 Apr | 7 May (following) |
- Optional **calendar-quarter election**: periods 1 Apr–30 Jun / –30 Sep / –31 Dec / –31 Mar, same deadlines.
- Updates are **cumulative**: "Each quarterly update covers from the start of the tax year to the end of the update period... you can correct your records without having to resend previous updates."
- Content = "totals for each income and expense category"; "HMRC will not receive details of individual digital records, such as a receipt or invoice."
- Developer view (fetched): https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-during-tax-year.html — submission via "Create and Amend a Self-Employment Cumulative Period Summary", "Create and Amend a UK Property Cumulative Period Summary", "Create and Amend a Foreign Property Cumulative Period Summary"; deadline = "one month after the obligation period end date"; more-frequent submissions allowed (obligation met when an update's end date ≥ obligation period end).

### Digital record categories

Source (fetched): https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/keep-digital-records
- "Making Tax Digital for Income Tax uses the same categories of income and expenses as Self Assessment."
- **Retail sales election**: retailers may record daily gross takings instead of individual sales.
- **£90,000 simplification**: turnover below £90,000 → "simpler categorisation" (record income vs expense only / consolidated expenses) — confirmed on the developer guide too ("Customers with turnover under £90,000 may use consolidated expenses").
- **Exception that always applies**: residential landlords "must" identify restricted finance costs separately even under simplified categorisation.

### The official category lists — verbatim from HMRC's quarterly update direction **[+07-03]**

Source (fetched 2026-07-03): https://www.gov.uk/government/publications/update-notice-for-making-tax-digital-for-income-tax/making-tax-digital-for-income-tax-update-notice
(the legal "quarterly update direction" — sets out the information a relevant person must send quarterly; publication landing page: https://www.gov.uk/government/publications/update-notice-for-making-tax-digital-for-income-tax)

**Self-employment — income (2):** Turnover · Other business income

**Self-employment — expenses (13):**
1. Cost of goods bought for resale or goods used
2. Construction industry — payments to subcontractors
3. Wages, salaries and other staff costs
4. Car, van and travel expenses
5. Rent, rates, power and insurance costs
6. Repairs and maintenance of property and equipment
7. Phone, fax, stationery and other office costs
8. Advertising
9. Business entertainment costs
10. Interest on bank and other loans
11. Bank, credit card and other financial charges
12. Accountancy, legal and other professional fees
13. Other business expenses

**UK property — income (4):** Total rent · Other income from property · Premiums for the grant of a lease · Reverse premiums and inducements

**UK property — expenses (9):**
1. Rent, rates, insurance and ground rents
2. Property repairs and maintenance
3. Non-residential property finance costs
4. Residential property finance costs
5. Residential finance costs brought forward
6. Legal, management and other professional fees
7. Costs of services provided, including wages
8. Travel expenses
9. Other allowable property expenses

Notes: no FHL categories exist for 2026-27 (§5e); the three-way split of non-residential / residential / brought-forward finance costs is the plumbing for the §5a 20% credit and survives even consolidated reporting. These plain-English labels are the user-facing layer; the API field names below are the wire format.

**Digital-record easements** **[+07-03]** (fetched 2026-07-03: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records):
- Each digital record = **amount, date, category** per transaction.
- Retail sales election: "a digital record of your daily gross takings, instead of individual sales".
- Under the £90k threshold a sole trader "only need[s] to record whether a transaction is income or an expense"; a residential landlord must additionally "record whether the expense is for a restricted finance cost".
- **Jointly-let property**: may keep "a single digital record for each category of property [income] (covering the income you receive in an update period)" and "a single digital record for each category of property expense you incur in a tax year".

### The actual category lists (from HMRC's own API↔SA-box mapping)

Source (fetched): https://raw.githubusercontent.com/hmrc/income-tax-mtd-changelog/main/mapping/csv/sa103f_mapping_v3.csv (linked from the Self-Employment Business API docs, https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api/ — v5.0, updated 29 June 2026)

**Self-employment (maps to SA103F boxes):**
- Income: `turnover` (box 15); `other` income (16); `taxTakenOffTradingIncome` (82)
- Expenses (each with a matching `...Disallowable` field, boxes 32-45): `costOfGoods` (17), `paymentsToSubcontractors` (18), `wagesAndStaffCosts` (19), `carVanTravelExpenses` (20), `premisesRunningCosts` (21), `maintenanceCosts` (22), `adminCosts` (23), `advertisingCosts` + `businessEntertainmentCosts` (24), `interestOnBankOtherLoans` (25), `financeCharges` (26), `irrecoverableDebts` (27), `professionalFees` (28), `depreciation` (29), `otherExpenses` (30), or `consolidatedExpenses` (31) where turnover < £90k.

Source (fetched): https://raw.githubusercontent.com/hmrc/income-tax-mtd-changelog/main/mapping/csv/sa105_mapping_v1.csv (Property Business API; note this mapping file is stated for tax year 2025/26 and uses `ukNonFhlProperty` naming — the live Property Business API is **v6.0 beta, updated 30 June 2026** (https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/property-business-api/), which post-FHL-abolition uses unified UK-property cumulative period summaries; re-verify exact v6 field names against the v6 OAS before coding)

**UK property (maps to SA105 boxes):**
- Income: `periodAmount` (rents) + `otherIncome` + rent-a-room `rentsReceived` (box 20), `taxDeducted` (21), `premiumsOfLeaseGrant` (22), `reversePremiums` (23)
- Expenses: `premisesRunningCosts` — rent/rates/insurance/ground rent (24), `repairsAndMaintenance` (25), `financialCosts` — non-residential loan interest & finance costs (26), `professionalFees` — legal/management (27), `costOfServices` incl. wages (28), `other` + `travelCosts` (29), or `consolidatedExpenses` (29); **`residentialFinancialCost`** (44 — the Section 24 restricted amount, always separate), `residentialFinancialCostsCarriedForward` (45), rent-a-room `amountClaimed` (37).

Tool design note: build the ledger on these API field names; present human labels on top ("Car, van and travel expenses", "Repairs and maintenance"...). The disallowable-split matters at year end (final declaration), not in quarterly updates.

### Year end

Source (fetched): https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/submit-your-tax-return
- After Q4, the **tax return (final declaration) through software by 31 January** following year end — add all other income sources/gains, allowances, reliefs, accounting adjustments, then declare. Payment dates unchanged (§6).

---

## Cross-cutting computation checklist for the engine (2026-27)

1. Trading profit (cash basis default; simplified-expense flat rates incl. 55p mileage) → Class 4 (6%/2%) + income tax at rUK or Scottish bands.
2. Property profit (cash basis if receipts ≤ £150k): exclude residential finance costs from expenses; after computing tax, apply 20% credit on lowest-of-three with carry-forward.
3. Allowance choice optimisers: £1,000 allowances vs actual expenses; Rent-a-Room in/out; Form 17 splits.
4. PA taper £100k–£125,140 (adjusted net income — reduced by gross Gift Aid & gross pension RAS contributions).
5. Dividend rates 10.75/35.75/39.35 with £500 allowance; savings rates & PSA unchanged in 2026-27.
6. Class 2: credited ≥ £7,105; voluntary £3.65/wk below.
7. POA forecaster: <£1,000 / 80% tests, 31 Jan + 31 Jul, first-year 150% shock, SA303 interest warning.
8. Marriage Allowance eligibility check (£1,260 / £252).
9. 2027-28 preview module: property 22/42/47 + credit at 22%, savings +2ppts (announced, Finance Bill 2025-26).

## Verification gaps / low-confidence items

- £3,000 ITSA trading reporting threshold: announced 11 Mar 2025, "within this parliament", no commencement date as of 2026-07-02 (LOW confidence on timing).
- Property Business API v6.0 exact field names post-FHL rename: mapping CSV fetched is the 2025/26 v1 (`ukNonFhlProperty`); v6 OAS not fetched — re-verify before implementation (MEDIUM).
- Class 2 "treated as paid" band mechanics (SPT→LPL vs ≥SPT wording): gov.uk rates page summary fetched; statutory detail (NICs Act 2024) not separately fetched (MEDIUM on fine mechanics, HIGH on headline position).
- Marriage Allowance page cites backdating "to 6 April 2022" — that is the 4-year window as seen from the 2025-26/2026-27 boundary; compute the window dynamically rather than hardcoding (MEDIUM on the specific year quoted).
- **[+07-03]** Deadline phrasing discrepancy: the Developer Hub service guide says a quarterly obligation deadline is "one month after the obligation period end date" (≈5th), while the gov.uk consumer guidance states 7 August / 7 November / 7 February / 7 May. Build to the gov.uk **7th-of-month** deadlines (they are the operative published dates); treat the dev-hub phrasing as loose/stale. Confirm against the obligations returned live by the Obligations API rather than hardcoding.
- **[+07-03]** Living-at-business-premises flat rates (£350/£500/£650 per month for 1/2/3+ people, deducted from actual premises costs as personal use) re-verified 2026-07-03: https://www.gov.uk/simpler-income-tax-simplified-expenses/living-at-your-business-premises (HIGH).
