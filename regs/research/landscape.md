# MTD IT software market — July 2026 landscape & the free/commons gap

Research date: 2026-07-03. Method: direct fetch/parse of HMRC's live software-finder service (tax.service.gov.uk), gov.uk guidance, vendor pricing pages, professional-body publications, plus corroborating press/search. Every claim carries the URL it came from. Where a page was blocked and I relied on search-result snippets, confidence is explicitly downgraded.

---

## 0. The mandate as it stands (verified primary facts)

- **Start**: MTD for Income Tax is mandatory from **6 April 2026** for sole traders and landlords whose **qualifying income (gross, before expenses) exceeded £50,000 in the 2024–25 tax year**. Threshold drops to **£30,000 from 6 April 2027** (based on 2025–26) and **£20,000 from 6 April 2028** (based on 2026–27). Exemptions exist (e.g. digital exclusion).
  Source (fetched, last updated 26 Mar 2026): https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax
- **Scale**: ~780,000 sole traders/landlords in wave 1; a further ~970,000 join at the £30k threshold in April 2027. (Corroborated across FSB/GoCardless summaries; not re-verified on gov.uk — medium confidence.)
  Source: https://www.fsb.org.uk/resources/article/making-tax-digital-2026-deadlines-rules-and-more-MCQVRXUNIJC5EQRAZBQ7DFJNGYMA
- **Cycle**: 4 quarterly updates + a year-end tax return, all via software. **First quarterly update (6 Apr – 5 Jul 2026) is due 7 August 2026**; then 7 Nov 2026, 7 Feb 2027, 7 May 2027; the 2026–27 tax return by 31 Jan 2028. (Deadlines listed in MoneySavingExpert guide, updated 5 May 2026 — fetched.)
  Source: https://www.moneysavingexpert.com/family/making-tax-digital/
