# The Transparency Toolbox — every public instrument for seeing and querying the UK tax state

Research notes for TaxSorted (taxsorted.io). **All facts verified live on 2026-07-06** unless noted.
Audience framing: ordinary UK sole traders / landlords, zero civics background.
Rule followed: every claim carries the URL actually fetched; named office-holders carry an as-of date; contact details copied exactly from the official page.

---

## 1. Freedom of Information (FOI)

### 1.1 The Act's basics
- Anyone has "the right to ask to see recorded information held by public authorities" under the Freedom of Information Act 2000 (FOIA); Scotland has its own Act (FOISA). Environmental info goes under separate Environmental Information Regulations (EIRs). Personal data about *yourself* is NOT FOI — that's a data-protection (subject access) request.
  Source: https://www.gov.uk/make-a-freedom-of-information-request (fetched 2026-07-06)
- How to ask: write to the organisation (letter, email, online form, even social media). Include your name (optional for environmental requests), a contact address, and "a detailed description of the information you want". You can ask for paper, electronic, audio or large-print copies.
  Source: https://www.gov.uk/make-a-freedom-of-information-request/how-to-make-an-foi-request (fetched 2026-07-06)
- **Deadline:** "The organisation should send you the information within 20 working days of receiving your request."
  Source: https://www.gov.uk/make-a-freedom-of-information-request/how-to-make-an-foi-request (fetched 2026-07-06)
- **Cost:** most requests are free; they may only charge for "photocopies or postage" and must tell you first. BUT a request can be refused outright if finding the information would cost the authority more than **£450** (or **£600** for central government departments, Parliament and the armed forces).
  Sources: https://www.gov.uk/make-a-freedom-of-information-request/how-to-make-an-foi-request and https://www.gov.uk/make-a-freedom-of-information-request/if-your-request-is-turned-down (both fetched 2026-07-06)
- **If refused:** (1) ask for an internal review; (2) then complain to the Information Commissioner's Office (ICO) for England/Wales/NI/UK-wide bodies, or the Scottish Information Commissioner for Scottish bodies.
  Source: https://www.gov.uk/make-a-freedom-of-information-request/if-your-request-is-turned-down (fetched 2026-07-06)

### 1.2 ICO escalation
- ICO FOI/EIR complaints route: an eligibility checker ("Check if your complaint is eligible… you may need to have requested an internal review before you can complain to us"). You need: copies of correspondence containing the request, a copy of your internal-review request, consent letter if complaining for someone else. "If you do not provide the information we need, we may not accept your complaint." Online process, "Takes about 5 minutes".
  Source: https://ico.org.uk/make-a-complaint/foi-and-eir-complaints/foi-and-eir-complaints/ (fetched 2026-07-06 via reader proxy — site blocks plain automated fetching)
