# Completeness critique — "how the tax state works & how to move it" pillar
Reviewed 2026-07-06 against the six research summaries (lawmaking, hmrc-anatomy, treasury, parliament, transparency-tools, participation) plus fact-check corrections. Live spot-checks below were done with plain curl on 2026-07-06; all returned HTTP 200 with the quoted content.

## Live checks performed (all confirmed)
- https://www.gov.uk/scottish-income-tax — Scottish Parliament/Government set rates & bands
- https://www.gov.uk/welsh-income-tax — Welsh rates of income tax
- https://www.gov.uk/guidance/hmrc-subject-access-request — SAR route for your own HMRC data
- https://www.gov.uk/api/content/government/ministers — open JSON (staleness-pipeline feasible)
- https://www.gov.uk/guidance/identify-hmrc-related-scam-phone-calls-emails-and-text-messages — scam guidance
- https://www.gov.uk/government/organisations/hm-revenue-customs/contact/welsh-language-helplines — 0300 200 1900
- https://www.gov.uk/get-help-hmrc-extra-support — Relay UK, British Sign Language routes
- https://www.gov.uk/tax-tribunal — First-tier Tribunal (Tax Chamber) appeal route
- https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/ — attribution required ("acknowledge the source", "attribution statement")

## BLOCKERS

### 1. Devolution is entirely absent
All six workstreams describe a Westminster/Whitehall-only tax state. But: Scottish income tax rates/bands on non-savings income are set by the Scottish Parliament (since 2017-18); Welsh Rates of Income Tax are set by the Senedd; Revenue Scotland and the Welsh Revenue Authority are separate tax authorities for fully devolved taxes (LBTT/LTT replace SDLT, devolved landfill taxes); council tax and business rates are devolved everywhere; Northern Ireland has domestic rates, not council tax. A Scottish sole trader reading "HM Treasury owns tax policy; write to the XST; respond to the Finance Bill PBC" about their income tax *rates* is being pointed at the wrong parliament, wrong minister, wrong committee (Scottish Parliament Finance and Public Administration Committee; Scottish Budget cycle; MSPs; Scottish public petitions at petitions.parliament.scot). HMRC still administers Scottish/Welsh income tax, so the HMRC contact/complaints content survives — but the lawmaking, ministers, and participation guides need either a devolution chapter or explicit "England/NI income tax" scoping on every page. Without this the pillar is factually misleading for roughly 10% of the UK audience.

### 2. No staleness/versioning mechanism for the data file — the trap is named but not solved
Every summary flags churn (2 of 5 HMT ministers changed 14 May 2026; the XST-not-FST trap is called out three separate times; APPG register editions go stale at live URLs; developer-hub URLs rot; helpline numbers change). No workstream proposed the actual scheme. Needed before first publish:
- Per-record fields: `as_of` date, `source_url`, `last_verified`, `confidence`, `verify_method` (API vs browser — parliament.uk facts need browser re-verification per the lawmaking caveat).
- Automated pre-publish re-verification where an open API exists: gov.uk Content API (`/api/content/government/ministers` — confirmed open JSON today), members-api/committees-api for chairs, gov.uk Search API for page moves.
- Visible "last verified" + "report an error" on every rendered page; a documented cadence (e.g. re-verify ministers weekly, contacts monthly, full audit each fiscal event) and event triggers (reshuffle, Budget, general election).
- Treat "one major fiscal event a year" as a *policy commitment* (June 2025 Principles), not law — date-stamp it like an office-holder.
Without this, the pillar ships the exact failure mode it documents.

## IMPORTANT

### 3. FOI framing will mislead people about their own data — SARs are missing
Transparency summary: HMRC "will never release — and will 'neither confirm nor deny' holding — information about any identifiable taxpayer, including yourself" (FOIA s.44 via CRCA s.18/s.23). Correct for FOI, but stated alone it teaches the false lesson "you cannot get your own HMRC records." The UK GDPR right of access (subject access request) is the correct route and HMRC has a dedicated live guidance page (verified today). The transparency toolbox needs an FOI-vs-SAR fork: policy/process/statistics → FOI; your own records → SAR (free, one month). Also worth one line: FOIA s.40 is the personal-data exemption that pushes you to SAR.

