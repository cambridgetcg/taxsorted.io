# How software becomes HMRC "recognised" for MTD Income Tax — the regulatory gauntlet

Research notes for TaxSorted. Date of research: 2026-07-02.
All claims carry the URL actually fetched. Where a source could not be fetched directly (blocked), this is flagged.

---

## 1. The step-by-step process: Developer Hub → sandbox → demonstrate → production credentials → Software Choices

Primary source: HMRC MTD IT end-to-end service guide, "How to integrate with HMRC APIs"
https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html (fetched 2026-07-02)

The documented developer journey:

1. **Register on the HMRC Developer Hub** and create a **Sandbox application**; create test users (individuals) to generate test data.
2. **Develop against the sandbox**, reviewing API documentation and the end-to-end service guide. Queries during this phase go to **SDSTeam@hmrc.gov.uk** (Software Developer Support Team).
3. **Sandbox testing** — HMRC "requires software providers to test all the API endpoints to which they need access." For APIs in the minimum functionality standards you must "test all endpoints shown within the documentation"; for other APIs, only "endpoints relating to the data sources that your software supports." Testing must include fraud prevention headers on every call, and exercise various user IDs, devices, browsers and screen sizes. Note: sandbox data is retained only **7 days** before automatic deletion.
4. **Send evidence to HMRC**: email the Sandbox application ID and testing credentials to SDSTeam@hmrc.gov.uk "as soon as you have completed your API testing to enable us to view the data within our logs." HMRC's specialist team reviews the fraud-prevention-header implementation from its own server logs (you don't send them logs; they look at theirs).
5. **Create a Production application** in the Developer Hub and subscribe it to the relevant APIs. New production applications "must comply with the terms of use before HMRC can issue you with Production credentials."
6. **Production Approvals Checklist** — HMRC issues a checklist asking for details about your software; you complete and return it to SDST. If you build iteratively (see §2), you complete the checklist **for each stage** you build.
7. **HMRC review** — HMRC checks: (a) satisfactory testing of all relevant APIs/endpoints, (b) compliant fraud prevention headers in **all** calls, (c) that the completed checklist matches the testing evidence in their logs. "If satisfactory, you will be granted Production access to the requested APIs; if not satisfactory, HMRC will contact you to advise what action is required."

### Stated timescale
The Developer Hub "Getting started" page states, on applying for production credentials: **"We'll check your application, which takes up to 10 working days."**
https://developer.service.hmrc.gov.uk/api-documentation/docs/using-the-hub (fetched 2026-07-02)

The MTD IT service guide itself gives no end-to-end timescale for the full approval pipeline. HMRC's SDST support target is to "respond to queries that are not resolved at the point of contact within 2 days, and to provide further updates, if required, every 2 working days" (how-to-integrate.html).

