# How a UK tax law is actually born — research notes

Research date: 2026-07-06. All URLs below were fetched live on this date unless marked otherwise.
Method note: gov.uk, legislation.gov.uk, hansardsociety.org.uk, instituteforgovernment.org.uk, petition.parliament.uk, writetothem.com, theyworkforyou.com fetched directly. All *.parliament.uk properties (commonslibrary, erskinemay, bills, committees, hansard, researchbriefings.files) are behind a Cloudflare challenge and could NOT be fetched directly — facts from those domains come via search-result extracts and are flagged [snippet] with lower confidence.

---

## 0. Who actually does what (the cast, role-anchored)

- **HM Treasury (HMT)** — "the government's economic and finance ministry, maintaining control over public spending, setting the direction of the UK's economic policy". It owns tax *policy*.
  Source: https://www.gov.uk/government/organisations/hm-treasury (fetched 2026-07-06)
- **HMRC** — "the UK's tax, payments and customs authority". A **non-ministerial department**: it administers tax law and drafts much of the detail, but no minister directs individual taxpayers' affairs. Led by a First Permanent Secretary and Chief Executive (John-Paul Marks CB as of 2026-07-06).
  Source: https://www.gov.uk/government/organisations/hm-revenue-customs (fetched 2026-07-06)
- **Chancellor of the Exchequer** — decides and announces tax changes at the Budget. (Rachel Reeves MP as of 2026-07-06.)
  Source: https://www.gov.uk/government/organisations/hm-treasury
