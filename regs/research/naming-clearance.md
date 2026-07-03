# "TaxSorted" naming clearance — research notes
Date of research: 2026-07-03
Product context: free, open-source UK tax software commons at taxsorted.io — MTD for Income Tax filing software for UK sole traders and landlords.

---

## 1. UKIPO trademark register

Method note: trademarks.ipo.gov.uk is behind a Cloudflare/"Service Captcha" block (403 to curl AND to WebFetch). Searched instead via **TMView** (www.tmdn.org/tmview/api/search/results) — the official EUIPO-network database fed directly by UKIPO. The MTDsorted record showed `officeLastUpdateDate: 2026-07-03`, i.e. data current as of today. Confidence in results: high, though a paranoid final check on the UKIPO site by hand (human + browser) is cheap and recommended before any commitment.

### Searches run (office = GB unless noted)
| Query | Results |
|---|---|
| "taxsorted" (GB) | **0** |
| "taxsorted" (all offices worldwide) | **0** |
| "tax sorted" (GB) | **0** |
| "tax-sorted" (GB) | **0** |
| "mtdsorted" / "mtd sorted" (GB) | **1 — registered** |
| "sorted" (GB, classes 9/36/42, live) | 51 live marks |

### The MTDsorted registration (the key blocking mark)
- **Mark:** MTDsorted (word mark, individual)
- **Number:** UK00003882443 (application = registration number)
- **Owner:** MTDsorted Ltd
- **Filed:** 2023-02-26 · **Registered:** 2023-05-19 · **Expires:** 2033-02-26
- **Classes:** 9, 35, 42
- **Class 9 spec includes:** "Software; … **Accounting software**; … **Tax preparation software**; **Financial management software**; Cloud computing software; Reporting software; Platform software…"
- **Class 35 spec includes:** "Bookkeeping; Accounting; **Tax preparation**; **Preparation of income tax returns**; **Tax filing services**; Tax planning [accountancy]; Business management for freelance service providers…"
- **Class 42 spec includes:** software development, design, hosting of web portals, maintenance, programming (spec truncated in fetch but clearly full software-dev/SaaS coverage).

This spec is a direct hit on our product category: class 9 "tax preparation software" + class 42 SaaS, in the exact same HMRC MTD market.

### No mark found for TaxSorted / Tax Sorted in any form, any office. Nothing in class 36 either.

### The "sorted" crowd (context for distinctiveness)
51 live GB marks containing "sorted" in classes 9/36/42, including:
- SORTED — Sorted Holdings Ltd (delivery software), cl 9/35/39/42 (two registrations + SORTED PRO, SORTED HERO, SortedREACT)
- SORTED — B&Q Ltd, cl 35/40/41/42; SORTED — Telegraph Media (filed 2026), cl 9/16/28/41/42
- JOBSORTED / JOBSORTED.COM — Screwfix, cl 35/38/41/42
- CLAIMSORTED — ClaimSorted Inc, cl 35/36
- WebSorted — cl 42; Surveyor Sorted — cl 36/42; Sorted Insurance (x3, Neilson Financial) — cl 35/36; All Sorted Financial Planning — cl 36; Sorteduk (filed) — cl 35/42/45; spacesorted — cl 35/37/42/45; inbay sorted i.t. — cl 9/35/37/38/42
- Takeaway: "-sorted" is a common, weakly distinctive formative on the UK register; many X-SORTED marks coexist across classes 9/36/42. This cuts BOTH ways: it weakens MTDsorted's ability to monopolise "-sorted", and it weakens any distinctiveness we'd claim in "TaxSorted" (where "Tax" is purely descriptive and "sorted" is laudatory).

---

## 2. Companies House

