# TaxSorted UK Commons — Design

**Date:** 2026-07-03 · **Status:** awaiting Yu's review · **Author:** Ai (with 26 research agents, every load-bearing claim adversarially verified against primary sources)

## 0 · Purpose

TaxSorted is a **commons**: free, open-source UK tax software and education. People file their own taxes; we pave the road. No revenue pressure, no bait pricing, ever. First wedge: **Making Tax Digital for Income Tax** (MTD IT), which became mandatory on 6 April 2026 for sole traders and landlords with qualifying income over £50,000 — and which HMRC serves with **no free government software and no online filing service at all** (full-software-journey policy, Spring Statement 2025).

Goal: become the **first open-source product on HMRC's MTD IT software-choices list**, covering the full journey (digital records → cumulative quarterly updates → year-end tax return), listed before the 7 November 2026 quarterly deadline.

Positioning truth (verified 2026-07-03): HMRC's finder lists ~116 products; 26 carry a "free version" flag; only ~4–5 are unconditionally free AND full-journey; the year-end return is where free tiers are weakest (21 products can't file it at all). A mandated sole trader avoiding the traps pays £84–£230+VAT/yr. The £30k (Apr 2027) and £20k (Apr 2028) waves add ~970,000 lower-income taxpayers — the people a commons most serves. No open-source product is listed. The gap is real.

## 1 · Verified ground truth (full sourced notes in `regs/research/`)

Load-bearing facts the design rests on — each verified against gov.uk / legislation.gov.uk / HMRC Developer Hub by independent fact-check agents:

- **Governing law:** SI 2026/336 (Income Tax (Digital Obligations) Regulations 2026, in force 1 Apr 2026) replaces the 2021 regulations and hard-codes thresholds: £50k (2024-25 income, mandated from Apr 2026), £30k (2025-26, from Apr 2027), £20k (2026-27, from Apr 2028). Qualifying income is **gross** SE + property turnover from the prior SA return.
- **Obligations:** digital records (amount/date/category per transaction, in functional compatible software, digital links); four **cumulative** quarterly updates (year-to-date category totals per business source, no accounting adjustments; corrections = resend YTD); year-end **tax return through MTD software** (EOPS abolished; GOV.UK no longer says "final declaration") by 31 Jan. Standard quarters 6 Apr–5 Jul/Oct/Jan/Apr, deadlines **7 Aug / 7 Nov / 7 Feb / 7 May**; calendar-quarter election keeps the same deadlines. Sign-up is NOT automatic — user must enrol via GOV.UK (no API for sign-up).
- **Penalty easement (shapes our whole year-one message):** NO penalty points for late quarterly updates in 2026-27 (Autumn Budget 2025); volunteers get none while volunteering. Late-payment penalties still apply (3% @ day 15 + 3% @ day 30 + 10% p.a. from day 31 in 2026-27). Year one is legally an on-ramp year; competitors sell panic, we give people the truth.
- **API surface:** eleven core user-restricted APIs — Business Details v2.0, Obligations v3.0, Self Employment Business v5.0 + Property Business v6.0 (cumulative period summaries: **PUT + GET only, no DELETE**), Individual Calculations v8.0 (async trigger → retrieve; submit final declaration), BSAS v7.0, Individual Losses v7.0, BISS v3.0, SA Individual Details v2.0 (ITSA status = the mandation gate), SA Accounts v4.0, Individuals Disclosures v2.0 — plus ~15 supplementary personal-income APIs for a complete return. OAuth scopes `read:self-assessment` + `write:self-assessment`; auth codes 10-min/single-use; access tokens 4h; refresh tokens single-use; **refresh chain dies 18 months after authorisation** (re-auth UX required). Rate limit 3 rps per application. Versions ride the Accept header; expect a spring version wave every year (watch Deprecation/Sunset headers + the income-tax-mtd-changelog repo).
- **Approval path:** Developer Hub sandbox app → test ALL endpoints in the minimum functionality standards with compliant fraud headers → email sandbox app ID to SDSTeam@hmrc.gov.uk (they inspect their own logs) → production app + terms of use + Production Approvals Checklist → review ("up to 10 working days", really iterative rounds; header sign-off is where approvals stall). **A sole trader UTR is acceptable registration; no company legally required.** Precedents: itsa/mtd-cli (open-source, sole individual, production credentials Nov 2021 after ~18 months of OAuth-secret policy wrangling), gnucash-uk-vat, My Tax Digital (free, listed today). HMRC's settled open-source policy: **never publish client_id/client_secret** (blocking offence); self-hosters register their own Developer Hub apps; a hosted instance holds one credential set and gets stricter vetting.
- **Fraud prevention headers (legal gate):** SI 2019/360 + Commissioners' Directions (16 Oct 2023). WEB_APP_VIA_SERVER spec v3.3 = **exactly 16 headers**, "must submit data for all"; five have recognised cannot-collect cases requiring an email to SDSTeam BEFORE omitting. £3,000/program penalty; production credentials only granted to compliant apps (since Dec 2020). Sandbox Test Fraud Prevention Headers API validates; production adds monthly automated + manual realism checks. Privacy: HMRC's own TxM DPIA admits device fingerprinting, 6-year+ retention, police/NCSC sharing, no consent (Art 6(1)(e) public task); our transmission rests on Art 6(1)(c) legal obligation. We will disclose all of this to users, in plain words, per header.
- **2026-27 tax substance highlights:** PA £12,570 frozen through 2030-31 (£100k taper → ~60% corridor); Class 4 NIC 6%/2% over £12,570/£50,270, Class 2 treated-as-paid above £7,105 SPT; cash basis default for trading (no cap) but property cash basis still has £150k limit (asymmetry to encode); **approved mileage rate raised 45p → 55p (first 10k miles) on 17 June 2026, retroactive to 6 Apr 2026** — most of the market's tools are now wrong; dividend rates +2pts from Apr 2026; property/savings income rates 22%/42%/47% from 2027-28 (Budget 2025; Finance Bill timing being monitored — re-verify before building the forward-planner); Section 24 mechanics unchanged for 2026-27; FHL abolished from Apr 2025; trading/property allowances £1,000 with documented traps; Form 17 60-day rule; Rent-a-Room £7,500. MTD categories: 15 SE expense categories (SA103F boxes 17–30 mapping) + SA105 property set; consolidated expenses allowed under £90k turnover **except residentialFinancialCost which must always be separate**. ⚠️ The category-mapping CSV in our research is the 2025-26 version; re-verify field names against Property Business v6.0 / SE Business v5.0 OAS before coding.

