# TaxSorted — completeness critique: what's missing / under-examined
Date: 2026-07-03. Role: completeness critic over the six research summaries (mandate, api, approval, landscape, substance, fraudheaders) + repo analyses.
Method: gap analysis + quick web checks where they settled things cheaply. Confidence marked per item. Sources inline.

---

## BLOCKERS

### 1. No go/no-go timeline vs 7 Aug 2026 — and the honest answer is "you will miss it"
Today is 3 July. First quarterly deadline is 7 Aug 2026 (~5 weeks). The approval path (sandbox-test ALL minimum-standard endpoints → SDSTeam log review → fraud-header sign-off rounds, the documented stall point → Production Approvals Checklist → up-to-10-working-day check) realistically takes months; precedent (itsa/mtd-cli) took ~8 months of policy wrangling.
**Mitigation the research already contains but never assembles into a plan:** the cumulative-update model means a Q2 submission (due 7 Nov 2026) contains Q1's year-to-date data, and Autumn Budget 2025 waived penalty points for late quarterly updates in 2026-27 entirely. So a product live by October still serves first-wave users with zero user harm.
**Why it matters:** publicly promising 7 Aug and missing it would be the project's first act of untrustworthiness. Declare 7 Nov (Q2) as the honest target and say why.

### 2. Minimum functionality standards are bigger than "quarterly update pipe" — now enumerated
From the MTD IT end-to-end service guide (how-to-integrate page), the minimum standards are 9 items (verbatim heads):
1. fraud prevention header data; 2. obtain business ID per business; 3. create/maintain all digital records (or digital-link to a product that can); 4. submit quarterly updates for each mandated income source; 5. let customers view an estimate of income tax liability (in-software or signpost to HMRC account); 6. make required adjustments and finalise business income for the year; 7. handle losses brought forward / carry forward / sideways; 8. submit non-mandated income sources or divert to software that can; 9. make final declaration or divert to software that can.
So **losses, adjustments and a liability-estimate view are in the minimum** (individually or in conjunction with other products; diversion allowed only for 8 & 9 — note 6 & 7 have no divert wording).
**Why it matters:** this list, mapped against APIs, IS the MVP definition. Nobody has done the mapping; under-scoping here recreates the exact "MTD-ready software that can't finalise" trap the project criticises in competitors.
Source: developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html (fetched 2026-07-03).

### 3. No liability shield: one named human absorbs all legal risk
The terms-of-use "responsible individual" + sole-trader UTR route means unlimited personal liability: negligent-misstatement claims if guidance/categorisation errors cause user penalties, the £3,000/program fraud-header penalty, ICO fines, contract/consumer claims. Nothing researched on: legal entity (ltd company / CIC / charity), professional-indemnity or cyber insurance, or a terms-of-service + disclaimer architecture. Note UCTA 1977 s.2(2) reasonableness and CRA 2015 limit how far liability can be excluded even for free services — a disclaimer is not a force field. Also note a genuine mitigation to document: **the tax calculation itself is HMRC's** (Individual Calculations API computes; software submits data), which meaningfully narrows the negligence surface to record-categorisation and guidance content.
**Why it matters:** one wrong figure shipped to hundreds of users is an existential personal event for the single human. Entity + insurance + terms are cheap relative to that.

---

## IMPORTANT