### 4. No responsible-publishing / data-protection line for the contact directory
The data file will name individuals (Marks, Lloyd, Ciniewicz, Athow, committee chairs, APPG chairs, a campaign group's email). Named role-holders are personal data under UK GDPR even when already public. Low legal risk *if* a policy is stated and followed: (a) only information already published by an official source, republished with a link to that source; (b) roles and office-holders at SCS/board level only — never junior staff (gov.uk organograms themselves redact below senior grades); (c) work contact routes only, never personal details; (d) a correction/takedown contact on the directory page; (e) copy third-party contacts (e.g. contact@loanchargeappg.co.uk) only from the official APPG register edition, dated. Equally important is the harassment line: guides should frame contact as "one well-evidenced letter" (which the participation research already proves is the effective format) and explicitly not organise pile-ons — WriteToThem's own identikit-blocking is the citable norm. One sentence on the Transparency of Lobbying Act non-party-campaigner rules (only bites on election-influencing spend near a general election) inoculates the project cheaply.

### 5. Published phone numbers are a scam-surface — no phishing framing anywhere
HMRC is among the most-impersonated UK institutions; a third-party page listing "HMRC numbers" that drifts stale is functionally indistinguishable from phishing bait, and users may also find spoofed copies of TaxSorted's directory. Mitigations: every number links its live gov.uk source page; the directory carries HMRC's own "identify scam calls/emails/texts" guidance (live page verified today) and the rule "HMRC will never leave voicemails threatening arrest"; the staleness cadence from gap 2 covers 0300 numbers, not just names.

### 6. Neutrality and conflict-of-interest optics are unmanaged
Two layers. (a) Framing: the case studies overwhelmingly document wins *against* HMRC/MTD (2017/2021/2022 climbdowns, loan charge, HICBC), and the tax-gap material is deployed as "the statistical engine behind MTD aimed at our audience." Mechanism-first, both-directions framing (the Spring 2025 £20k re-extension is already in the notes — keep it prominent) is what keeps a commons non-partisan. If TaxSorted is or becomes a registered charity, Charity Commission CC9 (campaigning and political activity) applies: issue campaigning fine, party alignment not. (b) Interest: TaxSorted is itself MTD software that wants listing on HMRC's software finder via SDST — publishing "how to pressure the tax state" while seeking a commercial-adjacent benefit from the same department is an optics risk. A visible "who we are / why we publish this / how we're funded" statement on the pillar is the cheap fix; silence is the embarrassing version when someone else points it out.

### 7. National Insurance lawmaking is missing — and it's a sole-trader tax
The lawmaking guide covers the Finance Bill cycle only. NICs (Class 2/4 for the core audience) cannot be legislated in a Finance Bill: they travel in separate National Insurance Contributions Bills — the XST's own role page says "The Finance Bill and the National Insurance Bill" — and annual re-rating happens by SI under the Social Security Administration Act 1992 powers. NICs bills are not money bills in the same automatic way and NICs sit formally with DWP-adjacent legislation despite HMT policy ownership. One section fixes it; omitting it misdescribes how a large slice of a sole trader's bill is made.

### 8. No "wrong door" segmentation between individual redress and policy influence
Parliament research notes committees "explicitly do not handle individual cases," and hmrc-anatomy covers the complaints ladder — but the pillar never gives the *dispute* path: statutory review → appeal to the First-tier Tribunal (Tax Chamber) (free to file; live page verified today) → Upper Tribunal; ADR/mediation; TaxAid and TaxHelp for Older People for people who can't afford representation. Without an explicit "is your problem individual or systemic?" router at the top of the participation playbook, aggrieved individuals will fire case-specific grievances into policy channels that bounce them (and vice versa: people with systemic evidence will waste it on tier-1 complaints).

### 9. Accessibility of the guidance itself was never researched
Nothing on: WCAG 2.2 AA for the published pages; plain-English reading level for the "plain words" promise (the raw material is full of Ways and Means, praying periods, L-day, SI — a glossary is needed); non-phone/non-digital routes for the audience segment MTD most burdens. Accessibility contact facts verified live today and absent from the directory: Relay UK and British Sign Language routes on gov.uk/get-help-hmrc-extra-support, and HMRC's Welsh-language helpline 0300 200 1900 (Welsh-language service is also a devolution-adjacent equity point). These belong in the data file as first-class contact routes, not footnotes.

### 10. Licensing of republished government/parliamentary material
The workstreams copied quotes and contact data "exactly" from gov.uk and parliament.uk. gov.uk content is Crown copyright under the Open Government Licence v3, which requires source acknowledgement and an attribution statement (wording verified live today); parliamentary material (Hansard, committee reports, the APPG register) is under the separate Open Parliament Licence. Neither conflicts with an AGPL codebase, but the repo/pages must carry the attribution notices, and the data file should record a `licence` field per source. Cheap to do now, awkward to retrofit after a complaint.

## NICE-TO-KNOW

### 11. Dissolution/general-election effects
A general election dissolves committees, kills unfinished bills, closes all petitions, and can move every office-holder at once (next GE by August 2029 at the latest). One paragraph plus a "what an election does to everything on this page" note doubles as the trigger event for the staleness pipeline in gap 2.

### 12. Northern Ireland one-paragraph scoping
NI has domestic rates (no council tax), a dormant devolved corporation tax power (Corporation Tax (Northern Ireland) Act 2015, never switched on), and no income-tax variation. One paragraph avoids an "UK-wide" overclaim without needing a full chapter.

### 13. "Not advice" disclaimer and date-stamping of legal facts
Process guides aren't tax advice, but a standing disclaimer plus per-page "facts as at" dates (the PCTA 1968 30-sitting-day/7-month figures, the 40-day praying period, the £450/£600 FOI limits are all amendable) is standard commons hygiene and costs nothing.