### Real-world accounts (timescales in practice)
- **AccountingWEB thread "MTD for Income Tax – A developer's Perspective"** (https://www.accountingweb.co.uk/any-answers/mtd-for-income-tax-a-developers-perspective — page itself blocked by Cloudflare, not in Wayback; details below come from search-result excerpts, so treat as LOW-MEDIUM confidence): a developer reported getting production credentials for the quarterly-update API "a few weeks" after applying but was still waiting on other APIs; another reported a ~4-week wait; fraud-header approval took "about a month later than expected" because issues did **not** show up in the self-test API, and each round-trip between SDST and the separate fraud-prevention team took several days; one rejection was because test submissions carried a Multi-Factor Authentication timestamp older than 3 months, a rule "nowhere in the requirements"; the 2-working-day SDST response target was described as "farcical"; complaint that the pipeline "has no concept of proportionality" (quarterly-update apps vetted with the same rigour as payment-handling apps).
- **Open-source precedent (ac000/libmtdac, HIGH confidence, fetched via GitHub API 2026-07-02)**: a sole developer started the production-credentials process for the ITSA API on 2021-03-10 and received credentials on **2021-11-19 — roughly 8 months**, almost all of it consumed by HMRC internal policy deliberation about open source (full detail in §5). Includes a **live demo/walkthrough call with HMRC** as part of the process.
  https://github.com/ac000/libmtdac/discussions/18

### Getting onto "Software Choices" / the find-software page
- "Only products that meet the minimum functionality standards, either individually or in conjunction with other pieces of software, are featured on the Software Choices page." — https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/prepare-for-mtd.html (fetched 2026-07-02)
- The public catalogue is at https://www.tax.service.gov.uk/find-making-tax-digital-income-tax-software/ (a filter-flow tool, entry page fetched 2026-07-02; per-product pages are directly fetchable, e.g. productId=3255).
- Product listings display, per product: free version (yes/no), "creates digital records" vs "connects to your records (bridging)", agent vs individual support, income sources covered with **"Ready now" vs "In development"** status per feature, update-period support (6 Apr–5 Apr and 1 Apr–31 Mar), HMRC Assist (Submission Feedback) support, platform/browser details, language, and a link to the vendor's **accessibility statement**. Example: https://www.tax.service.gov.uk/find-making-tax-digital-income-tax-software/product-details?productId=3255 (My Tax Digital (Free), fetched 2026-07-02)
- I could NOT find a published vendor-facing form/process for submitting listing information; the product details appear to be collected via the Production Approvals Checklist / SDST correspondence (inference — LOW confidence; the vendor-roadmap microsite at developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/mfs.html now returns 404).
- HMRC terminology gate: vendors may describe software only as **"HMRC recognised"** — not "approved", "accredited" or "endorsed" (terms of use, §3). Secondary sources echo: "HMRC does not 'approve' or endorse any specific product… it is not a quality rating" (https://mtd.digital/mtd-income-tax/hmrc-recognised-mtd-software-list/, fetched 2026-07-02).

---

## 2. Minimum functionality standards (MFS) for MTD IT software

Primary source: how-to-integrate.html §"Minimum functionality standards" (fetched 2026-07-02). The former standalone MFS page (roadmaps/mtd-itsa-vendors-roadmap/mfs.html) is 404 — the MFS now lives inside the service guide.

Software must facilitate the complete end-to-end customer journey **"either individually or through a number of products collectively meeting the below functionalities"**:

1. Provide HMRC with transaction-monitoring **fraud prevention header** data.
2. Obtain the **business ID** unique to each customer business (Business Details API).
3. **Create and maintain all digital records** required by law in digital form — or **digitally link** to products that do. "End users should own and have access to all their records."
4. **Submit quarterly update information** for each mandated business income source (self-employment including multiple self-employments, UK property, foreign property).
5. Allow customers to **view an estimate of their income tax liability** — either by signposting to their HMRC account or displaying in-software; if in-software, "the estimate must be presented with a disclaimer as to its accuracy."
6. Make required **adjustments and finalise business income** (end of year).
7. Handle **business losses** (brought forward, carried forward, set sideways where permitted).
8. Submit **non-mandated income sources** or redirect customers to compatible software that can.
9. Make the **final declaration** — or redirect the customer to software where they can.

**Key structural point: a single product does NOT have to do everything.** HMRC explicitly allows:
- **Full end-to-end product** (two build stages):
  - In-year stage APIs: Business Details (MTD), Obligations (MTD), Self Employment Business (MTD) and/or Property Business (MTD), Individual Calculations (MTD) (if displaying the calculation in-software).
  - End-of-year stage APIs: Business Details, Self Employment/Property Business, Business Source Adjustable Summary (BSAS), Individual Losses, Individuals Tax Liability Adjustments, Obligations, Individual Calculations.
- **In-year only product** (quarterly updates): Business Details, Obligations, Self Employment and/or Property Business, Individual Calculations (if displaying calc).
- **End-of-year only product**: the end-of-year API set above.
- Iterative building is allowed: "test the relevant APIs and complete the Production Approvals Checklist for the stage you are building."

**Bridging is allowed for MTD IT** (unlike a records-and-submission monolith requirement):
- Service guide overview: "Customers who choose to use bridging software must digitally link it to their record-keeping software." https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/index.html (fetched 2026-07-02)
- GOV.UK "Choose the right software" (last updated **8 May 2026**): two categories — software that creates records, and bridging software that "connects to existing records kept in spreadsheets or other accounting tools"; some bridging products can "send quarterly updates" and "submit your tax return." https://www.gov.uk/guidance/choose-the-right-software-for-making-tax-digital-for-income-tax (fetched 2026-07-02)

**Free-to-use software expectations** (service guide overview, index.html, fetched 2026-07-02) — HMRC expects free software aimed at businesses with straightforward affairs to:
- "have a reasonable level of guidance",
- "have help and support to users",
- be free for the business to use to comply with their MTD obligations for a **complete annual cycle**;
- it need **not** cover VAT, Corporation Tax or PAYE, and need not integrate with agent products.

**Tax calculation disclaimer**: any in-year or intent-to-finalise calculation shown in-software must carry an accuracy disclaimer (how-to-integrate.html).

---

## 3. Terms of use for production credentials

Primary source: https://developer.service.hmrc.gov.uk/api-documentation/docs/terms-of-use (fetched twice 2026-07-02 with different extraction prompts).

What a vendor commits to:

**Organisation identity**
- Evidence that "your organisation is officially registered": for UK entities — Unique Taxpayer Reference (UTR), VAT registration number, PAYE reference, Corporation Tax UTR, or Companies House registration number. (Non-UK: equivalent national registration.)
- Implication for TaxSorted: a **sole trader with a UTR satisfies this on its face** — the terms do not say "limited company". An anonymous/unregistered collective would fail. Interpretation is mine (MEDIUM confidence); the requirement list itself is HIGH confidence. Precedent in §5 confirms an individual can get production credentials.
- A named **"responsible individual"** must be designated who will "ensure your software conforms to the terms of use" and "understand the consequences of not conforming to the terms of use."

**Security**
- Encrypt OAuth access tokens and personally identifiable data **at rest and in transit**.
- Role-based access control; "each customer's data cannot be accessed by unauthorised users"; employees see only data essential to their role.
- Do **not** store HMRC sign-in details — OAuth 2.0 only.
- SaaS providers: **penetration testing** is expected.
- Provide "a way for your customers or third parties to tell you about a security risk or incident."

**Data protection**
- Comply with **UK GDPR**: lawful basis, transparent processing notices, and customers must be able to "change, export or delete their data if they want to."
- **Incident reporting: report security/personal-data incidents to HMRC within 72 hours** (by logging a ticket) and notify the **ICO** for personal-data breaches; publish breach contact info.

**Accessibility**
- "Web-based software must meet **level AA of the Web Content Accessibility Guidelines (WCAG)**"; desktop software must follow equivalent offline standards. (The Software Choices listing links each product's accessibility statement.)

**Marketing**
- Follow ASA codes and UK marketing/advertising law; call the product only "HMRC recognised" (never "approved"/"accredited"); no sharing personal data for marketing without explicit consent.

**Compliance checking & enforcement**
- HMRC checks compliance **when you apply for production access**: "HMRC staff will review your responses" (the terms-of-use questionnaire attached to the production application).
- Breach: "We reserve the right to remove or revoke your access to the Developer Hub and its APIs temporarily or permanently. Persistent non-compliance… may also result in the rejection of further production credential requests."
- **No periodic/annual re-verification requirement is stated** in the terms of use page (checked explicitly — MEDIUM confidence that none exists; absence of evidence).

---

## 4. Fraud prevention headers as a gate

- **Legal basis**: The Delivery of Tax Information through Software (Ancillary Metadata) Regulations 2019, SI 2019/360. Software must collect and deliver "relevant ancillary metadata" (data about the software/devices used) with every submission. **Fixed penalty £3,000 per program** for non-compliance (max one penalty per program per 12 months), with Sch 36 FA 2008 procedural machinery. https://www.legislation.gov.uk/uksi/2019/360/made (fetched 2026-07-02)
- Scope: mandatory for **VAT (MTD) and Income Tax Self Assessment (MTD) APIs — "all associated APIs and endpoints."** https://developer.service.hmrc.gov.uk/guides/fraud-prevention/ (fetched 2026-07-02)
- **It is an explicit production gate**: "HMRC must see evidence that your software sends fraud prevention headers and must be satisfied with their level of accuracy" before production access (how-to-integrate.html).
- **Connection methods** (each with its own required header set): DESKTOP_APP_DIRECT, DESKTOP_APP_VIA_SERVER, WEB_APP_VIA_SERVER, MOBILE_APP_DIRECT, MOBILE_APP_VIA_SERVER, BATCH_PROCESS_DIRECT, OTHER_DIRECT, OTHER_VIA_SERVER. https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/ (fetched 2026-07-02). Headers are the Gov-Client-*/Gov-Vendor-* families; the per-method header matrix is on per-method subpages (per-method page URL pattern I tried 404'd; matrix not captured in these notes — fetch /guides/fraud-prevention/connection-method/ subsections when building).
- A **Test Fraud Prevention Headers API** exists for self-checking (/guides/fraud-prevention/test-api/), but the AccountingWEB developer account says real rejections can involve checks that the self-test API does not surface (e.g. MFA timestamp freshness) — LOW-MEDIUM confidence, source blocked (see §1).
- Ongoing enforcement: "If after discussions with HMRC an application continues to submit incorrect or missing data, software providers may be fined and blocked from using HMRC APIs" (fraud-prevention guide, with a "Compliance and Sanctions Guidelines" PDF referenced).
- For a **WEB_APP_VIA_SERVER** product (the likely TaxSorted shape), headers include originating-device data (client IP, ports, screen, timezone, user IDs, MFA status) plus Gov-Vendor-* server data — this reaches deep into the client and is genuinely awkward for privacy-first design; it is nonetheless non-negotiable.

---

## 5. Precedent: free and open-source products; sole developers

### Open source + individual developer: PROVEN POSSIBLE (ITSA specifically)
**ac000 (Andrew Clayton), libmtdac / mtd-cli / itsa** — GitHub discussion fetched in full via GitHub API 2026-07-02: https://github.com/ac000/libmtdac/discussions/18
- Sole individual, personal open-source project (LGPL/GPL), **granted ITSA production credentials 2021-11-19** after starting 2021-03-10 (~8 months).
- Process included email back-and-forth, a **live demo to HMRC** (terminated early over token-handling concerns), sandbox log runs for HMRC review, and repeated policy escalations.
- **HMRC's settled position on open source client secrets** (stated to him 2020-05-29 and to gnucash-uk-vat): *"Each developer that wants to use your open source library to interact with HMRC will need to register on developer hub and get their own sandbox/production credentials."* Publishing your client_id/client_secret "is not allowed and would be likely to result in your Developer Hub application being blocked."
- HMRC granted his credentials only after **written confirmation the product was "for your use only" with no marketing**: "HMRC would have stricter criteria for software products available to the public and there would be work to be done on the user interface etc if this was the case."
- Consequence for TaxSorted: the **hosted-service model** is the clean path — TaxSorted (the project/operator) holds ONE set of production credentials for its hosted instance and goes through full public-product vetting; self-hosters must each register their own Developer Hub app and obtain their own credentials (which HMRC has confirmed is the sanctioned pattern for open source). Distributing a desktop/self-hosted app with embedded credentials is prohibited.

### Open source, VAT: gnucash-uk-vat
- README (fetched via GitHub API 2026-07-02) confirms it obtained production credentials for VAT and documents the same HMRC no-shared-credentials quote; users wanting to use the open-source tool directly must register their own Developer Hub application. https://github.com/cybermaggedon/gnucash-uk-vat

### Free (not open-source) products: PROVEN, and already live for MTD IT
- **My Tax Digital (Free)** is listed TODAY on HMRC's find-software service for MTD Income Tax: free version ready now, creates digital records AND bridging, individuals and agents, HMRC Assist supported, both update-period types, nearly all income sources "Ready now". https://www.tax.service.gov.uk/find-making-tax-digital-income-tax-software/product-details?productId=3255 (fetched 2026-07-02); vendor site https://mytaxdigital.co.uk/ (search-verified). Formerly "Portico" by Open Answers — free MTD VAT since 2019 (https://app.portico.openanswers.co.uk/, search result).
- **100PcVatFreeBridge** (Comsci) — long-standing free HMRC-recognised MTD VAT bridging app (http://www.comsci.co.uk/100PcVatFreeBridge, search result). Precedent that tiny shops can pass.
- HMRC's free-to-use expectations (§2) institutionalise free software as a recognised category — the "free for a complete annual cycle" rule is what TaxSorted must honour (trivially, being fully free).
- No fully **open-source AND publicly-listed** MTD IT product was found on Software Choices as of 2026-07-02 (checked mtd.digital list + searches; LOW confidence that none exists — the finder tool couldn't be exhaustively enumerated). TaxSorted would plausibly be the first.

### Company requirement?
- No explicit company requirement. Terms of use require evidence of official registration where **UTR alone is one accepted form** — an individual sole trader has a UTR. Precedent: ac000 got credentials as an individual (personal-use condition attached). For a PUBLIC product, expect HMRC's "stricter criteria" (UI scrutiny, support arrangements, ToU questionnaire). A limited company or CIC isn't mandated by the published terms, but would smooth the identity/accountability checks (MEDIUM confidence interpretation).

---

## 6. Ongoing obligations after recognition

Source: how-to-integrate.html §"API lifecycle and deprecation" (fetched 2026-07-02) + terms of use.

- **API versioning churn is on you**: multiple versions run simultaneously (e.g. v1 retired, v2 stable, v3 beta). Breaking changes include removing/renaming fields, changing endpoint URLs, adding mandatory query params.
- **Deprecation windows**: minimum **6 months'** notice for production-stable APIs, minimum **6 weeks** for beta. After deprecation, no new subscriptions; after retirement "ensure that your application does not rely on any deprecated APIs."
- Change tracking happens in the open: https://github.com/hmrc/income-tax-mtd-changelog (verified active via GitHub API — last updated 2026-06-24).
- **Fraud prevention header quality is monitored continuously**; persistent bad data → fines (£3k/program under SI 2019/360) and API blocking (fraud-prevention guide).
- **Terms-of-use enforcement is ongoing**: revocation of Developer Hub/API access, temporarily or permanently, for non-compliance; 72-hour incident-reporting duty is perpetual.
- **No annual re-validation / re-certification requirement found** in any fetched HMRC page (MEDIUM confidence). Listing accuracy on Software Choices (feature statuses "Ready now"/"In development") implies keeping HMRC informed as features ship, but I found no published SLA for listing updates (LOW confidence on mechanism).
- Support: HMRC signposts taxpayers to "the software provider's guidance first" — a recognised vendor is the first-line support for its users; HMRC's SDST supports the vendor (2-working-day response target).

---

## Practical read for TaxSorted (synthesis, not sourced)

1. **The gauntlet is real but proven passable by individuals and free products.** Budget months, not days: the "10 working days" only covers the final credential check; fraud-header sign-off and checklist iterations are where time goes.
2. **Architecture choice determines the credentials story**: run TaxSorted-hosted (one production app, full public-product vetting incl. WCAG AA, pen-test, support channel, accessibility statement) AND document the self-host path (each self-hoster registers their own HMRC app — sanctioned by HMRC in writing, twice).
3. **MVP scope can be "in-year only"** (Business Details + Obligations + SE/Property Business + optionally Individual Calculations) and expand iteratively — HMRC's checklist explicitly supports staged builds. But to be featured standalone on Software Choices you must meet MFS "individually or in conjunction with other software" — the final declaration can be met by redirect to another product.
4. **Fraud prevention headers are the hidden boss fight**: design them in from day one (WEB_APP_VIA_SERVER header set), self-test with the Test API, and expect review rounds beyond what the self-test catches.
5. **Never ship client_id/client_secret in the repo.** Blocking offence.
6. **Free is a recognised category with teeth**: free for a full annual compliance cycle, with "reasonable guidance" and "help and support" — the support expectation is the real cost of a commons product.