- **Penalties (mandated users)**: points-based; **threshold 4 points → £200 penalty**, then £200 per further miss. Critically: *"For each quarterly update (for tax years after 2026 to 2027) or tax return deadline you miss, you'll get a penalty point"* — i.e. **late quarterly updates in the first year (2026–27) do not earn points**; the tax return deadline does. Page last updated 30 Mar 2026.
  Source (fetched): https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax
  (Volunteers' regime: threshold 2 points on tax returns only, no quarterly-update penalties — https://www.gov.uk/guidance/penalties-for-income-tax-self-assessment-volunteers)
- **No HMRC filing route**: Spring Statement 26 March 2025 — HMRC confirmed it **will not provide an online filing service** for anyone inside MTD IT; the year-end return must also go through third-party software ("full software journey"). CIOT/LITRG/ATT had objected in writing to the minister (costs, compliance risk, software availability, unrepresented taxpayers).
  Source (fetched): https://www.tax.org.uk/hmrc-will-not-provide-online-tax-return-filing-service-making-tax-digital-income-tax
- LITRG press release (21 Jul 2025), footnote 3, is blunt: *"HMRC are not providing software for Making Tax Digital, it will be necessary to use commercial software, both for keeping digital records and for filing a self assessment tax return."*
  Source (fetched): https://www.tax.org.uk/litrg-time-for-taxpayers-to-get-ready-for-making-tax-digital-for-income-tax

> ⚠️ **Debunk**: several SEO/aggregator sites (mtd.digital, rentalbux.com) claim "HMRC's own free MTD tool" exists. This is **false** — contradicted by LITRG, CIOT, ICAEW and the absence of any HMRC product in HMRC's own finder (parsed below). Treat those aggregator lists as unreliable (they also carry stale product claims).

---

## 1. HMRC's official software finder — what's actually listed (parsed 3 July 2026)

The old gov.uk software table was **removed 31 July 2025** and replaced by an interactive finder. Guidance page (last updated 8 May 2026, when two suppliers were removed from "in development"): https://www.gov.uk/guidance/find-software-thats-compatible-with-making-tax-digital-for-income-tax
Landing page: https://www.gov.uk/guidance/find-software-that-works-with-making-tax-digital-for-income-tax
Live tool: https://www.tax.service.gov.uk/find-making-tax-digital-income-tax-software/

I walked the tool directly (agent path shows the full list) and parsed the results page HTML.

### Headline counts (as of 3 July 2026)
- **78 products listed** ("You have 78 software results").
- **13 marked "Free version"; 65 "Paid version"** (Price field on each card).
- Caveat: the 78 includes **free/paid variants of the same vendor counted separately** (Coconut, Clear Books, Sage, RentalBux, My Tax Digital) and at least one apparent duplicate (Nexus by Landlord Studio appears twice), so distinct vendors ≈ low 70s.
- Submission-type split: **57 products do "Quarterly updates, Tax return"; 21 do quarterly updates only** (i.e. more than a quarter of the market can't complete the year-end return).
- Type split: 56 create digital records, 54 can act as bridging, 32 do both. 48 support foreign property.
- Filters available: user type (agent/individual), **free version**, bridging, VAT, accessibility (visual/hearing/motor/cognitive), Welsh, HMRC Assist.

### The 13 "Free version" products (HMRC's own data, per product card + detail page)

| Product | Type | Submissions | Income sources | Tax-return items "Ready now"? |
|---|---|---|---|---|
| **My Tax Digital (Free)** | records + bridging | Quarterly + Tax return | ST, UK prop, foreign prop | Nearly everything Ready now (only partnership income "in development"). Best free coverage on the list. |
| **Self Assessment Direct** | records + bridging | Quarterly + Tax return | ST, UK prop, foreign prop | Mixed: interest/dividends/CIS/charity/student loan ready; PAYE, pensions, capital gains "in development" |
| **TaxUpdates** | bridging only | Quarterly + Tax return | ST, UK prop, foreign prop | Nearly everything Ready now (partnership in development) |
| **FreeAgent** | records only | Quarterly + Tax return | ST, UK prop | Nearly everything Ready now — but "free" is bank-conditioned (see §2) |
| **Clear Books Free** | records only | Quarterly + Tax return | ST, UK prop | Nearly everything Ready now; has HMRC Assist |
| **Zoho** | records only | Quarterly + Tax return | ST, UK prop | Most common items ready; pensions/CGT/foreign "in development" |
| **!Coconut Free** | records + bridging | Quarterly + Tax return | ST, UK prop | **All 16 tax-return items "In development"** |
| **RentalBux Free** | records + bridging | Quarterly + Tax return | ST, UK prop, foreign prop | Interest/dividends/foreign ready; most else in development |
| **TaxBridge UK (Amelia GB)** | records + bridging | Quarterly + Tax return | ST, UK prop, foreign prop | **All tax-return items "In development"** |
| **Pandle** | records + bridging | Quarterly + Tax return | ST, UK prop | **All tax-return items "In development"** |
| **Acxite** | records + bridging | **Quarterly only** | ST, UK prop, foreign prop | n/a (no tax return) |
| **Sage Sole Trader & Landlord Free** | records only | **Quarterly only** | ST, UK prop | Tax-return items in development; bridging "Not included"; partnership "Not included" |
| **Tax Mouse** | records + bridging | **Quarterly only** | ST, UK prop | Several items "Not included" outright (foreign, CGT, Class 2 NI) |

Sources: results page https://www.tax.service.gov.uk/find-making-tax-digital-income-tax-software/software-results and per-product detail pages, e.g. My Tax Digital `product-details?productId=3255`, Self Assessment Direct `?productId=3174`, Sage Free `?productId=3473`, Coconut Free `?productId=3153`, FreeAgent `?productId=3192`, Clear Books Free `?productId=3138`, Zoho `?productId=3210`, TaxUpdates `?productId=3303`, Pandle `?productId=3402`, RentalBux Free `?productId=3297`, TaxBridge `?productId=3464`, Acxite `?productId=3252`, Tax Mouse `?productId=3384` (all fetched 3 Jul 2026; raw HTML + parsed JSON in scratchpad `taxsorted/products.json`, `taxsorted/free-details.json`).

### What "free" actually means once you leave HMRC's page (the catches)

- **FreeAgent** — free **only while you hold a NatWest / Royal Bank of Scotland / Ulster Bank business current account, or a Mettle account with ≥1 transaction/month**; otherwise £19/mo (sole trader) or £10/mo (landlord), ex VAT. Verified: https://www.freeagent.com/pricing/
- **!Coconut Free** — Coconut's own pricing page offers "!Coconut for free for 2 years" **by applying for a Zempler bank account in-app**; otherwise paid plans £99.99–£159.99/yr. And on HMRC's card, every year-end tax-return item is still "in development". Verified: https://getcoconut.com/pricing
- **Sage Sole Trader & Landlord Free** — genuinely £0 with no bank condition (per Sage marketing and MSE), **but quarterly updates only — it cannot submit the tax return** (HMRC card: Submission type = "Quarterly updates"; bridging "Not included"). Paid Sage Sole Trader ~£7/mo ex VAT after promo (search-corroborated, Sage pages 403'd — medium confidence). Sources: HMRC card `productId=3473`; https://www.moneysavingexpert.com/family/making-tax-digital/ ; search snippets of https://www.sage.com/en-gb/making-tax-digital/sole-trader/
- **Zoho Books Free (UK)** — £0 plan now advertises "Prepare and file SA100 with HMRC… Send quarterly updates… Submit the final tax return". Limits: 1,000 invoices/yr, 1,000 expenses/yr, 50 receipt scans/mo, no add-ons. **The often-quoted £35k turnover cap does not appear anywhere on the current UK pricing page** (footnote now says "Our FREE plan is applicable for all business types") — aggregator claims of a £35k cap look stale. Verified: https://www.zoho.com/uk/books/pricing/
- **My Tax Digital** — genuinely free, no tiers/caps found; run by **Open Answers Limited** (35+ yrs "Open Systems and Open Source services"; ISO 27001, Cyber Essentials Plus, Royal Warrant). Funding model undisclosed. The nearest thing to a public-good product in the market — but the *service* is free, the *code* is not published as open source (no licence/repo found — low confidence there's any). Verified: https://mytaxdigital.co.uk/
- **Self Assessment Direct** — free basic service from **Cirrostratus Exedra Ltd** (the VAT Direct people): "The basic service is free. The basic service is and will be sufficient to enable submissions to be made to HMRC", with chargeable extras (freemium); performance guidance suggests <500 transactions/period. Verified: https://www.vat.direct
- **Bank-embedded free**: **Starling Bank** made its in-app MTD IT tool free **for its business-account customers** (announced 18 Mar 2026) — quarterly submissions native in the app, VAT needs the £7/mo add-on. Verified: https://thepaypers.com/fintech/news/starling-offers-free-making-tax-digital-tool-to-business-customers ; see also https://www.starlingbank.com/features/making-tax-digital/. **SumUp** launched a free MTD tool with Sage for its business-account customers (Mar 2026) — https://fintech.global/2026/03/09/sumup-launches-free-mtd-for-income-tax-tool-with-sage/ (not fetched — medium confidence). Neither Starling nor SumUp appears under its own name in HMRC's finder list parsed above.

**Bottom line on the free tier**: of 13 HMRC-flagged free products, only ~4–5 (My Tax Digital, TaxUpdates, Self Assessment Direct, Clear Books Free, Zoho Free — plus FreeAgent if you bank with NatWest Group) can actually take a simple sole trader/landlord from records → 4 quarterly updates → final tax return **today**, unconditionally free at point of use. Three free products can't file the year-end return at all; three more list *every* year-end item as "in development" with the 2026–27 return due by 31 Jan 2028.

---

## 2. What a mandated sole trader/landlord now pays (main players)

Prices as advertised 3 Jul 2026, ex VAT unless stated:

| Vendor / product | Price | Free tier? | Verified at |
|---|---|---|---|
| **FreeAgent** (sole trader) | £19/mo (£190/yr annual; 50% off first 6 mo) | Only via NatWest/RBS/Ulster/Mettle account | https://www.freeagent.com/pricing/ (fetched) |
| **FreeAgent** (landlord) | £10/mo (£100/yr) | same bank condition | same |
| **Xero Simple** | **£7/mo +VAT** (plan created for MTD IT) | trial only | https://blog.xero.com/product-updates/introducing-xero-simple/ (403 — via search); corroborated by https://www.moneysavingexpert.com/family/making-tax-digital/ (fetched) and https://mtd.digital/mtd-income-tax/xero-simple-mtd-review/ — **medium** |
| **QuickBooks Sole Trader** | **£10/mo +VAT** (replaced Self-Employed) | trial only | https://startups.co.uk/accounting/quickbooks-for-self-employed/ (fetched, 16 Mar 2026) — intuit.com unreachable from here — medium-high |
| **Sage Sole Trader** (paid) | ~£7/mo ex VAT after 6-mo promo | Yes — quarterly-only free tier (§1) | search snippets (Sage 403) — **medium** |
| **untied** | **£129.99/yr** single plan, incl. quarterly + annual MTD | 30-day trial, **no free tier** | https://www.untied.io/mtd-itsa (fetched) |
| **Coconut** | £99.99–£159.99/yr (MTD filing plan £129.99/yr annual) | 2-yr free via Zempler account signup | https://getcoconut.com/pricing (fetched) |
| **ApariPro** (ex-APARI; once had a free tier) | **£144/yr incl VAT** individual plan | 30-day trial, no free tier | https://aparipro.com/pricing/ (fetched) |
| **Zoho Books** paid tiers | £10–£165/mo (annual billing) | Yes (see §1) | https://www.zoho.com/uk/books/pricing/ (fetched) |
| **123 Sheets** (Excel bridging) | ~£30+VAT/yr | no | https://mtd.digital/mtd-income-tax/free-mtd-software/ — **medium, not verified on vendor site** |
| **VitalTax** (Excel bridging) | ~£30+VAT/yr per NINO | no (was free in VAT era) | same source — **medium** |
| **Landlord Studio** | paid plans (~£8/mo Pro per aggregators); HMRC lists paid, quarterly-only | aggregators claim free ≤2 properties — **unverified, low** | HMRC finder card; https://mtd.digital/mtd-income-tax/free-mtd-software/ |

**Real-world annual cost for a mandated sole trader who doesn't want a bank-tied or limited product: roughly £84–£230/yr** (Xero Simple £84+VAT … FreeAgent £228 ex VAT), plus accountant fees if represented. PAC (2023) put HMRC's own estimate of **average transitional cost at £330 per SA taxpayer, with some near £1,000**, and total business compliance cost **>£1.9bn over five years** — and criticised HMRC for excluding £1.5bn/£640m of customer costs from its business cases. Source: https://publications.parliament.uk/pa/cm5803/cmselect/cmpubacc/1333/report.html (blocked direct; figures via committee-news/search corroboration — **medium**); committee page: https://committees.parliament.uk/work/7702/progress-with-making-tax-digital/

---

## 3. Evidence of user pain (as of July 2026)

- **Professional bodies (pre-launch, on record)**:
  - CIOT/ATT member survey (Aug 2023, 500+ members): **70% said April 2026 start unrealistic; 95% not confident in HMRC's ability to oversee it; 87% doubted it would close the tax gap**; members report MTD VAT raised compliance costs with no accuracy gains. Verified: https://www.att.org.uk/technical/news/tax-practitioners-remain-sceptical-governments-flagship-digital-tax-proposals
  - CIOT/LITRG/ATT letter to Exchequer Secretary re withdrawal of HMRC filing service: concerns = "likely additional costs for taxpayers, risks to compliance, availability of software, and the impacts on unrepresented taxpayers". Verified: https://www.tax.org.uk/hmrc-will-not-provide-online-tax-return-filing-service-making-tax-digital-income-tax
  - LITRG position (via consultation responses): "over-reliant on software that HMRC have no control over"; the assumption that free software will deliver MTD's benefits "is wrong". Source: https://www.taxadvisermagazine.com/article/making-tax-digital-ciot-att-and-litrg-consultation-responses (search snippet — medium)
- **Landlords**: survey by rental app **August** (Jan 2026, n=305): **87.5% worried about MTD** (35.7% "very worried"); only 12.8% "very confident" they understand it; ~half wrongly believed profit level/structure/having an accountant changes whether they're in scope. Quote: "For a reform this big, HMRC hasn't prepared landlords properly… guidance clearly hasn't cut through." Verified: https://www.landlordzone.co.uk/news/nearly-9-in-10-landlords-anxious-over-digital-tax-shake-up
- **Consumer press**: MoneySavingExpert (updated 5 May 2026) runs Martin Lewis's warning about "cost, complexity, timing and people's readiness", notes accountants retiring early over MTD, and flags that free products "may have restrictions on how and when they can be used". Verified: https://www.moneysavingexpert.com/family/making-tax-digital/
- **Trade press around the 7 Aug deadline** (AccountingWEB, June–July 2026; site blocks fetch, quotes via search snippets — medium confidence):
  - "MTD ITSA 7 August 2026 Deadline: First Quarterly Update Checklist" — the deadline "will quickly expose whether client data is genuinely maintained on a live ledger basis". https://www.accountingweb.co.uk/community/industry-insights/mtd-itsa-7-august-2026-deadline-first-quarterly-update-checklist-for
  - "When MTD-ready software is anything but" — "MTD software confusion is growing, and taxpayers risk discovering too late that the product they chose cannot do what they thought it could… Some products can submit quarterly updates but cannot complete the final declaration." https://www.accountingweb.co.uk/tax/hmrc-policy/when-mtd-ready-software-is-anything-but
  - On cessation of business mid-MTD: ~20,000 unrepresented taxpayers left to handle it themselves; "No-one (including the unrepresented) will be able to complete the MTD Annual Return 'without using commercial software'". https://www.accountingweb.co.uk/tax/hmrc-policy/mtd-it-and-cessation-of-business
- **Forums**: recent UKBF/Reddit threads not directly fetchable this session; the 2019-era UKBF thread (verified) shows the enduring pattern — users hunting for free/cheap bridging, tolerating "£12/yr" tools, resenting SaaS migration costs. https://www.ukbusinessforums.co.uk/threads/mtd-free-software.400604/

---

## 4. HMRC's official position on free software — promise vs delivery

**The promise** (verified, ICAEW TAXguide 01/25): *"The government has given an undertaking that free MTD income tax software will be made available to taxpayers with the most straightforward affairs. HMRC's working assumption is that these taxpayers are those that are unincorporated, have income under the VAT threshold, and have no employees. HMRC does not expect to develop any software itself but has worked with the software industry to develop free software products."*
Source (fetched): https://www.icaew.com/technical/tax/tax-faculty/taxguides/2025/taxguide-01-25

**The commitment count** (verified, gov.uk, 4 June 2025): Making Tax Digital Programme Accounting Officer's assessment: *"In total 12 developers have committed to providing free products for April 2026 mandation."*
Source: https://www.gov.uk/government/publications/making-tax-digital-programme-accounting-officer-assessment-updated/making-tax-digital-programme-accounting-officers-assessment-summary-updated

**HMRC's definition of an acceptable free product** (verified, Developer Hub end-to-end service guide): free products aimed at simple-affairs businesses should *"have a reasonable level of guidance, have help and support to users, be free for the business to use to comply with their Making Tax Digital obligations for a full annual accounting period"*; *"There is no expectation that a free product will include VAT, Corporation Tax or PAYE functionality."* Software must meet **minimum functionality standards** (digital records; quarterly updates; allowances/adjustments; losses; other income sources; final declaration; amendments) to get production API access and a finder listing.
Source: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/

**What materialised** (my parse, §1): 13 free-flagged products on the finder — numerically the promise was met. Qualitatively:
- gov.uk's own caveat: *"free products are available for those with simple tax affairs but there may be limits on how the product can be used, for example they could have a limited number of transactions."* https://www.gov.uk/guidance/find-software-thats-compatible-with-making-tax-digital-for-income-tax
- 3 of 13 free products cannot file the year-end return at all; 3 more have **every** year-end item still "in development"; two of the biggest brand-name "free" options are bank-account-conditioned (FreeAgent/NatWest, Coconut/Zempler) — customer-acquisition funnels, not commons.
- HMRC does not police price changes: a product can be listed free today and re-price later (see VAT precedent, §5). Nothing in the ToU guarantees permanence beyond "a full annual accounting period".

---

## 5. The MTD VAT precedent (what happened to "free" last time)

- For MTD VAT (mandated April 2019), HMRC likewise **provided no software** and leaned on the market; no government undertaking of free products existed for VAT (the free-software undertaking was specific to income tax / "most straightforward affairs"). ICAEW guidance: https://www.icaew.com/technical/tax/making-tax-digital/mtd-guidance/mtd-and-vat (nav-blocked; low-medium).
- **Free tools appeared as loss-leaders, then died or re-priced**:
  - **Avalara MTD Filer** — flagship free Excel bridging tool (launched Oct 2018 "to help an estimated 800,000 small businesses") — **retired 1 April 2021**; AccountingWEB users described it as "always a stop gap to get you to sign up to their main product". Sources: https://www.avalara.com/blog/en/europe/2018/10/avalara-mtd-filer-free-tool-for-hmrcs-mtd.html ; https://www.accountingweb.co.uk/any-answers/seeking-a-free-alternative-to-avalaras-mtd-filer (search snippets — medium)
  - **VitalTax** — free first year, then £12/yr in 2019 (verified UKBF thread: https://www.ukbusinessforums.co.uk/threads/mtd-free-software.400604/); **now ~£30+VAT/yr** for MTD IT (https://mtd.digital/mtd-income-tax/free-mtd-software/ — medium). Free → cheap → 2.5× price over 7 years.
  - **Survivors**: My Tax Digital (né Portico, Open Answers) stayed genuinely free through the whole VAT era and now covers income tax (https://mytaxdigital.co.uk/); VAT Direct/Cirrostratus similar freemium (https://www.vat.direct).
- **Pattern for TaxSorted**: in the VAT era, "free" was mostly a temporary acquisition tactic by commercial vendors; the only durable free options came from small mission-driven outfits. Costs to business rose (CIOT/ATT: compliance costs up, no accuracy benefit — https://www.att.org.uk/technical/news/tax-practitioners-remain-sceptical-governments-flagship-digital-tax-proposals). Expect the same dynamic in MTD IT as the £30k/£20k waves (2027/28) bring in ~1.9m more, lower-income taxpayers whose software spend the vendors covet.

---

## 6. The open-source / commons gap (directly relevant to TaxSorted)

- **No HMRC-recognised open-source MTD IT product exists on the finder** (none of the 78 advertises an OSS licence; the genuinely free ones are closed-source free services).
- Open source **can** get production credentials, but painfully: Andrew Clayton's **libmtdac / itsa / mtd-cli** (GPL C library + CLIs) were granted **production credentials for ITSA in November 2021 after ~18 months** of HMRC policy wrangling — HMRC's model assumed closed-source vendors and struggled with how OSS should handle OAuth client secrets (each self-hosting user may need own credentials, or the maintainer distributes a hosted secret). Maintainer's verdict: HMRC left "no viable pathway for transparent community tools" by default, though precedent (also gnucash-uk-vat in the VAT era) now exists. Verified: https://github.com/ac000/libmtdac/discussions/18
- HMRC's own finder frontend is, ironically, open source: https://github.com/hmrc/income-tax-software-choices-frontend
- US precedent worth citing in advocacy: IRS **Direct File released as free software** (FSF blog): https://www.fsf.org/blogs/community/irs-direct-file-released-as-free-software
- **Where the commons gap actually is** (synthesis):
  1. **Unconditional, permanent free full-journey software** — only ~4–5 closed-source services today, none with a binding commitment beyond HMRC's "one accounting period" expectation, several funded by opaque cross-subsidy or bank funnels.
  2. **Open source** — nothing recognised; self-hosters face the credentials problem; a hosted commons with published code would be genuinely novel.
  3. **The 2027/28 waves** — ~970k (£30k) + more at £20k: lower earners, least able to pay £84–£230/yr, most likely to be unrepresented; AccountingWEB flags ~20k unrepresented already struggling in wave 1 edge-cases.
  4. **Honest education** — MSE aside, guidance is vendor marketing; LandlordZone survey shows comprehension is the biggest failure (half of landlords misunderstand scope rules); even HMRC's finder buries the "in development" caveats two clicks deep.
  5. **Year-end return coverage** is the weak point of existing free tiers — quarterly updates are commoditised; the final declaration (16 income/adjustment item types listed by HMRC) is where free products go "in development" and paid products charge.

---

## 7. Working artefacts

- Parsed product data: `scratchpad/taxsorted/products.json` (all 78 cards), `free-details.json` (13 free products' feature-status tables), raw HTML: `results.html`, `details/*.html`.
- HMRC finder session note: the tool is a Play/GOV.UK-frontend app; `GET /find-making-tax-digital-income-tax-software/software-results` with a session cookie returns the full list; product detail pages are plain GETs (`product-details?productId=NNNN`) — easy to re-scrape for monitoring the market monthly.