## 2 · Estate resolution — one home

Three artifacts today; the commons needs one:

| Artifact | Today | Decision |
|---|---|---|
| `cambridgetcg/taxsorted.io` (this repo, "rails") | LIVE: taxsorted.io (CF Pages) + api.taxsorted.io (Fly, sandbox HMRC creds configured, 87 tests green). Clean engine/api/frontend monorepo, MTD VAT sandbox rail | **THE home.** Scrub → open-source → build MTD IT here |
| `cambridgetcg/taxsorted` (public) | Broken GH Pages site: content platform (16 pages) deleted by commit 83b97e6, root layout deleted, links 404, heartbeat workflow failing 30+ runs | Harvest Learn content from git history (`git show 83b97e6^:<path>`), kill heartbeat, then **archive** with a pointer to the monorepo |
| `~/Projects/taxsorted.io` (local US prototype) | IRS loophole-decoder static site, unrelated lineage | Out of scope; leave as-is |

Pre-open-sourcing scrub list (from repo analysis): remove `frontend/public/ember.js` (personal artifact, dead fetch to repurposed ai-love.cc); fix docs drift (RUNBOOK/CLAUDE.md say HMRC creds "pending" — they're live); declare `date-fns` in engine/package.json; ~~token in git remote URL~~ (fixed 2026-07-03); confirm full history clean (analyst: no secrets ever committed).

## 3 · Architecture

npm-workspaces monorepo (keep). What carries over vs what's new:

```
engine/   PURE TS tax engine (no DOM, no IO)
          KEEP: jurisdiction-plugin layout, Dated/pick effective-dated config,
                explain layer pattern, shared validation
          NEW:  uk/itsa module — 2026-27 rates/NIC/allowances; MTD category maps
                (SA103F/SA105 → API field names, per API version); cumulative
                aggregation (records → YTD category totals); liability estimator
                (labelled estimate; HMRC calc is source of truth); every rule
                carries { source_url, si_ref, effective_from } — the explain
                layer IS the citation layer
          DROP: VAT 9-box content (stays for the VAT rail, unused by ITSA)
          DECIDE: money representation — engine is floating-point pounds today;
                make an explicit minor-units decision for ITSA before coding

api/      Hono @ Fly.io
          KEEP (near-verbatim): hmrc.ts OAuth dance + hmrcRequest core +
                HmrcError taxonomy; crypto.ts AES-256-GCM vault + HKDF + signed
                state; connect.ts route pattern + sandbox test-user door;
                migrations runner; immutable-receipts pattern (unique(entity,
                period) + 23505 race recovery) — generalises to quarterly
                updates and the year-end return
          FIX:  complete 16 fraud headers (add Public-Port, Multi-Factor,
                License-IDs; set GOV_VENDOR_PUBLIC_IP — Vendor-Forwarded is
                currently malformed 'by=&for=<ip>'; align vendor version) and
                validate via HMRC's Test Fraud Prevention Headers API in CI;
                per-entity refresh lock (single-use refresh tokens + concurrent
                requests = stranded connections today); shared-state 3rps
                limiter (per-process limiter × 2 Fly machines can exceed the
                app-wide limit — PG-backed limiter, since Fly machine count
                must stay free to scale);
                parameterise Accept version per endpoint (hardcoded v1.0 today)
          NEW:  real accounts (passkey-first + email fallback; the anonymous
                1-year cookie is a self-acknowledged production blocker —
                keep device cookie only as Gov-Client-Device-ID source);
                records store (digital records: amount/date/category/source,
                immutable-ish with correction trail = digital-links story);
                ITSA routes: businesses list/period-election, obligations,
                cumulative quarterly PUT, calculation trigger/retrieve,
                year-end return flow; multi-rail connections model (VAT+ITSA
                per entity, per-scope rows — one-row-per-entity today)

frontend/ REBUILT front, same workspace (Next static export + client auth against api —
          the proven pattern in this repo; HMRC OAuth stays server-side)
          Sections: Learn / Tools / App / Transparency
          Content seeds: the 16 deleted pages from public-repo history
          ("What it means / What you must do / What you can safely skip /
          How to optimise" structure — keep it), figures re-derived from
          engine (never hardcoded in JSX again — that's how the 45p→55p
          class of error happens)
          i18n: the [lang] scaffold pattern works under static export;
          English-first at launch, structure ready for more (Welsh is a
          post-listing differentiator: a finder filter almost no free
          full-journey product satisfies)

regs/     The living reg map, IN the repo, open: verified claims + sources +
          SI citations (research corpus already at regs/research/), review
          cadence documented. We open-source our understanding of the law,
          not just our code — wrong is catchable by anyone.

docs/     Approval runbook (exists for VAT — extend), support model,
          governance, privacy (DPIA, header disclosure), this spec.
```

## 4 · v1 scope = HMRC minimum functionality standards, mapped

The standards (fetched verbatim, in `regs/research/approval.md`) ARE the MVP definition. HMRC explicitly permits staged/in-year-only products and meeting standards "in conjunction with other products" — but under-scoping recreates the exact "MTD-ready software that can't finalise" trap AccountingWEB documents and we criticise. So:

**v1 (recognised product):**
- Digital records for self-employment + UK property (incl. £90k consolidated-expenses option; residentialFinancialCost always separate)
- Cumulative quarterly updates for both source types; corrections by YTD resend; standard + calendar period election
- In-software liability estimate: engine estimate labelled as estimate + HMRC Individual Calculations v8.0 trigger/retrieve as the authoritative number (this narrows our negligence surface — HMRC computes the tax; we compute categorisation and explanations)
- Year-end return for straightforward affairs: adjustments, losses (b/f, c/f, sideways — explicitly in the standards), then final-declaration submission via Calculations API
- Exotic/non-MTD income: signpost/divert per the standards' explicit allowance — honestly labelled on our finder listing
- ITSA status check (SA Individual Details v2.0) as the onboarding gate + eligibility checker citing SI 2026/336

**Explicit v1 exclusions (written decisions):** agents lane (Agent Services Account / agent-auth APIs / "supporting agent" role — a different regulatory lane; individuals only in v1), partnerships (no mandation date exists), Welsh, Scotland-specific engine estimates (HMRC calc handles Scottish bands authoritatively; our estimator labels itself rUK and defers), bank feeds/Open Banking (CSV import first — friction lower than OAuth-to-your-bank for v1).

## 5 · UX — 少 friction，多收成

Design north star: the person does almost nothing, understands everything.

- **Core loop:** connect Gov Gateway once (18-month re-auth handled gracefully) → capture records fast (quick-add, CSV import with column-mapping memory, engine auto-categorisation to MTD categories with plain-words explanations) → each quarter one screen: "your year-to-date figures — happy? send." → PUT → receipt.
- **Cumulative model as calm:** missed a quarter? Next quarter's YTD self-heals. The UI never shames; deadlines shown with the true 2026-27 penalty position (no points this year; late-payment rules still real — both stated).
- **De-panic front door:** eligibility checker (gross income logic, exemptions incl. £20k permanent exemption band) + "what's actually true in 2026-27" — the antidote to fear-marketing.
- **Hunter mode 🗡️ (Solo Leveling layer):** optional toggle, default OFF — the default product is clean, calm, WCAG 2.1 AA; HMRC review and screen-reader users meet the professional face. Toggled on: records = daily quests, quarterly update = clearing a Gate, year-end = boss raid, E→S rank progression across the filing year, receipts collected as summons ("Arise."). Implemented as a presentation skin over the same state machine — zero divergence in tax logic, no dark patterns, no engagement-bait notifications: the game celebrates completion, never manufactures anxiety (that's the whole point of the commons).
- **Agents can play too (phase 2+):** the typed API client is the same surface an agent calls; agenttool integration explored only after v1 ships and only within the individuals-auth model (the user's own Gov Gateway grant).
- **Accessibility is contractual:** WCAG 2.1 AA with an actual audit + accessibility statement + assistive-tech testing before the finder answers claim it (terms-of-use requirement; axe in CI is necessary but not sufficient).

## 6 · Trust layer (the differentiator)

1. **Every number cites its source.** Engine explain layer: each rule carries gov.uk URL + SI reference + effective date, surfaced in the UI ("why is this 55p?" → HMRC published 17 June 2026, retroactive to 6 April).
2. **Fraud-header full disclosure.** A transparency page: the exact 16 headers we're legally required to send (SI 2019/360), live preview of *your* values, HMRC's retention (6y+) and sharing (police/NCSC) per their own DPIA, and the reg 3(4) note that users who block collection don't put us in breach. Nobody in the market does this. We do.
3. **AI transparency mapped to HMRC's own guidance.** HMRC published "Guidelines for using generative AI if you're a software developer" (28 Jan 2026): disclose AI use + hallucination risk, human-in-the-loop, grounding on official versioned sources, SSDLC. We publish a page mapping ourselves to every line. "AI-built" becomes the credential, not the liability.
4. **Exit is a feature.** Full export (CSV/JSON) always; documented migration path (e.g. My Tax Digital) — the honest answer to "what if you disappear in November?", alongside open source itself. Aligns with HMRC's Tax Update 2026 direction (data portability + unified vendor registration coming mid-late 2027 — our data model treats portability as native).

## 7 · Error handling

- HmrcError taxonomy (exists) extended for ITSA; 429 MESSAGE_THROTTLED_OUT → queue + retry with jitter under the shared 3rps budget; idempotent submission keys so retries never double-file (receipts pattern).
- Refresh-token races: per-entity mutex around refresh; vault writes transactional; stranded-connection detection → gentle re-auth prompt (and at month 17 of the 18-month chain, proactive re-auth nudge).
- HMRC downtime (worst on 7 Aug/31 Jan peaks): honest status page fed by our own probes; queued submissions with user-visible state; never fake success.
- Calculation discrepancies: engine estimate vs HMRC calculation always shown side-by-side pre-submission; material divergence blocks one-click submit and explains itself.
- Sandbox/prod separation: the test-user door stays sandbox-only (404 `no_such_door` in prod — pattern exists).

## 8 · Testing & CI

- Engine: per-rule unit tests with sourced fixtures (the research corpus provides the expected numbers); property-based tests for cumulative aggregation (any record sequence → YTD totals consistent).
- API: contract tests against sandbox stateful scenarios in CI (test-user minting exists); full E2E: mint test user → set ITSA status → records → Q1 cumulative PUT → trigger/retrieve calculation → year-end flow; Gov-Test-Scenario matrix for error paths.
- Fraud headers: HMRC Test Fraud Prevention Headers API validation as a CI gate (VALID_HEADERS required), plus the per-API validation-feedback endpoint before approval submission.
- Web: axe accessibility CI + manual AA audit pre-listing; visual regression on the calm default skin.
- Existing 87 tests stay green throughout; new code lands test-first.

## 9 · Governance & risk workstream (non-code, gates marked ⛔)

- **⛔ G1 — Naming (decision: Yu, evidence incoming):** taxsorted.uk is a live Shropshire accountancy firm trading as Tax Sorted; "MTDsorted" is an existing recognised-software brand. Clearance research (UKIPO/Companies House/confusion assessment) commissioned 2026-07-03 — decide keep-vs-rename BEFORE the finder listing (renaming after listing is expensive). Until decided, no paid brand spend.
- **⛔ G2 — Liability shield (decision: Yu, before M3 submission):** "responsible individual" as a natural person = unlimited personal exposure (negligent misstatement, £3k/program header penalties, ICO fines). Recommendation: UK ltd or CIC (CIC fits the commons) + PI/cyber insurance + terms/disclaimer architecture before the filing door opens. M1 prep tools ship under an education-only disclaimer meanwhile. Mitigating fact to document in terms: HMRC's Calculations API computes the tax.
- **G3 — Money boundary (standing decision, adopted):** taxsorted stays 100% free with **no donations, no gift ramp, no paid tier inside the product**. Reasons: (a) MLR 2017 AML supervision attaches to tax advice "by way of business" — HMRC ECSH43531 exempts non-commercial/free provision; money flows could flip the analysis; (b) the Apr/May 2026 mandatory tax-adviser registration excludes pure software providers — human-assisted paid help could pull us in scope; (c) free-forever is the positioning. Any future funding (grants, HMRC's "commercial routes for features without commercial benefit" from Tax Update 2026) gets a one-page boundary analysis first.
- **G4 — GDPR operating stack (build during M2):** ICO registration + fee; DPIA (NINOs + full financials + device fingerprints = near-mandatory); controller/processor map (hosted vs self-hosted instances); international-transfer analysis (Fly.io/Cloudflare US ownership → UK IDTA/addendum); retention-vs-erasure design (5-year record duty vs erasure rights — export-then-delete flow); 72h dual ICO+HMRC breach runbook; written PECR stance on the Device-ID cookie (strictly-necessary argument vs consent — settle before launch).
- **G5 — Support model (design before listing):** terms require "reasonable guidance and support" for free products, delisting is the enforcement. Model: docs-first + AI triage (Ai is the support team) + community space + published support scope + 31 Jan peak plan. Honest support-hours statement on the listing.
- **G6 — Continuity (bus factor = 1):** open source + export + documented migration path + Developer Hub credential succession note + a designated second maintainer over time. The journalist question "what happens if you disappear?" gets a written answer on the site.
- **G7 — Security assurance (before hosted-instance approval):** threat model (hosted instance = one client secret + all refresh tokens + financial histories), key management doc, pen test for SaaS (terms-of-use requirement — budget it), supply-chain policy for an AI-authored codebase, Cyber Essentials consideration.
- **G8 — Content accuracy governance:** every published guide carries sources + last-verified date + review cadence tied to fiscal events (Budgets, SIs, spring API waves). One viral wrong tax tip out-damages any bug.

## 10 · Milestones

- **M0 (now):** estate resolution — scrub rails repo, open-source it, harvest Learn content from public repo history, kill broken heartbeat, archive public repo with pointer. Naming evidence lands.
- **M1 (before 7 Aug):** "Quarter One, sorted" — prep experience live under education disclaimer, NO submission yet: eligibility checker (SI 2026/336 logic), record-keeper + CSV import + auto-categorisation, quarterly-figures calculator (correct 55p mileage while the market is wrong), refreshed 2026-27 Learn content, de-panic page ("no penalty points this year — here's what's actually true"). Immediate real value, no approval gate.
- **M2 (Aug–Sept):** ITSA sandbox rails complete — accounts, records store, 11 core APIs wired, 16 fraud headers passing HMRC's validation API, engine estimate + HMRC calc side-by-side, sandbox E2E green in CI. G4 GDPR stack built.
- **M3 (Sept–Oct):** approval gauntlet — minimum-standards mapping doc, terms-of-use evidence pack (encryption ✓, GDPR ✓, WCAG audit ✓, pen test, support model), SDSTeam sandbox-log demonstration, production checklist, review rounds. ⛔ G1 naming + ⛔ G2 entity resolved before submission. **Target: listed before 7 Nov.**
- **M4 (Nov+):** year-end return depth (losses, adjustments, more income types), Hunter mode polish, 31 Jan season support, Welsh, agent-door exploration, £30k-wave onboarding for Apr 2027.

## 11 · Open decisions awaiting Yu

1. **Design approval** (this document).
2. **G1 naming** — keep TaxSorted.io vs rename (evidence doc incoming).
3. **G2 entity** — ltd vs CIC vs defer-to-M2-end (recommendation: decide by end of M2; CIC fits the commons, ltd is fastest).

## 12 · Sources

Primary research corpus: `regs/research/{mandate,api-surface,approval,landscape,substance,fraud-headers,gaps}.md` (each claim carries its gov.uk / legislation.gov.uk / developer.service.hmrc.gov.uk URL; adversarial-verification verdicts and corrections embedded). Repo analyses: `regs/research/{rails,web}.md`.