| Company | No. | Status | Notes |
|---|---|---|---|
| **TAX-SORTED LTD** | 05419622 | **Active** (inc. 9 Apr 2005) | SIC **69201 Accounting and auditing**. Reg office 86-90 Paul St, London EC2A 4NE (a mass-registration address; moved from Cardiff Jun 2024, originally Basingstoke-linked). Director/PSC Shaun McGuinness (per Endole). Website tax-sorted.biz — **currently returns HTTP 500** (dead/broken). Confirmation statement **overdue** (due 23 Apr 2026). Small practice, low visibility. |
| **MABI VF LTD** (t/a **TaxSorted**) | 16989125 | **Active** (inc. **26 Jan 2026**) | Ellesmere Port CH66 1ST. SIC codes are all **software**: 26200 computer manufacture, **62012 software development**, 62020 IT consultancy, 62090 other IT services — odd for what presents as a CIS tax-refund firm. Runs taxsorted.co.uk. |
| MY TAX SORTED LTD | 12243385 | Dissolved 2021 | — |
| TAX-SORTED LLP | OC330456 | Dissolved 2011 | Basingstoke; same family as Tax-Sorted Ltd. |
| ACCOUNTS & TAX SORTED LTD | 15302607 | Active (inc. 2023) | Witney, Oxfordshire accountancy. |

No company named exactly "TAXSORTED" (one word). Name "TAX SORTED LTD" appears available at Companies House but is confusingly close to Tax-Sorted Ltd.

---

## 3. The briefed collision: taxsorted.uk "Shropshire accountancy firm"

**Status: the firm's web presence is GONE; the domain has lapsed entirely.**

- Nominet WHOIS (2026-07-03): `No match for "taxsorted.uk". This domain name has not been registered.` — i.e. it was registered, expired, and dropped. DNS: no A/MX/NS records. Direct fetch fails (ENOTFOUND).
- Wayback Machine, snapshot 2024-09-05 (last good capture): "**TaxSorted | Shropshire Accountants**" — a Wix site. General accountancy: "Personal Tax, business tax, Accountancy… bookkeeping and payroll to tax planning and compliance… Xero Partner… WhatsApp support… 10 years + Experience". Contact hello@taxsorted.uk, WhatsApp 07822011025. "© 2023 by TaxSorted."
- So yes, they served the same broad market (individuals + small business tax returns), BUT: no matching Companies House entity found (likely an unincorporated sole practitioner), and the brand's only visible embodiment (the domain/site) has been abandoned. Google still returns stale index entries for taxsorted.uk pages — the links are dead.
- Residual risk: if the practitioner still trades offline under "Tax Sorted" in Shropshire, they retain some local goodwill. But abandonment of the domain suggests closure or rebrand. **This is no longer the main collision.**

### The REAL live collision: taxsorted.co.uk (new, Feb 2026)
- **taxsorted.co.uk** registered **09-Feb-2026** via Namecheap (Nominet: registrant name/address failed 3rd-party validation on 09-Feb-2026 — a small yellow flag).
- Live site: "**TaxSorted**", operated by **MABI VF LTD t/a TaxSorted**, Unit C1a, Poole Hall Road Industrial Estate, Ellesmere Port CH66 1ST. Also claims "ACCA-qualified accountants based in Huddersfield, handling CIS returns for over 25 years" (inconsistent with a Jan-2026 company — presumably the people, not the entity).
- **Services:** CIS (Construction Industry Scheme) tax-refund returns for subcontractors; Self Assessment submission; 10% of refund capped at £350; 48-hour turnaround; WhatsApp intake.
- **Market overlap with us:** CIS subcontractors ARE sole traders filing Self Assessment — squarely inside our target audience. They are a service (done-for-you returns), we are software (do-it-yourself filing), but to HMRC-confused consumers "TaxSorted" the software and "TaxSorted" the refund firm are the same name in the same aisle.
- Their goodwill in the name is ~5 months old. Neither side has meaningful priority; this is two newborns with the same name.

### Other domains
- **taxsorted.com** — registered 2008, expires 2028 (Alpine Domains), DNS resolves to AWS ca-central-1 but connection fails — parked/dead, held by an unknown third party. Not acquirable for free; not currently a trading brand.
- **taxsorted.io** — resolves via Cloudflare (our project).
- **taxsorters.co.uk** — "Taxsorters", a live Cheshire/North Wales tax & accounting firm. Another near-name in the field.

---

## 4. MTDsorted — verified