- ICO publishes its rulings as **decision notices** at https://ico.org.uk/action-weve-taken/decision-notices/ — a free archive of what authorities were forced to release (searchable by authority, incl. HMRC). Source: linked from the ICO complaints page above (fetched 2026-07-06).
- No formal deadline for going to the ICO is stated on the gov.uk guide page (the ICO's own guidance sets expectations; check their eligibility tool). Confidence: the *absence* of a stated deadline is per gov.uk page fetched 2026-07-06.

### 1.3 WhatDoTheyKnow (the public-archive route)
- WhatDoTheyKnow (whatdotheyknow.com) is run by the UK charity mySociety: "Make FOI requests to over 24,000 public authorities in the UK, or browse a massive online public archive of information, for free." Requests AND responses are published in the public archive — so one person's answer becomes everyone's answer (the public-archive advantage vs. emailing HMRC directly, where the answer lands only in your inbox).
  Source: https://www.mysociety.org/transparency/ (fetched 2026-07-06)
- "WhatDoTheyKnow is powered by our Open Source platform, Alaveteli — also the software behind FOI sites in over 25 countries worldwide." Source: same mySociety page.
- HMRC's WDTK page is https://www.whatdotheyknow.com/body/hmrc (existence confirmed via search results 2026-07-06; page itself sits behind Cloudflare bot protection so request counts not captured — verify in a browser). Confidence: low on any request-count figures.

### 1.4 HMRC's FOI route + the taxpayer-confidentiality carve-out
- **Direct route** (copied exactly from HMRC's publication scheme page, fetched 2026-07-06):
  - Email: `foi.request@hmrc.gov.uk`
  - Post: HMRC Freedom of Information Team, S1715, 6th Floor, Central Mail Unit, Newcastle Upon Tyne NE98 1ZZ
  Source: https://www.gov.uk/government/organisations/hm-revenue-customs/about/publication-scheme

  ⚠ **CORRECTION-CHECK (2026-07-06, gov-pillar Task 3 build):** `hmrc-anatomy.md` §3.6 carried
  a conflicting address for this same team ("FoI Act Team", 7th Floor, sourced only to the
  generic org page) — now corrected there to match this entry. Before shipping any FOI
  address on the who-runs-your-taxes page, this exact address was re-verified live via
  WebFetch against the publication-scheme URL above (2026-07-06) and confirmed correct as
  printed: team name, 6th Floor, S1715, Central Mail Unit, NE98 1ZZ all match. Confidence
  upgraded: MEDIUM → HIGH (direct live fetch immediately before publish, not carried over
  from the original research pass).
- **What HMRC will NEVER release:** "any information relating to identifiable HMRC customers (including legal entities, such as limited companies)". The legal chain:
  1. CRCA 2005 s.18(1): "Revenue and Customs officials may not disclose information which is held by the Revenue and Customs in connection with a function of the Revenue and Customs." (statutory duty of confidentiality)
     Source: https://www.legislation.gov.uk/ukpga/2005/11/section/18 (fetched 2026-07-06)
  2. CRCA 2005 s.23(1): "Revenue and customs information relating to a person, the disclosure of which is prohibited by section 18(1), is exempt information by virtue of section 44(1)(a) of the Freedom of Information Act 2000 … if its disclosure — (a) would specify the identity of the person to whom the information relates, or (b) would enable the identity of such a person to be deduced."
     Source: https://www.legislation.gov.uk/ukpga/2005/11/section/23 (fetched 2026-07-06)
  3. HMRC's own manual (IDG40150): s.18(1) CRCA "appl[ies] the section 44 FOIA exemption to remove customer information from the right of access", and on identifiable taxpayers "our response under FOIA will always 'neither confirm nor deny' we hold information".
     Source: https://www.gov.uk/hmrc-internal-manuals/information-disclosure-guide/idg40150 (fetched 2026-07-06)
- Plain-English framing for the article: FOI to HMRC gets you *policy, process, statistics, internal guidance, spending* — never anyone's tax affairs, including your own (use a Subject Access Request for your own data) and never a named company's.
- HMRC also refuses where release "might damage HMRC's operations if revealed" (their publication-scheme wording; maps to other FOIA exemptions). Source: publication scheme page above.
- Note the exact FOIA s.44 route means these refusals are *absolute* (no public-interest balancing) — inferable from s.44(1)(a) FOIA + CRCA s.23; confidence medium (statutory reading, not quoted verbatim from a fetched explainer).

---

## 2. gov.uk machinery — the map of the state

- **Organisations register:** https://www.gov.uk/government/organisations lists every department/agency. As shown 2026-07-06: "There are 24 Ministerial departments", "20 Non ministerial departments", "417 Agencies and other public bodies", "130 High profile groups". HM Treasury is listed as a ministerial department; **HM Revenue & Customs is a NON-ministerial department** (headed by civil servants, not a minister — key structural fact for readers).
- **How government works:** https://www.gov.uk/government/how-government-works (fetched 2026-07-06) — PM "ultimately responsible for all policy and decisions"; counts shown: 1 PM, 23 Cabinet ministers, 100 other ministers, 124 total ministers. Non-ministerial departments are "headed by senior civil servants and not ministers".
- **Ministers list:** https://www.gov.uk/government/ministers — live list of every minister by department. HM Treasury as of 2026-07-06:
  - Chancellor of the Exchequer — Rachel Reeves MP
  - Chief Secretary to the Treasury — Lucy Rigby KC MP
  - Financial Secretary to the Treasury — Lord Livermore
  - Minister of State (Minister for Investment) — Lord Stockwood (unpaid)
  - **Exchequer Secretary to the Treasury — Daniel Tomlinson MP** (in role since 1 September 2025)
  - Economic Secretary to the Treasury — Rachel Blake MP
  - Parliamentary Secretary — Torsten Bell MP
  (Names change; the list page is always current. As-of date recorded.)
- **Who is "the tax minister"? (role-anchored):** As of 2026-07-06 the **Exchequer Secretary to the Treasury** holds the tax brief: "Direct, indirect, business, property, and personal taxation", the Finance Bill and National Insurance Bill, "Tax administration policy", customs/VAT at the border, excise, and is "departmental minister" for **HMRC**, the Valuation Office Agency and the Government Actuary's Department.
  Source: https://www.gov.uk/government/ministers/exchequer-secretary-to-the-treasury (fetched 2026-07-06)
  ⚠️ The **Financial Secretary to the Treasury** — historically the tax minister — currently does NOT list tax in the role's responsibilities (growth mission, welfare, procurement, Treasury business in the Lords). Do not hard-code "FST = tax minister".
  Source: https://www.gov.uk/government/ministers/financial-secretary-to-the-treasury (fetched 2026-07-06)
- **Organograms + senior salary data (data.gov.uk):** departments publish "Organogram of Staff Roles & Salaries" datasets — an organisation chart of ALL staff roles, with names and salary details for senior civil servants, junior grades in aggregate. HMRC's dataset: last updated 29 April 2026, most recent snapshot **31 March 2026**, publisher HM Revenue and Customs, Open Government Licence v3.0. Frequency: "semi-annual (March 31 and September 30) through 2021", quarterly snapshots thereafter; series runs since 2010.
  Source: https://www.data.gov.uk/dataset/61e3828b-d1ad-4c69-b291-347a9d899fb3/organogram-hm-revenue-and-customs (fetched 2026-07-06)
  Find any department's: https://www.data.gov.uk/search?q=organogram (HTTP 200 verified 2026-07-06). Example of the underlying Cabinet Office publishing pattern (DfE page): senior CSV = "a job description for each of the senior posts…, remuneration information and details of who they report to"; junior CSV = FTE counts + pay scales per grade; "We update and republish the data quarterly."
  Source: https://www.gov.uk/government/publications/disclosure-of-scs-posts-and-salary-information (fetched 2026-07-06, last updated 30 April 2026)
- **Ministerial gifts & hospitality:** the Cabinet Office **Register of Ministers' Gifts and Hospitality** is published **monthly**: "details of gifts received and given by ministers in their ministerial capacity valued at more than £140, and details of hospitality above de minimis levels". Collection first published 30 January 2025; latest entry = May 2026 register, published 26 June 2026.
  Source: https://www.gov.uk/government/collections/register-of-ministers-gifts-and-hospitality (fetched 2026-07-06)
- **Ministerial/official meetings (tax-relevant):**
  - HM Treasury: collection "HMT ministers' meetings, hospitality, gifts and overseas travel" — https://www.gov.uk/government/collections/hmt-ministers-meetings-hospitality-gifts-and-overseas-travel (updated 25 June 2026; found via GOV.UK Search API 2026-07-06).
  - HMRC: collection "HMRC: senior officials' business expenses, hospitality, and meetings" — https://www.gov.uk/government/collections/hmrc-senior-officials-business-expenses-hospitality-and-meetings ; latest release covers **January to March 2026**, published **25 June 2026** (i.e. ~3 months in arrears — see §7).
  Both located via the open GOV.UK Search API: https://www.gov.uk/api/search.json?q=... (queried 2026-07-06).

---

## 3. Parliamentary data — every word said about your tax

- **TheyWorkForYou** (theyworkforyou.com), run by charity mySociety: "Discover who represents you, how they've voted and what they've said in debates". Covers "Houses of Parliament debates, Written Answers, Statements, Westminster Hall debates, and Bill Committees" plus Scottish Parliament, NI Assembly and the Senedd; voting records and registers of members' interests; free ("not just insiders or those who can pay"); offers "email alerts that let citizens and civil society stay informed about their representatives or areas of interest" — i.e. a standing keyword alert on e.g. "Making Tax Digital". "This site is not publicly funded."
  Source: https://www.theyworkforyou.com/about/ (fetched 2026-07-06)
- **Hansard** (hansard.parliament.uk) — the official report of everything said in the Commons and Lords, searchable by keyword and member. The site was not fetchable by our tooling (Cloudflare bot check) but its **open API is live and keyless**: a search of the exact phrase "Making Tax Digital" on 2026-07-06 returned **231 contributions, 10 written statements, 4 debates**:
  `https://hansard-api.parliament.uk/search.json?queryParameters.searchTerm=%22Making%20Tax%20Digital%22` (fetched 2026-07-06)
- **Historic Hansard 1803–2005**: https://api.parliament.uk/historic-hansard/index.html — page title "HANSARD 1803–2005" (fetched 2026-07-06).
- **Parliament APIs** (all verified live, no API key, 2026-07-06):
  - Members API: https://members-api.parliament.uk/ — e.g. `/api/Members/Search?Name=Tomlinson` returns structured JSON (party, house, current roles).
  - Bills API: https://bills-api.parliament.uk/ — e.g. `/api/v1/Bills?SearchTerm=Finance` returns bill stages, sessions, last-update timestamps.
  - Hansard API: https://hansard-api.parliament.uk/ (above).
  - Developer portal: https://developer.parliament.uk/ (exists; blocked to automated fetch — verify in browser). Confidence for portal contents: low; for the three APIs above: high (queried directly).
- **Petitions:** https://petition.parliament.uk — "Petitions that get 10,000 signatures get a response from the UK Government"; "All petitions that get 100,000 signatures will be considered for debate, and are usually debated." Creator needs 5 initial supporters; petitions run 6 months; overseen by the Petitions Committee (11 MPs).
  Source: https://petition.parliament.uk/help (fetched 2026-07-06)
- **WriteToThem** (writetothem.com), also mySociety: enter postcode → write to your MP/councillors; "WriteToThem is a free service, and always will be"; blocks bulk identical form-letters (individual letters carry more weight); you can only contact your own representatives; messages need email confirmation.
  Source: https://www.writetothem.com/about-qa (fetched 2026-07-06)

---

## 4. legislation.gov.uk — reading the actual law

- Official database of UK legislation, published by **The National Archives**. Covers primary + secondary legislation, all UK jurisdictions.
  Source: https://www.legislation.gov.uk/understanding-legislation (fetched 2026-07-06)
- **Statutory instruments (SIs)** = delegated legislation made by ministers under powers in an Act. Most tax detail (including all of Making Tax Digital's mechanics) arrives as SIs, not Acts.
- **Key dates on every SI:** the "made" date (when the minister signed it into existence) vs "coming into force" (when it starts applying) — these can be years apart. "An Act may come into force immediately, on a specific future date, or in stages," sometimes via a separate Commencement Order. Source: understanding-legislation page above.
- **Worked example (fetched 2026-07-06):** The Income Tax (Digital Requirements) Regulations 2021, SI 2021 No. 1076 — the MTD for Income Tax SI:
  - Made: 23 September 2021 at 9.22 a.m.
  - Laid before the House of Commons: 23 September 2021 at 1.30 p.m.
  - Coming into force: 6 April 2024
  - Enabling power: paragraphs of Schedule A1 to the Taxes Management Act 1970, inserted by s.60 Finance (No.2) Act 2017.
  Source: https://www.legislation.gov.uk/uksi/2021/1076/introduction/made
  (Note for readers: MTD ITSA mandation was subsequently deferred by amending SIs — always check the "latest available (Revised)" tab, not just "made".) Confidence on the deferral mechanics: medium (not re-verified this session).
- **Explanatory Memoranda (the plain-English part nobody knows about):** every SI laid before Parliament since **June 2004** carries an "Explanatory Memorandum" that "sets out a brief statement of the purpose of a Statutory Instrument and provides information about its policy objective and policy implications" and aims to "make the Statutory Instrument accessible to readers who are not legally qualified". Find it under the "Explanatory Memorandum" tab on the SI's page (PDF).
  Source: https://www.legislation.gov.uk/uksi/2021/1076/memorandum/contents (fetched 2026-07-06)
  (Acts have "Explanatory Notes"; Scottish SIs have "Policy Notes".)
- **Revised vs as-enacted:** revised versions fold amendments in; the editorial team aims to apply amendments "within three months of those amendments coming into force" — so very recent changes may not yet show. Source: understanding-legislation page above.

---

## 5. HMRC's own transparency artifacts

- **Tax gap statistics** ("Measuring tax gaps", annual): latest = "Measuring tax gaps 2026 edition: tax gap estimates for 2024 to 2025", published **23 June 2026**. Headline: tax gap = "6.4% of total theoretical tax liabilities, or £59.2 billion in absolute terms, in the 2024 to 2025 tax year"; HMRC collected 93.6% of all tax due out of £924.4bn theoretical liabilities; **small businesses account for 62% of the overall tax gap** (largest customer group) — the number that explains why MTD targets sole traders/landlords.
  Sources: https://www.gov.uk/government/statistics/measuring-tax-gaps and https://www.gov.uk/government/statistics/measuring-tax-gaps/1-tax-gaps-summary (both fetched 2026-07-06)
- **MTD evaluation & research** — collection "Making Tax Digital: technical publications": https://www.gov.uk/government/collections/making-tax-digital-technical-publications (fetched 2026-07-06). Contains six strands: MTD Income Tax legislation; penalty-reform legislation; Tax Information and Impact Notes; policy papers (e.g. "Making Tax Digital (MTD) for Income Tax — Screening Equality Impact Assessment", April 2026); research reports (e.g. "Research into agents' preparedness for Making Tax Digital for Income Tax – headline findings", November 2025); and VAT evaluation reports incl. **"Making Tax Digital for VAT: Final evaluation" (February 2025)**, "Estimating the wider economic benefit of Making Tax Digital" (February 2025), "Impact of Penalty Reform on VAT Registered Businesses — Quantitative research" (March 2026).
- **Developer Hub** (developer.service.hmrc.gov.uk): "technical specifications for software developers", 117+ APIs (MTD Income Tax & VAT, Self Assessment, CT, PAYE, CIS, customs…), "Service guides and roadmaps", roadmaps showing "past and planned changes".
  Source: https://developer.service.hmrc.gov.uk/api-documentation/docs/api (fetched 2026-07-06)
  - **MTD for Income Tax roadmap** (public release schedule + changelog): https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/ — release history back to December 2023, planned releases to April 2027, changelog back to July 2024; last updated 16 June 2026 (fetched 2026-07-06). ⚠️ older URL `/roadmaps/mtd-itsa-vendors/` now 404s.
  - End-to-end service guide: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/ (HTTP 200, 2026-07-06).
- **Administrative Burdens Advisory Board (ABAB)** — the small-business watchdog inside HMRC's orbit: independent board established 2006, acts as a "critical friend" to HMRC on small-business admin burdens; chaired by Dame Teresa Graham DBE, 13 members from small business. Publishes: annual reports; the annual **'Tell ABAB' survey** (2024 survey: record 10,052 responses); **quarterly board meeting minutes** on GOV.UK. Contact (copied exactly): `advisoryboard.adminburden@hmrc.gov.uk`.
  Source: https://www.gov.uk/government/groups/administrative-burden-advisory-board (fetched 2026-07-06; note singular "burden" in URL slug)
  - Annual reports: 2025 edition published 17 Dec 2025 (/government/publications/administrative-burdens-advisory-board-annual-report-2025); Tell ABAB report 2024-25 published 31 Oct 2025 (found via GOV.UK Search API 2026-07-06).
- **Other HMRC stakeholder forums with published minutes** (all gov.uk group pages, found via GOV.UK Search API 2026-07-06; update timestamps shown by API):
  - Individuals Stakeholder Forum — /government/groups/individuals-stakeholder-forum (updated 2026-06-29)
  - Guidance Strategy Forum — /government/groups/guidance-strategy-forum (updated 2026-06-22)
  - Employment Status and Intermediaries (ESI) Forum — /government/groups/ir35-forum (updated 2026-04-10)
  - Strategic Software Forum — /government/groups/strategic-software-forum (updated 2026-04-29)
  - Construction Forum — /government/groups/construction-forum (updated 2026-04-28)
  - Wealthy External Forum — /government/groups/high-net-worth-unit-external-stakeholder-forum (updated 2026-05-22)
  - Share Schemes Forum — /government/groups/share-scheme-forum (updated 2026-04-21)
  - (closed) Collaborative Assembly of Software Developers and HMRC — /government/groups/collaborative-assembly-of-software-developers-and-hmrc

---

## 6. Who is paying to influence tax policy

- **Register of Consultant Lobbyists** — statutory, under Part 1 of the Transparency of Lobbying, Non-Party Campaigning and Trade Union Administration Act 2014. A person consultant-lobbies if "in the course of a business and in return for payment, the person makes communications … on behalf of another person" — specifically "oral or written communications made personally to a Minister of the Crown or permanent secretary" about policy, legislation, contracts, grants. Registrants file **quarterly returns naming clients** within two weeks of quarter-end; the register also holds business details and code-of-conduct undertakings. **Big limitation: in-house lobbyists (a company's own staff lobbying for their employer) are NOT covered** — only paid agency/consultant lobbying of ministers and permanent secretaries.
  Source: https://www.legislation.gov.uk/ukpga/2014/4/part/1 (fetched 2026-07-06)
- Kept by the **Office of the Registrar of Consultant Lobbyists** (works with the Cabinet Office), which "has a separate website": http://registrarofconsultantlobbyists.org.uk/ — search the register there.
  Source: https://www.gov.uk/government/organisations/office-of-the-registrar-of-consultant-lobbyists (fetched 2026-07-06). ORCL's own site blocked automated fetch (403) — register-search mechanics not verified this session; confidence low on site navigation details, high on the register's statutory content.
- **Register of All-Party Parliamentary Groups (APPGs):** "maintained by the Parliamentary Commissioner for Standards, is a definitive list of such groups. It contains the financial and other information about Groups which the House has decided should be published. The Register is published on the parliamentary website and updated approximately every six weeks." APPGs "are not however official parliamentary bodies". Latest edition at fetch: **as at 18 May 2026** — https://publications.parliament.uk/pa/cm/cmallparty/260518/contents.htm (intro fetched via reader proxy 2026-07-06: https://publications.parliament.uk/pa/cm/cmallparty/260518/introduction.htm).
  Contact (copied exactly): Deputy Registrar (APPGs), Office of the Parliamentary Commissioner for Standards, House of Commons, London SW1A 0AA; Tel: 020 7219 0401; Email: groupsregister@parliament.uk.
  Relevance: search the register for tax-adjacent groups and see each group's officers, purpose and registrable financial benefits (who funds the secretariat).

---

## 7. Data quality warnings (what's stale, discontinued, or gappy)

1. **Stale APPG editions stay online at plausible URLs.** https://publications.parliament.uk/pa/cm/cmallparty/register/contents.htm is the *2015* register ("as at 30 July 2015") and still resolves. Always navigate from a dated edition (e.g. /260518/) and check the "as at" date. (Both URLs fetched 2026-07-06.)
2. **Ministerial/official meeting data runs a quarter+ in arrears.** HMRC senior-officials data for Jan–Mar 2026 was published 25 June 2026. It tells you who met whom last quarter, not this week. (Collection pages fetched/queried 2026-07-06.)
3. **The gifts register is new and only partially overlaps the old quarterly returns.** The monthly Register of Ministers' Gifts and Hospitality only began (as a collection) 30 January 2025; older data lives in the per-department quarterly collections (e.g. HMT's), and a superseded HMT collection from 2013 (/government/collections/quarterly-information) still exists — easy to land on the wrong one.
4. **Organogram cadence changed and depends on each department keeping up.** Semi-annual to 2021, quarterly thereafter; HMRC is current (snapshot 31 Mar 2026, published 29 Apr 2026) but each department's dataset has its own lag — check the "last updated" on data.gov.uk per dataset.
5. **Role responsibilities move between ministers.** The FST role page currently lists no tax responsibilities; the tax brief sits with the Exchequer Secretary (as of 2026-07-06). Any content saying "the Financial Secretary leads on tax" is stale. Anchor content to the gov.uk role pages and re-check after reshuffles.
6. **Forums close without much notice.** e.g. "Collaborative Assembly of Software Developers and HMRC (closed)". Treat any forum list as needing periodic re-verification via the GOV.UK Search API.
7. **Old developer-hub URLs rot.** /roadmaps/mtd-itsa-vendors/ → 404; current is /roadmaps/mtd-itsa-vendors-roadmap/ (checked 2026-07-06).
8. **Lobbying register blind spot** is structural, not a data lapse: in-house lobbyists and lobbying of officials below permanent secretary are simply out of scope of the 2014 Act.
9. **Automation note for TaxSorted's data pipeline:** whatdotheyknow.com, ico.org.uk, parliament.uk web pages (incl. hansard.parliament.uk, publications.parliament.uk, developer.parliament.uk) and registrarofconsultantlobbyists.org.uk all sit behind Cloudflare-style bot protection (403/challenge to plain fetchers, verified 2026-07-06). The *APIs* (hansard-api, members-api, bills-api, GOV.UK Search API, data.gov.uk) are open and keyless — build the data file against the APIs, link humans to the web pages.
10. **Tax gap methodology caveat:** figures are estimates and revised year-to-year (each edition restates prior years); cite the edition (2026 edition = 2024-25 estimates). Confidence: high that editions restate (page shows annual archive cycle); medium on scale of revisions (not examined this session).

---

## Quick-reference contact block (all copied exactly, 2026-07-06)

| Instrument | Route |
|---|---|
| FOI to HMRC (email) | foi.request@hmrc.gov.uk |
| FOI to HMRC (post) | HMRC Freedom of Information Team, S1715, 6th Floor, Central Mail Unit, Newcastle Upon Tyne NE98 1ZZ |
| FOI with public archive | whatdotheyknow.com (mySociety) |
| FOI appeal | ICO: https://ico.org.uk/make-a-complaint/foi-and-eir-complaints/foi-and-eir-complaints/ |
| Small-business voice to HMRC | ABAB: advisoryboard.adminburden@hmrc.gov.uk |
| APPG register queries | groupsregister@parliament.uk / 020 7219 0401 |
| Write to your MP | writetothem.com (free, postcode lookup) |
| Petition Parliament | petition.parliament.uk (10,000 sigs = govt response; 100,000 = considered for debate) |

## Source log (all fetched 2026-07-06)

- https://www.gov.uk/make-a-freedom-of-information-request (+ /how-to-make-an-foi-request, /if-your-request-is-turned-down)
- https://www.gov.uk/government/organisations/hm-revenue-customs/about/publication-scheme
- https://www.gov.uk/hmrc-internal-manuals/information-disclosure-guide/idg40150
- https://www.legislation.gov.uk/ukpga/2005/11/section/18 ; /section/23
- https://ico.org.uk/make-a-complaint/foi-and-eir-complaints/foi-and-eir-complaints/ (reader proxy)
- https://www.mysociety.org/transparency/
- https://www.gov.uk/government/organisations ; /government/ministers ; /government/how-government-works
- https://www.gov.uk/government/ministers/financial-secretary-to-the-treasury ; /exchequer-secretary-to-the-treasury
- https://www.data.gov.uk/dataset/61e3828b-d1ad-4c69-b291-347a9d899fb3/organogram-hm-revenue-and-customs
- https://www.gov.uk/government/publications/disclosure-of-scs-posts-and-salary-information
- https://www.gov.uk/government/collections/register-of-ministers-gifts-and-hospitality
- https://www.gov.uk/government/collections/hmt-ministers-meetings-hospitality-gifts-and-overseas-travel (via Search API)
- https://www.gov.uk/government/collections/hmrc-senior-officials-business-expenses-hospitality-and-meetings (via Search API)
- https://www.theyworkforyou.com/about/
- https://hansard-api.parliament.uk/search.json?queryParameters.searchTerm=%22Making%20Tax%20Digital%22 (live query)
- https://members-api.parliament.uk/api/Members/Search?Name=Tomlinson (live query) ; https://bills-api.parliament.uk/api/v1/Bills?SearchTerm=Finance (live query)
- https://api.parliament.uk/historic-hansard/index.html
- https://petition.parliament.uk/help ; https://www.writetothem.com/about-qa
- https://www.legislation.gov.uk/understanding-legislation
- https://www.legislation.gov.uk/uksi/2021/1076/introduction/made ; /memorandum/contents
- https://www.gov.uk/government/statistics/measuring-tax-gaps (+ /1-tax-gaps-summary)
- https://www.gov.uk/government/collections/making-tax-digital-technical-publications
- https://developer.service.hmrc.gov.uk/api-documentation/docs/api ; /roadmaps/mtd-itsa-vendors-roadmap/ ; /guides/income-tax-mtd-end-to-end-service-guide/
- https://www.gov.uk/government/groups/administrative-burden-advisory-board
- https://www.legislation.gov.uk/ukpga/2014/4/part/1
- https://www.gov.uk/government/organisations/office-of-the-registrar-of-consultant-lobbyists
- https://publications.parliament.uk/pa/cm/cmallparty/260518/introduction.htm (reader proxy) ; /register/contents.htm (stale 2015 edition)
- GOV.UK Search API: https://www.gov.uk/api/search.json (multiple queries)