- **The tax minister — CURRENTLY the Exchequer Secretary to the Treasury (XST), NOT the Financial Secretary.** As of 2026-07-06 the XST role page lists: direct/indirect/business/property/personal taxation, tax administration, customs and VAT at the border, environment/transport taxes, and "departmental lead for HM Revenue and Customs" (also Valuation Office Agency, Government Actuary's Department). Held by Daniel Tomlinson MP, appointed 1 September 2025.
  Source: https://www.gov.uk/government/ministers/exchequer-secretary-to-the-treasury (fetched 2026-07-06)
  ⚠ CAUTION FOR CONTENT: historically the Financial Secretary to the Treasury (FST) led on tax. As of 2026-07-06 the FST (Lord Livermore, appointed 8 July 2024) leads on the Growth Mission, welfare, Crown Estate etc. — the FST role page lists **no tax responsibilities**. Ministerial portfolios get reshuffled; always link readers to the live gov.uk ministers pages rather than hard-coding a name or even a role.
  Source: https://www.gov.uk/government/ministers/financial-secretary-to-the-treasury (fetched 2026-07-06)
- **Office for Budget Responsibility (OBR)** — independent forecaster. Statutory duty under s.4(3) Budget Responsibility and National Audit Act 2011 to produce fiscal and economic forecasts "on at least two occasions for each financial year" (this is why a spring forecast still exists even with one fiscal event a year).
  Source: https://www.legislation.gov.uk/ukpga/2011/4/section/4 (fetched 2026-07-06). obr.uk itself returned 403 to fetch.
- **Parliament** — the Commons decides tax; the Lords' role on "money bills" is limited by the Parliament Act 1911 (see §3.5).

The "policy partnership": HMT leads strategic tax policy; HMRC leads policy maintenance, delivery and implementation. This exact framing comes from the 2010 "new approach to tax policy making" era; the current (June 2025) Tax Policy Making Principles document is looser — it just says "policy officials will continue to collaborate with stakeholders" and names HMT and HMRC jointly (e.g. their joint "Areas of Research Interest for tax", Nov 2024). Confidence on the exact historic wording: LOW (not re-verified on a live page today); the joint-working fact itself: HIGH via https://www.gov.uk/government/publications/tax-policy-making-principles/tax-policy-making-principles

---

## 1. The fiscal cycle as of 2026

- **One major fiscal event a year.** Government policy (in force through 2026): "a single major fiscal event each year, whereby tax policy measures announced at the annual Budget are legislated for in an annual Finance Bill or appropriate legislative vehicle."
  Source: Tax Policy Making Principles, HM Treasury, published 12 June 2025 — https://www.gov.uk/government/publications/tax-policy-making-principles/tax-policy-making-principles (fetched 2026-07-06)
- **The Budget happens in the autumn.** Budget 2025 was delivered Wednesday **26 November 2025** ("Strong foundations, secure future").
  Source: https://www.gov.uk/government/topical-events/budget-2025 (fetched 2026-07-06)
- **Spring = forecast only, not a mini-Budget.** The OBR published an economic and fiscal forecast on **3 March 2026**; the government said in advance it would be "an interim update on the economy and public finances", not a fiscal-rules assessment, per the one-fiscal-event policy. The Chancellor responded with a statement but announced no new tax policies (per Commons Library "2026 spring forecast: A summary", CBP-10495 [snippet — parliament.uk unfetchable]).
  Sources: https://www.gov.uk/government/news/chancellor-announces-date-of-spring-forecast (fetched 2026-07-06); https://commonslibrary.parliament.uk/research-briefings/cbp-10495/ [snippet]
- **Why two forecasts if one Budget?** The OBR must forecast at least twice per financial year by law (s.4(3) BRNA Act 2011). Source: https://www.legislation.gov.uk/ukpga/2011/4/section/4
- **Who writes the Budget:** HM Treasury, with HMRC working the tax measures; the technical companion "Overview of Tax Legislation and Rates" (OOTLAR) is published by HMRC on Budget day. OOTLAR for Budget 2025: Chapter 1 = 91 measures going into Finance Bill 2025-26; Chapter 2 = announcements NOT in the Bill (consultations, future legislation); annexes = rates/allowances tables.
  Source: https://www.gov.uk/government/publications/budget-2025-overview-of-tax-legislation-and-rates-ootlar/budget-2025-overview-of-tax-legislation-and-rates-ootlar (updated 5 Dec 2025; fetched 2026-07-06)

### Budget secrecy ("purdah")
- Convention: the contents of the Budget are kept secret until the Chancellor stands up. The cautionary tale: Chancellor **Hugh Dalton resigned in November 1947** after casually revealing Budget details to a journalist minutes before the speech.
  Source: Institute for Government, "Budget talk: an end to secrecy?" (23 March 2011) — https://www.instituteforgovernment.org.uk/article/comment/budget-talk-end-secrecy (fetched 2026-07-06)
- Honest telling: the convention has visibly weakened — Chancellors now routinely pre-brief selected measures to the press, and no one resigns over it (same IfG source, and it's observably true of recent Budgets). Market-sensitive rates (e.g. duty changes) still stay secret to Budget day.
- There is no legal "purdah" statute for Budgets; it's convention + market-sensitivity practice. Confidence: MEDIUM (convention documented; absence of statute is inference).

---

## 2. Budget day to Finance Act: the primary-legislation pipeline

### 2.1 Ways and Means resolutions
- After the Chancellor's speech, the Commons debates the Budget (typically ~4 days), then votes **Ways and Means resolutions** — one per measure, "sometimes as many as 80 or more". These are the procedural foundation of the Finance Bill: every provision in the Bill must be covered by a resolution. Only the first motion is debated; the rest are put "forthwith" (no debate, straight to vote). Founding resolutions must be approved "within 10 sitting days of the Budget statement".
  Source: Hansard Society, "How do MPs approve the Budget?" — https://www.hansardsociety.org.uk/publications/guides/how-do-mps-approve-the-budget (fetched 2026-07-06)

### 2.2 Provisional Collection of Taxes Act 1968 — taxes you pay BEFORE the law exists
This is the bit that surprises people: many Budget changes take legal effect immediately (even from 6pm on Budget day for duties) months before the Finance Act passes.
- Mechanism: a Commons resolution with a declaration that it is expedient in the public interest has temporary statutory force "as if contained in an Act of Parliament". It can renew, vary or abolish an existing tax.
- Covered taxes (s.1 list, as amended): income tax, capital gains tax, corporation tax, VAT, bank levy, apprenticeship levy, digital services tax, multinational/domestic top-up taxes, plastic packaging tax, climate change levy, carbon border adjustment mechanism, insurance premium tax, landfill tax, aggregates levy, soft drinks industry levy, petroleum revenue tax, stamp duty reserve tax, SDLT, ATED, customs/excise duties, and more.
- Time limits: the resolution dies unless the Finance Bill gets a **second reading within 30 sitting days**; and it expires in any case **7 months** after it takes effect. It also lapses if Parliament is dissolved/prorogued (with a grace mechanism at end of session) or if the provision is rejected during the Bill's passage.
  Source (primary): https://www.legislation.gov.uk/ukpga/1968/2/section/1 (fetched 2026-07-06)
  Source (explainer): Hansard Society guide above — s.5 motions give immediate effect from Budget day for changes to existing taxes; s.1 declarations carry the 7-month/30-sitting-day limits.
- Plain-words framing for content: "Parliament gives the Chancellor a 7-month IOU. If the Finance Bill stalls, the tax change legally evaporates and HMRC would have to repay."
- NOTE: PCTA only works for *existing* taxes. A brand-new tax needs the Finance Act itself before it can be collected. Confidence: MEDIUM-HIGH (consistent with Erskine May snippet: resolutions can renew/vary, not create).

### 2.3 Finance Bill stages in the Commons
General bill stages (all bills): first reading (formal, title only) → second reading (debate + vote on principle) → committee (line-by-line; Public Bill Committee or whole House) → report stage (chamber, amendments) → third reading → other House → Royal Assent. Bills mainly about taxation must start in the Commons — "the annual Finance bill is an example of this".
  Source: https://www.gov.uk/guidance/legislative-process-taking-a-bill-through-parliament (Cabinet Office guidance, updated 14 March 2023; fetched 2026-07-06)
Finance-Bill specifics:
- Committee stage is **split**: the politically biggest clauses are debated in **Committee of the Whole House** (all MPs, on the floor), the rest go to a **Public Bill Committee** (small committee of MPs).
  Source: parliament.uk Scrutiny Unit guidance [snippet — "some key clauses of Finance Bills are considered by the Committee of the Whole House rather than a Public Bill Committee"] https://www.parliament.uk/mps-lords-and-offices/offices/commons/scrutinyunit/written-submissions/ ; corroborated by the real FA2026 timeline below. Confidence: HIGH (pattern), MEDIUM (snippet source).
- **Anyone can submit written evidence to the Public Bill Committee** — email scrutiny@parliament.uk, Word document, max 3,000 words, before the committee's last sitting. Evidence sent to the Treasury instead doesn't count as committee evidence. [snippet — same parliament.uk page; email copied exactly from the search extract]. Confidence: MEDIUM (page unfetchable directly today).

### 2.4 The Lords: money bills and the Parliament Act 1911
- The annual Finance Bill is normally certified by the Speaker as a **money bill**. Under **s.1 Parliament Act 1911**: if the Lords do not pass a money bill unamended within **one month**, it can go for Royal Assent without their consent. Money bill = a bill the Speaker certifies as containing only provisions dealing with (among others) "the imposition, repeal, remission, alteration, or regulation of taxation" (local-authority levies excluded). The Speaker consults two members of the Chairmen's Panel before certifying.
  Source (primary): https://www.legislation.gov.uk/ukpga/Geo5/1-2/13/section/1 (fetched 2026-07-06)
- So the Lords cannot block or amend tax rates. Their real influence is earlier and technical: the **House of Lords Economic Affairs Committee's Finance Bill Sub-Committee**, appointed annually, examines the **draft** Finance Bill "from the point of view of technical issues of tax administration, clarification and simplification" — explicitly NOT rates or incidence. For Finance Bill 2025-26 it was appointed 2 September 2025, launched its call for evidence 17 September 2025 (draft bill published 21 July 2025), and published a report (news item "Lords Committee publishes report on Finance Bill 2025-26").
  Source: https://committees.parliament.uk/committee/230/finance-bill-subcommittee/ [snippet — parliament.uk unfetchable]. Confidence: MEDIUM.

### 2.5 Royal Assent
Formal final step; the Bill becomes the Finance Act. Enacting formula observed in Finance Act 2026: "be it enacted by the King's most Excellent Majesty, by and with the advice and consent of the Lords Spiritual and Temporal, and Commons…".
  Source: https://www.legislation.gov.uk/ukpga/2026/11/introduction/enacted

---

## 3. A real, complete run: Budget 2025 → Finance Act 2026

| Date | Event | Source |
|---|---|---|
| 21 Jul 2025 | "L-day": draft Finance Bill 2025-26 clauses published for technical consultation (each measure = TIIN + draft legislation + explanatory note); comment window closed **15 September 2025** | https://www.gov.uk/government/collections/finance-bill-2025-26 (fetched 2026-07-06) |
| 2 Sep 2025 | Lords Finance Bill Sub-Committee appointed to scrutinise the draft bill; call for evidence 17 Sep 2025 | committees.parliament.uk [snippet], MEDIUM |
| 26 Nov 2025 | **Budget 2025** delivered; OOTLAR published same day (updated 5 Dec 2025) | https://www.gov.uk/government/topical-events/budget-2025 ; OOTLAR link above |
| early Dec 2025 | Budget debate concludes; Ways and Means resolutions voted; Finance Bill introduced. gov.uk collection page dated 2 Dec 2025 says "Finance Bill 2025-26 was published"; specialist reports say the Bill text was published 4 Dec 2025 | https://www.gov.uk/government/collections/finance-bill-2025-26--2 ; https://www.rossmartin.co.uk/sme-tax-news/8862-finance-act-2026-receives-royal-assent — CONFIDENCE MEDIUM on exact day |
| 16 Dec 2025 | Second reading (Commons) | CIOT https://www.tax.org.uk/finance-bill-2025-26 [snippet — site 403s to fetch], MEDIUM |
| 12–13 Jan 2026 | Committee of the Whole House (selected clauses) | CIOT [snippet], MEDIUM; gov.uk supporting doc "Finance Bill 2025-26: Committee of the Whole House" https://www.gov.uk/government/publications/finance-bill-2025-26-committee-of-the-whole-house |
| 27 Jan–3 Feb 2026 | Public Bill Committee, six sittings; committee stage completed 3 Feb 2026 | CIOT [snippet], MEDIUM |
| 11 Mar 2026 | Remaining stages (report + third reading); Bill "substantively enacted" for accounting that day | CIOT [snippet]; rossmartin.co.uk (above), MEDIUM |
| 18 Mar 2026 | **Royal Assent — Finance Act 2026 (c. 11)** | PRIMARY: https://www.legislation.gov.uk/ukpga/2026/11/introduction/enacted (fetched 2026-07-06) |

Whole pipeline: announcement to Act in **under 4 months**; draft-clauses-to-Act in 8 months. Lords stages: nominal (money bill).

---

## 4. Secondary legislation — where most tax detail actually lives

- Most operational tax law (MTD rules, thresholds detail, admin) is made by **statutory instrument (SI)** under powers delegated by a parent Act — ministers or HMRC Commissioners sign it; Parliament only supervises.
- **Negative procedure** (~75% of SIs): the SI is made, laid before Parliament, and becomes/stays law unless annulled within (usually) **40 days** via a "prayer" motion. In practice annulment is near-extinct: the Commons last annulled an SI in **1979**; the Lords last rejected a negative SI in **2000**.
- **Affirmative procedure** (~25%): both Houses (or Commons alone for financial SIs) must actively approve before it takes effect. Commons debates mostly happen in **Delegated Legislation Committees** (16–18 MPs, up to 90 minutes), then a no-debate chamber vote. Commons last rejected an affirmative SI in 1978.
- Scrutiny committees: **Joint Committee on Statutory Instruments** (technical/legal correctness, both Houses); **Secondary Legislation Scrutiny Committee** (Lords; policy merits). No Commons equivalent of the SLSC.
- SIs cannot be amended by Parliament — take-it-or-leave-it.
  Source: Institute for Government, "Secondary legislation: how is it scrutinised?" — https://www.instituteforgovernment.org.uk/explainer/secondary-legislation-scrutiny (fetched 2026-07-06); corroborated by Hansard Society delegated-legislation guides https://www.hansardsociety.org.uk/publications/guides/delegated-legislation-frequently-asked-questions [not separately fetched]
- **Tax SIs are usually laid before the House of Commons only** (financial privilege). Live example: **SI 2026/336, The Income Tax (Digital Obligations) Regulations 2026** — made by "the Commissioners for His Majesty's Revenue and Customs" on **23 March 2026**, **laid before the House of Commons** (only) **24 March 2026**, in force **1 April 2026**; made under paras 7, 9, 11, 13–15 and 18 of Schedule A1 to the Taxes Management Act 1970 (inserted by Finance (No. 2) Act 2017).
  Source (primary): https://www.legislation.gov.uk/uksi/2026/336/introduction/made (fetched 2026-07-06)
  Procedure type note: laid-before-Commons-only under TMA Sch A1 powers = negative procedure in the Commons. Confidence on the explicit "negative" label for this SI: MEDIUM (the introduction text doesn't name the procedure; inferred from laying pattern + parent Act).

---

## 5. Consultations — where a tax idea is supposed to be tested

- **The old framework:** "Tax Consultation Framework" (HMRC/HMT, published 1 March 2011) set the classic 5-stage policy-development cycle. It was **WITHDRAWN on 1 October 2025** as outdated.
  Source: https://www.gov.uk/government/publications/tax-consultation-framework (fetched 2026-07-06 — page carries the withdrawal notice and points to the replacement)
- **The current framework: "Tax Policy Making Principles"** (HM Treasury, published **12 June 2025**). Three commitments: (1) predictability & stability via the single-fiscal-event cycle; (2) "smart and agile" consultation — engagement spread through the year rather than fixed stages; (3) transparency about rationale and impacts. Key line on drafts: "While draft legislation will typically continue to be published on Legislation day (L-day) in the summer, the government will, where appropriate, look to publish technical consultations at other points in the cycle."
  Source: https://www.gov.uk/government/publications/tax-policy-making-principles/tax-policy-making-principles (fetched 2026-07-06)
- **Where consultations appear:** the gov.uk hub — https://www.gov.uk/search/policy-papers-and-consultations — filter document type "Consultations (open)" + organisation "HM Revenue & Customs" or "HM Treasury". Verified working 2026-07-06.
- **How long they run:** no fixed 12-week rule any more. Cabinet Office **Consultation Principles** (published 17 July 2012, updated 19 March 2018) require proportionate, genuinely-open consultation but set no fixed duration.
  Source: https://www.gov.uk/government/publications/consultation-principles-guidance (fetched 2026-07-06)
  Observed tax practice: L-day 2025 draft clauses got ~8 weeks (21 Jul → 15 Sep 2025); the 2016 MTD consultation ran ~12 weeks (15 Aug → 7 Nov 2016). Sources: finance-bill-2025-26 collection; MTD consultation page (§7).
- Anyone can respond to any consultation — each consultation page carries its own response email/form. Responses from individual sole traders/landlords are legitimate and read; professional bodies (CIOT, ICAEW, LITRG, FSB) aggregate views too.

---

## 6. Tax simplification after the OTS

- The **Office of Tax Simplification** (statutory independent adviser "to make things easier for taxpayers") was closed: closure announced in the Growth Plan on **23 September 2022**; update 17 November 2022 said it would cease work after its final report and formally close when the Spring Finance Bill 2023 received Royal Assent.
  Sources: https://www.gov.uk/government/organisations/office-of-tax-simplification ; https://www.gov.uk/government/news/update-on-the-closure-of-the-office-of-tax-simplification (both fetched 2026-07-06)
- Abolition enacted by **s.347 Finance (No. 2) Act 2023**: "The Office of Tax Simplification is abolished."
  Source (primary): https://www.legislation.gov.uk/ukpga/2023/30/part/7/crossheading/office-of-tax-simplification (fetched 2026-07-06)
- What replaced it: a **mandate to HMT/HMRC officials** to focus on simplification inside normal policy work (announced alongside closure), i.e. simplification lost its independent institutional champion. An amendment to require annual reporting to the Treasury Committee on simplification was debated and rejected. [snippet sources: Treasury Committee report https://publications.parliament.uk/pa/cm5803/cmselect/cmtreasy/1425/report.html ; bills.parliament.uk amendment NC1] Confidence: MEDIUM.
- Where simplification scrutiny now lives in practice: the Commons **Treasury Committee** (inquiries, e.g. "Tax Simplification"), the Lords **Finance Bill Sub-Committee** (technical/simplification review of draft Finance Bills — see §2.4), government packages like "Tax update spring 2025: simplification, administration and reform" (named in the Tax Policy Making Principles doc), and outside bodies (CIOT/LITRG/ICAEW). Confidence: MEDIUM-HIGH.

---

## 7. End-to-end trace: Making Tax Digital for Income Tax (2015 → live in 2026)

The single best worked example for sole traders/landlords — it exercises every part of the machine: announcement → consultation → primary Act → SIs (made, amended, revoked, remade) → guidance.

1. **2015 — announcement era.** MTD roadmap era begins (Budget March 2015 "end of the tax return", roadmap Dec 2015). No live gov.uk page found today for the 2015 roadmap (the old URL now hosts a 2020-era collection). Confidence: LOW on exact 2015 dates; use the verified 2016 consultation as the anchor instead. https://www.gov.uk/government/publications/making-tax-digital (now = current MTD IT collection, first published 10 Feb 2020, updated 17 Dec 2025)
2. **15 Aug – 7 Nov 2016 — consultation.** HMRC consultation "Making Tax Digital: Bringing business tax into the digital age" (one of the 2016 MTD set). Response published **31 January 2017**: "respondents… overwhelmingly support the move to a digital tax system"; concessions included keeping spreadsheets (with software) and free software for the smallest businesses.
   Source: https://www.gov.uk/government/consultations/making-tax-digital-bringing-business-tax-into-the-digital-age (fetched 2026-07-06)
3. **16 Nov 2017 — primary legislation.** **s.60 Finance (No. 2) Act 2017** ("Digital reporting and record-keeping for income tax etc") inserts s.12C and **Schedule A1 into the Taxes Management Act 1970**: the power for HMRC to require digital records and quarterly-at-most updates by regulations, with digital-exclusion exemptions. (RA date of the Act: 16 Nov 2017 — confidence MEDIUM, not separately verified today; section content HIGH.)
   Source: https://www.legislation.gov.uk/ukpga/2017/32/section/60 (fetched 2026-07-06)
4. **23 Sep 2021 — first regulations.** **SI 2021/1076, Income Tax (Digital Requirements) Regulations 2021** made by HMRC Commissioners under Sch A1; as made, due in force **6 April 2024**.
   Source: https://www.legislation.gov.uk/uksi/2021/1076/introduction/made (fetched 2026-07-06)
5. **19 Dec 2022 — the big delay, announced by ministerial statement + press release, not legislation.** Phased mandation: **April 2026 for qualifying income over £50,000; April 2027 for £30,000–£50,000**; review of under-£30,000. Announced by the then Financial Secretary (Victoria Atkins) and HMRC CEO (Jim Harra) — note the tax-minister role has since moved to the XST.
   Source: https://www.gov.uk/government/news/government-announces-phased-mandation-of-making-tax-digital-for-itsa (fetched 2026-07-06)
6. **2024 — amending SI.** **SI 2024/167** amends the 2021 regs: changes the coming-into-force date, postpones digital start dates, raises exemption thresholds, drops end-of-period statements (Part 4) and retail-sales provisions.
   Source: https://www.legislation.gov.uk/uksi/2024/167/note/made (fetched 2026-07-06)
7. **26 Mar 2025 — Spring Statement 2025 announcement.** Policy paper "Modernising the tax system through Making Tax Digital" (HMRC, 26 March 2025): expand MTD IT to **over £20,000 from April 2028**; MTD software to become the norm for year-end submission; penalties reform.
   Source: https://www.gov.uk/government/publications/modernising-the-tax-system-through-making-tax-digital (fetched 2026-07-06)
8. **26 Nov 2025 — Budget 2025 / Finance Bill 2025-26.** OOTLAR confirms Finance Bill legislation "clarifies the scope of MTD, provides new powers for HMRC to make regulations in relation to exemptions", ahead of April 2026 go-live. Finance Act 2026 RA 18 Mar 2026.
   Sources: OOTLAR (§1); https://www.legislation.gov.uk/ukpga/2026/11/introduction/enacted
9. **23 Mar 2026 — the definitive regulations.** **SI 2026/336, Income Tax (Digital Obligations) Regulations 2026**: made 23 Mar 2026, laid before the Commons 24 Mar 2026, in force **1 April 2026**. Its explanatory note **revokes SI 2021/1076 and SI 2024/167** — the 2021 regs "did not come into force and [are] no longer required". So the rules people actually follow from April 2026 are the 2026 regs; the 2021 regs never operated. Genuinely surprising, worth telling.
   Sources: https://www.legislation.gov.uk/uksi/2026/336/introduction/made ; https://www.legislation.gov.uk/uksi/2026/336/note/made (both fetched 2026-07-06)
10. **April 2026 — live, plus guidance.** Mandation from **6 April 2026** for qualifying income over **£50,000** (in 2024-25); **6 April 2027** over **£30,000** (2025-26); **6 April 2028** over **£20,000** (2026-27). Guidance: "Find out if and when you need to use Making Tax Digital for Income Tax" (updated 26 March 2026) and "Use Making Tax Digital for Income Tax" (updated 2 June 2026).
    Sources: https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax ; https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax (both fetched 2026-07-06)

Narrative takeaways for content: 11 years from idea to mandation; two whole sets of regulations written and thrown away before go-live; the biggest single change for taxpayers (the 2022 delay + thresholds) was made by press release and later ratified in regulations; the thresholds people obey live in an SI laid before the Commons under the negative procedure — no MP ever voted on £50k/£30k/£20k directly.

---

## 8. Where an ordinary person can actually push (levers, ranked by realistic effect)

1. **Respond to consultations & draft legislation (best lever).** Watch https://www.gov.uk/search/policy-papers-and-consultations filtered to HMRC/HMT; L-day drafts each summer are open for comments (~8 weeks in 2025). Individual responses are valid; so is feeding views via LITRG/FSB/CIOT.
2. **Written evidence to the Finance Bill Public Bill Committee.** Email scrutiny@parliament.uk, Word doc, ≤3,000 words, before the committee's final sitting (for FA 2026 that window was ~27 Jan–3 Feb 2026). [email from parliament.uk snippet — MEDIUM]
3. **Evidence to the Lords Finance Bill Sub-Committee** on the draft bill (calls for evidence each autumn — 17 Sep 2025 for the last cycle). [MEDIUM — committees.parliament.uk snippet]
4. **Write to your MP** — free via https://www.writetothem.com/ (mySociety charity; postcode → representatives → send). MPs matter most between Budget day and report stage, and on prayers against negative SIs.
5. **Petitions** — https://petition.parliament.uk : British citizens/UK residents; 5 supporters to start; runs 6 months; **10,000 signatures = government response; 100,000 = considered for debate** by the Petitions Committee (11 MPs). Verified: https://petition.parliament.uk/help (fetched 2026-07-06)
6. **Watch the machine:** https://www.theyworkforyou.com/ (mySociety, free — debates, votes, MP records; fetched 2026-07-06); bills.parliament.uk for bill stages; legislation.gov.uk for the law itself.
7. **FOI requests in public:** https://www.whatdotheyknow.com/ (mySociety; site 403'd to automated fetch today — describe with care). Confidence: LOW-MEDIUM (well-known service; not verified today).
8. **Contact HM Treasury** (policy correspondence): Correspondence and Enquiry Unit, 1 Horse Guards Road, Westminster, London SW1A 2HQ; phone 020 7270 5000; web form https://contact.hmt.gov.uk/s/HMTreasuryEmailValidation/ (copied exactly). Media only: pressoffice@hmtreasury.gov.uk / 020 7270 5238.
   Source: https://www.gov.uk/government/organisations/hm-treasury (fetched 2026-07-06)
9. **Contact HMRC** (your own tax affairs, not policy): https://www.gov.uk/contact-hmrc (route referenced from HMRC org page; not fetched individually today).

Honest framing for readers: the Commons whips make Finance Bill amendments from outsiders rare; the real wins for ordinary taxpayers historically come at consultation/draft stage (e.g. spreadsheets retained in MTD after the 2016 consultation) and via delay campaigns amplified through professional bodies and the Treasury Committee.

---

## 9. Loose ends / cautions for the data file

- Office-holder names verified 2026-07-06: Chancellor Rachel Reeves MP; XST Daniel Tomlinson MP (tax lead); FST Lord Livermore (NOT tax); HMRC CEO John-Paul Marks CB. All change without notice — link live gov.uk pages.
- parliament.uk facts ([snippet] flags above) should be re-verified from a browser before publication: exact PBC email, Lords sub-committee dates, FA2026 intermediate stage dates (2R 16 Dec 2025; CWH 12–13 Jan 2026; PBC 27 Jan–3 Feb 2026; remaining stages 11 Mar 2026).
- Discrepancy logged: Finance Bill publication 2 Dec 2025 (gov.uk collection) vs 4 Dec 2025 (rossmartin.co.uk). Likely introduction vs full-text publication; resolve via bills.parliament.uk/bills/4042 in a browser.
- "Purdah" strictly refers to pre-election restrictions; Budget secrecy is a separate convention — don't conflate in copy.
- The old 5-stage consultation framework is now historical (withdrawn 1 Oct 2025) — describe the June 2025 Tax Policy Making Principles as current, mention the old framework only as history.
- 2026 mileage-rate change (alternative trace candidate): NOT researched/verified in this session — do not cite without fresh research.