- **Real and active in 2026.** mtdsorted.co.uk, footer "© 2026 MTDsorted", changelog + new-feature badges. "Trusted by 23,922 businesses globally."
- **Company:** MTDSORTED LTD, 12564262, active, inc. 20 Apr 2020, Swindon SN4 9AB.
- **Trademark:** footer states "MTDsorted® is a registered trademark of MTDsorted Ltd" — matches UK00003882443 found on the register.
- **HMRC recognition:** their blog announces HMRC recognition; they appear on HMRC's MTD VAT compatible-software ecosystem, free VAT filing tier ("Submit your VAT return for free, forever"). Their site advertises **Self Assessment / MTD for Income Tax quarterly updates for "self-employed businesses and landlords managing UK properties"** — i.e., our exact market. (Note: HMRC's gov.uk MTD-IT guidance page and the third-party mtd.digital 2026 ITSA list did not name MTDsorted among ITSA-listed vendors — the gov.uk static table was removed 31-Jul-2025 in favour of an interactive finder, which couldn't be walked non-interactively. Their ITSA listing status is unconfirmed; their VAT recognition and intent to serve MTD IT is confirmed.)

### Confusion assessment: TaxSorted vs MTDsorted
- Same naming formula: [tax-domain term] + "sorted", one word, camel-case, same market (HMRC MTD software for sole traders/landlords), both with free offerings, both would surface in the same HMRC software-choice journeys.
- Points reducing confusion: "MTD" ≠ "Tax" visually/aurally at the (more important) start of the mark; "-sorted" is a crowded, weakly distinctive element (51 live marks); consumers choosing filing software exercise moderate care.
- Points increasing risk: MTDsorted's class 9 spec literally covers "tax preparation software" — the goods are IDENTICAL, so under s.10(2) TMA 1994 only moderate mark-similarity is needed for arguable infringement; conceptual similarity is high ("your MTD sorted" vs "your tax sorted" — near-synonymous in this market since MTD IT *is* the tax filing regime).
- Realistic read: a tribunal could well find no likelihood of confusion given the crowded "-sorted" field and the different first elements — but **MTDsorted has a registered word mark, a ® habit, and a directly overlapping spec, so a cease-and-desist letter is a live possibility**, and defending even a weak claim costs money an open-source commons doesn't have. This — not the accountants — is the biggest single legal risk to the name.

---

## 5. Passing-off risk (England & Wales, no registered "TaxSorted" mark exists)

Elements (Reckitt & Colman v Borden): claimant's goodwill, misrepresentation, damage.

**(a) From the ex-Shropshire firm (taxsorted.uk):** goodwill likely abandoned or residual-local only; domain dropped; no CH entity found. **Risk: very low.**

**(b) From MABI VF LTD / taxsorted.co.uk:** goodwill only since ~Feb 2026 and in a niche (CIS refunds), so a passing-off claim against us TODAY would be weak — minimal goodwill, arguably different field (software vs done-for-you service), and damage hard to show against a free product. **Risk today: low.** BUT this is a two-way time bomb: identical name, overlapping audience (sole traders / Self Assessment), both growing. In 1–2 years either side could plausibly sue the other; support-email misdirection, review contamination, and HMRC-listing confusion are near-certain operationally even if never litigated. Their software SIC codes hint they may build tooling too.

**(c) From Tax-Sorted Ltd (2005):** 20 years nominally trading as "Tax-Sorted" in accountancy — on paper the strongest goodwill in the name — but a tiny practice, hyphenated form, currently broken website and overdue filings; software vs accountancy-services gap helps us. **Risk: low, non-zero.**

**(d) Our own exposure as defendant vs our own protectability:** "TaxSorted" is descriptive (Tax) + laudatory (sorted); weakly distinctive. Hard for anyone to monopolise — including us. We'd have limited ability to stop copycats, and limited exposure to all but the MTDsorted registered-mark angle.

---

## 6. Bottom line