### 4. "Is tax advice regulated?" — mostly settled, two live tripwires
(a) Tax advice is not a licensed profession in the UK, BUT anyone providing "material aid, or assistance or advice, in connection with the tax affairs of other persons" **by way of business** must have anti-money-laundering supervision (MLR 2017; HMRC ECSH43531). HMRC's own guidance: services on a **non-commercial basis** are not "by way of business" → a genuinely free commons is exempt. Donations, paid support tiers, or grants tied to service delivery could flip this — document the boundary now.
(b) NEW and missed by the sweep: **mandatory HMRC registration of tax advisers from April/May 2026** (Tax Update 2026 / gov.uk policy paper). Software providers are explicitly out of scope if they "only provide payroll or tax software for clients to use without themselves interacting with HMRC" — but any human-assisted filing, "let me look at your account", or agent-style help crosses into scope (API interaction on a client's behalf counts as interacting with HMRC).
**Why it matters:** the education/advice/assistance boundary defines what the support channel may say and do. Crossing it unknowingly = unregistered activity in a supervised sector.
Sources: gov.uk/hmrc-internal-manuals/economic-crime-supervision-handbook/ecsh43531; gov.uk/guidance/money-laundering-regulations-who-needs-to-register; gov.uk/government/publications/mandatory-tax-adviser-registration-with-hmrc; tax.org.uk FAQs; icas.com coverage.

### 5. HMRC published gen-AI-in-tax-software guidelines (28 Jan 2026) — not in the research
Voluntary guidance, but it is HMRC's stated expectation set: disclose to users that software is AI-enhanced incl. hallucination risk; AI should "support, not replace, human judgment" and actively prompt users to check results; ground on official HMRC publications/legislation/case law with version control and timely updating; SSDLC + UK GDPR privacy-by-design; continuous auditing for bias/harm; "You are responsible for making sure that any AI model you use… has strong controls."
**Why it matters:** an openly AI-built product that hasn't mapped itself to HMRC's own AI guidance hands critics a free stick; mapping to it (publicly, in the repo) turns "AI-built" from a liability into a differentiator. This is the direct answer to "HMRC's attitude to AI-built software": no prohibition, published expectations, responsibility on the developer.
Source: gov.uk/guidance/guidelines-for-using-generative-artificial-intelligence-if-youre-a-software-developer; ICAEW news Jan 2026.

### 6. Tax Update 2026 (23 June 2026) — strengthened software standards + unified vendor registration, missed entirely
Nine days before this critique, HMRC announced: strengthened standards for tax software with **all API-integrating third-party providers initially in scope**, **unified registration for software providers**, smoother **switching of taxpayer data between products** (portability), an API innovation portal, and "commercial routes for features without commercial benefit"; engagement through 2026-27, transition confirmed mid-to-late 2027.
**Why it matters:** this is the future rulebook TaxSorted will live under; the data-portability/switching theme should shape the export format and data model *now*, and "features without commercial benefit" is precisely the commons' territory — potential funding/positioning lever.
Sources: gov.uk Tax Update 2026 summary; icaew.com/insights/tax-news/2026/mar-2026/standards-for-tax-software-to-be-strengthened (n.b. ICAEW piece is March 2026 — proposals pre-announced then, formalised in the June statement).

### 7. Name collision: "TaxSorted" is already taken in this exact sector
taxsorted.uk is a live Shropshire accountancy firm trading as "Tax Sorted / TaxSorted" (self-assessment, VAT, payroll services). Separately, **MTDsorted** (mtdsorted.co.uk) is an existing HMRC-recognised MTD software brand. Passing-off risk, trademark risk, and guaranteed search-result confusion.
**Why it matters:** renaming after recognition/listing is expensive and embarrassing; check the UKIPO register and Companies House before anything public ships under the name.

### 8. GDPR is researched as an HMRC-terms checkbox, not as an operating stack
Missing pieces: **ICO data protection fee** registration (Data Protection (Charges and Information) Regs 2018 — required for controllers; the exemptions are narrow and a hosted tax service almost certainly must pay; low cost, criminal-ish embarrassment if skipped — verify tier); a **controller/processor map** for hosted vs self-hosted instances (who is controller of a self-hoster's data? mirrors the unresolved fraud-header supplier question); a **DPIA** — near-mandatory given large-scale processing of financial data + NINOs + device fingerprints; **international transfers** if hosted on US-owned infra (Fly.io/Cloudflare → UK IDTA / UK extension to EU-US DPF; terms of use also require telling users where data lives); the **retention-vs-erasure conflict** (HMRC terms require user delete rights; tax law requires users to keep records ~5 years after 31 Jan — a local-first design largely dissolves this, which is an argument FOR it); breach response runbook (72h to ICO *and* HMRC).
**Why it matters:** a privacy-forward commons that is itself an unregistered, DPIA-less controller is a headline waiting to happen.

### 9. Onboarding journey and auth models under-researched (individual vs agent)
There is **no API for MTD sign-up** — the taxpayer (or agent) enrols via the GOV.UK service with Government Gateway credentials; software only works once ITSA status is MTD Mandated/Voluntary. Government Gateway/identity friction will be the #1 real-world support driver and needs first-class docs. The whole **agent lane** (Agent Services Account, agent authorisation APIs, the new "supporting agent" role for MTD) is unexamined — a deliberate "v1 is individuals-only" decision should be written down, since many target users have letting agents/bookkeepers.
**Why it matters:** users who can't connect churn instantly and flood the one-human support channel; an undocumented agent stance confuses the finder listing answers too.
Source: gov.uk/guidance/sign-up-for-making-tax-digital-for-income-tax.

### 10. Free-software support obligation vs a team of one
HMRC's free-software conditions require "a reasonable level of guidance" and "help and support to users", reviewed as part of listing; inadequate support risks delisting. No support model exists: docs, community forum, AI-first triage, response-time expectations, and what happens at 31 Jan peak.
**Why it matters:** delisting for support failure is the most plausible slow death for a recognised free product — and it's testable before launch.

### 11. Sustainability & continuity (bus factor = 1)
Free "for a full annual accounting period" is a commitment: if the service stalls mid-year, users are stranded mid-cycle — the precise failure mode (Avalara/VitalTax) the landscape research criticises. Missing: governance plan, second maintainer path, infrastructure cost model, credential succession (Developer Hub app ownership), and a documented "if this dies" exit (data export + migration to My Tax Digital etc. — dovetails with HMRC's new portability agenda).
**Why it matters:** "what happens if you disappear in November?" is the first question any journalist or accountant will ask a one-person free tax service.

### 12. Security assurance specifics unplanned
Terms of use require **pen-testing for SaaS** (cost/scheduling unbudgeted), encryption at rest/in transit (known), 72h incident reporting (known). Missing: threat model for the fact that a hosted instance is a honeypot (one OAuth client secret + every user's refresh tokens + full financial history), key-management design, dependency/supply-chain policy for an AI-authored codebase, and whether Cyber Essentials (cheap, credible) is worth holding.
**Why it matters:** a breach at a tax commons is unrecoverable reputationally; HMRC vetting for hosted public products is explicitly stricter.

### 13. Accessibility is a hard condition needing actual work; Welsh is optional but strategic
WCAG 2.1 AA is a terms-of-use condition for web software — that means a real audit, an accessibility statement, and testing with assistive tech, not an intention. The finder also filters by accessibility features (visual/hearing/motor/cognitive) — answers must be true. Welsh language is NOT required (finder filter only) but no free full-journey Welsh product may exist — cheap differentiator later; note digital-exclusion users are exempt anyway.
**Why it matters:** an AA claim that fails a spot-check is both a recognition problem and a public embarrassment.

---

## NICE-TO-KNOW

### 14. Education-content accuracy governance
The substance research is strong, but no process exists for keeping published education correct across events (Budgets, SIs, the 2027 property/savings 22/42/47 switch already enacted in FA 2026). Nuances already flagged as easy to get wrong in public: the 2026-27 easement kills quarterly-update *points* but NOT late-payment penalties or return penalties; Scottish bands; the 31-March/5-April equivalence election for accounting dates. One viral wrong tax tip out-damages any bug. Suggest: versioned content with cited sources and a review cadence tied to the income-tax-mtd-changelog + fiscal events.

### 15. PECR consent for the Device-ID cookie
Already flagged low-confidence in the fraud-header notes; needs a settled written position (strictly-necessary exemption argument vs consent banner) before launch — a privacy-forward commons cannot have a hand-wavy cookie story.

### 16. Consumer-law posture for free digital content
CRA 2015 digital-content remedies mainly attach to paid content, but negligent misstatement and CPUT Regs (marketing claims — e.g. "HMRC recognised" wording rules already known) still apply. Shapes terms-of-service and marketing copy; fold into item 3's legal workstream.

### 17. HMRC-side failure handling
3 rps rate limit, MESSAGE_THROTTLED_OUT, API downtime around 7 Aug/31 Jan peaks, calculation-discrepancy handling — needs a retry/queue design and honest status page so support doesn't drown.

### 18. Funding-model side effects
Donations/grants can flip the AML "by way of business" analysis (item 4a), the free-software listing status, and even the tax-adviser-registration analysis if paid human help appears. Write the boundary down once, now.

---

## Quick-check verdicts on the questions asked
- **Is tax advice regulated in the UK?** Not a licensed profession; AML supervision required if by way of business (free/non-commercial exempt per HMRC ECSH43531); NEW mandatory tax-adviser registration from Apr/May 2026 excludes pure software providers.
- **Disclaimer?** Necessary but legally bounded (UCTA/CRA); pair with entity + insurance. HMRC computing the actual calculation narrows exposure.
- **GDPR for tax records?** Under-cooked: ICO fee, DPIA, transfers, controller map, retention-vs-erasure — see item 8.
- **Agent vs individual auth?** Genuine research hole — see item 9.
- **Welsh/accessibility?** Welsh optional (filter); WCAG 2.1 AA contractual — see item 13.
- **HMRC attitude to AI software?** Published voluntary guidelines 28 Jan 2026; responsibility on developer; no bar — see item 5. Plus strengthened vendor standards coming (item 6).
- **Time-critical before 7 Aug 2026?** Approval can't land by then; the cumulative model + 2026-27 point waiver makes 7 Nov the honest target — see item 1. Also: sandbox app auto-deletes after 30 days idle; production-credential requests expire after 6 months.

## Sources (key)
- developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html
- gov.uk/guidance/guidelines-for-using-generative-artificial-intelligence-if-youre-a-software-developer
- gov.uk/government/publications/mandatory-tax-adviser-registration-with-hmrc/tax-advisers-to-register-with-hmrc-and-meet-minimum-standards
- gov.uk/hmrc-internal-manuals/economic-crime-supervision-handbook/ecsh43531
- gov.uk/guidance/money-laundering-regulations-who-needs-to-register
- gov.uk/government/publications/summary-of-tax-update-2026-simplification-modernisation-and-fairness (23 Jun 2026)
- icaew.com/insights/tax-news/2026/mar-2026/standards-for-tax-software-to-be-strengthened
- gov.uk/guidance/sign-up-for-making-tax-digital-for-income-tax
- taxsorted.uk; mtdsorted.co.uk (name collision)