### (a) Keep TaxSorted.io
**Overall risk: MODERATE — usable but permanently encumbered.**
- Registered-mark risk (MTDsorted, cl 9 "tax preparation software"): the one real legal risk. Arguable s.10(2) claim; probably survivable given crowded "-sorted" register, but a C&D would be disruptive and defence costs real. Rating: low-moderate probability of a complaint, low probability of losing, non-trivial cost either way.
- Passing-off risk: low today, but guaranteed brand-noise with taxsorted.co.uk (live, same name, same audience) growing over time; plus stale Shropshire associations and a dead taxsorted.com held by a stranger.
- Mitigations if keeping:
  1. **File a UK trade mark application for "TaxSorted" (classes 9 + 42, maybe 35) immediately.** ~£170 + £50/class. Doubles as a clearance stress-test: UKIPO's search report will notify owners of similar earlier marks (MTDsorted would likely be notified) — if it registers unopposed, our position hardens enormously; if opposed, we learn cheaply and early.
  2. **Register taxsorted.uk now** (it is FREE at Nominet as of today — genuinely useful defensive grab; also kills the stale-Shropshire association by controlling where those old links point). Skip .co.uk (taken by MABI VF).
  3. Prominent non-association note on the site/footer: "TaxSorted.io is a free open-source software project. Not associated with taxsorted.co.uk (CIS refund services) or Tax-Sorted Ltd."
  4. Keep "MTD" out of taglines/subtitles adjacent to the brand name; always present as "TaxSorted.io" with the .io to maximise distance from MTDsorted and taxsorted.co.uk.
  5. Never use ® (we have no registration yet); ™ is fine.

### (b) Rename
**Overall risk: near-zero legal; cost = one rebrand, cheapest right now (pre-traction).**
- If the project has not yet shipped to real users, renaming eliminates: a registered-mark holder one shelf over on HMRC's software list, a same-name live tax firm 5 months old and growing, a name that is inherently weak (descriptive+laudatory) and unownable, and a .com/.co.uk we can never have.
- A rename to something distinctive (coined/arbitrary word) would also give the commons a mark it can actually protect and a clean domain set.

### Honest recommendation
**If pre-launch or early: rename.** The decisive facts are (1) MTDsorted® — a registered UK word mark covering "tax preparation software" in the identical HMRC MTD market, sharing the "-sorted" formula — and (2) taxsorted.co.uk, a live, brand-new "TaxSorted" tax-returns business in the same audience that guarantees compounding confusion. The name was never going to be ownable anyway.
**If already committed with real users:** keeping is defensible — file the TM application now as a stress-test, grab taxsorted.uk today while it's free, add the non-association note, and budget for the possibility of an MTDsorted letter.

---

## Appendix: verification log
- TMView API (tmdn.org) POST /tmview/api/search/results — queries: taxsorted (GB + worldwide), "tax sorted", "tax-sorted", mtdsorted, "mtd sorted", broad "sorted" cl 9/36/42. UKIPO data freshness stamp 2026-07-03.
- TMView detail API /tmview/api/trademark/detail/GB500000003882443 — full MTDsorted spec captured (files: mtdsorted-tmview.json in this dir).
- UKIPO trademarks.ipo.gov.uk — 403 "Service Captcha" to curl and WebFetch; not directly searched (mitigate: one manual browser search before final decision).
- Companies House search + company pages: 05419622, 16989125, 12564262, 15302607, OC330456, 12243385.
- Nominet WHOIS via whois.nic.uk: taxsorted.uk (unregistered), taxsorted.co.uk (reg 2026-02-09, Namecheap, validation-failed flag).
- DNS: taxsorted.uk dead; taxsorted.co.uk live (DigitalOcean); taxsorted.com registered-2008/parked-dead (AWS, conn refused); tax-sorted.biz HTTP 500.
- Wayback: taxsorted.uk snapshot 2024-09-05 (Shropshire accountants, full text captured); taxsorted.co.uk earliest snapshot 2021-12-26 (prior unrelated use).
- Live sites fetched: taxsorted.co.uk (MABI VF, CIS refunds), mtdsorted.co.uk (active 2026, ® notice, MTD IT for sole traders/landlords).
- HMRC: gov.uk MTD-IT software guidance (static list removed 2025-07-31, replaced by interactive finder — not walkable non-interactively); mtd.digital 2026 ITSA list (no MTDsorted, no TaxSorted).
