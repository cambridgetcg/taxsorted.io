# Parliament's tax levers — and the citizen's handles on each

Research notes for TaxSorted (taxsorted.io). Researched **2026-07-06**. All facts verified against live sources on this date unless noted.

**Access note for future verification runs:** `www.parliament.uk`, `members.parliament.uk`, `committees.parliament.uk`, `publications.parliament.uk`, `edm.parliament.uk`, `bills.parliament.uk` all return HTTP 403 to non-browser clients (bot blocking). The official **read-only APIs are open** and are primary sources: `members-api.parliament.uk`, `committees-api.parliament.uk`, `bills-api.parliament.uk`, `oralquestionsandmotions-api.parliament.uk`, `petition.parliament.uk/*.json`. Blocked HTML pages were fetched 2026-07-06 via the r.jina.ai reader proxy (content timestamped same-day by the proxy); the URL recorded is always the real parliament.uk URL.

---

## 1. Finding and contacting your MP

### Finding your MP
- Official finder: **https://members.parliament.uk/FindYourMP** — "Find your MP: Search for Members by name, postcode, or constituency" (page title and description verified 2026-07-06; the search link text also appears on https://www.parliament.uk/get-involved/committees/ nav: "Find your MP — Search for Members by name, postcode, or constituency").
- The directory of all MPs (with contact details per MP): **https://members.parliament.uk/members/commons**
- Under the hood this is the open Members API. Example verified 2026-07-06: `https://members-api.parliament.uk/api/Location/Constituency/Search?searchText=SW1A%201AA` → constituency "Cities of London and Westminster", current MP Rachel Blake (Labour Co-op). Per-member contact endpoint example: `https://members-api.parliament.uk/api/Members/5257/Contact` returns Parliamentary office email `rachel.blake.mp@parliament.uk`, phone `0207 219 6543`, plus constituency-office email. So every MP's official email/phone is published on their members.parliament.uk profile.

### Contacting your MP (official guidance)
Source: https://www.parliament.uk/get-involved/contact-an-mp-or-lord/contact-your-mp/ (fetched 2026-07-06). Key facts, quoted/paraphrased:
- "The UK is divided into 650 areas called constituencies, and each constituency is represented by one MP. **MPs will generally only act on behalf of people who live in their own constituency**."
- Writing is recommended ("provides a written record"). Postal address for any MP: **House of Commons, London SW1A 0AA**. "Remember to always include your own address when you write to your MP so that they will know you live in their constituency."
- Phone: Commons switchboard **020 7219 3000** — "ask to be put through to their office giving your MP's name".
- Email: use the contact details in the Directory of MPs (members.parliament.uk/members/Commons).
- Surgeries: "Many MPs hold regular sessions called surgeries where they meet with constituents" — check MP's website or ring their office.
- Chasing: "If you haven't heard back from them after about two weeks, you should follow up your email or letter with a phone call."
- What MPs can do for you: "MPs can make confidential enquiries with officials or a government minister on your behalf. They can also refer individual cases to be investigated by the Parliamentary Ombudsman. If they agree to support a cause you have raised with them, they may also choose to raise it publicly in the House of Commons – through questions, debates, motions or amendments."
- MPs can still help constituents during recess, and even if they are a minister/Speaker (they just use non-public methods).
- Mass-mailing every MP is explicitly discouraged: "mass mailings will not get their attention."

### Civic tools (mySociety — registered UK charity 1076346)
- **WriteToThem** — https://www.writetothem.com/ (fetched 2026-07-06): free; postcode → choose representative (councillor, MP, MSP, MS, MLA, London Assembly) → write → send. Run by mySociety.
  - Rules, from https://www.writetothem.com/about-qa (fetched 2026-07-06): "We want to make the voice of the individual more powerful, so we **block 'identikit' letters**" (no copy-paste campaign letters). You can only write to **your own** representatives. Messages are delivered to representatives' email addresses; the service asks you two weeks later whether you got a reply (this powers their responsiveness stats).
- **TheyWorkForYou** — https://www.theyworkforyou.com/ (fetched 2026-07-06): free; find your MP, read debates (Commons, Lords, Westminster Hall), written answers, Register of Interests, voting records; **email alerts** "every time an issue you care about is mentioned in Parliament" — practical way to watch for "Making Tax Digital", "IR35", "landlord" etc. Run by mySociety.

### What an individual MP can actually do on tax
Source: https://www.parliament.uk/about/mps-and-lords/members/raising/ (fetched 2026-07-06). Menu of levers, all verified wording:
- **Parliamentary questions** — oral or written. "Asking a parliamentary question ... may secure information or a commitment from the government and guarantees that the minister's reply is put on the record." Written questions and answers are published at https://questions-statements.parliament.uk/ (fetched 2026-07-06 — "Written questions allow MPs and Members of the House of Lords to ask for information on the work, policy and activities of Government departments").
- **Early Day Motions (EDMs)** — "can demonstrate the level of interest or support an issue has among MPs." See §EDM reality check below.
- **Short debates** — end-of-day adjournment debates and Westminster Hall debates: "gives an MP the opportunity to set out their concerns to a minister more fully and receive a considered response."
- **Backbench Business debates** — apply to the Backbench Business Committee for up to 3 hours of debate time.
- **Bills and amendments** — "MPs can also propose an amendment or New Clause to a relevant government bill while it is being considered in the Commons" — this is the Finance Bill lever (see §5).
- **Points of order, Urgent Questions, Emergency debates** — for time-sensitive matters.
- **Private correspondence/meetings with ministers** — "MPs' correspondence with ministers is prioritised by civil servants who must provide a 'high quality' reply in a timely manner." (For a sole trader, this is often the highest-value, lowest-drama lever: your MP writes to the Financial Secretary to the Treasury; the department must reply.)

**EDM reality check** (source: https://www.parliament.uk/about/how/business/edms/, fetched 2026-07-06):
- Format: short title + motion of max **250 words**.
- "In an average session only six or seven EDMs reach over two hundred signatures. ... The majority will attract only one or two signatures."
- "There is **no rule whereby the number of signatures affects the likelihood of an EDM being debated**." EDMs are a visibility tool, not a decision tool.
- Ministers, whips and PPSs do not normally sign EDMs.
- EDM database (search "tax"): https://edm.parliament.uk/ ; API verified 2026-07-06: `https://oralquestionsandmotions-api.parliament.uk/EarlyDayMotions/list?parameters.searchTerm=tax` → 1,929 results.

**Westminster Hall debates** (source: https://www.parliament.uk/about/how/business/debates/westminster-hall-debates/, fetched 2026-07-06):
- Motions are neutral ("That this House has considered [X]"); **no amendments, no votes** — it's a pressure/on-record venue, minister must attend and respond.
- Tue/Wed slots allocated by ballot via the Speaker's Office; Thursday slots via Backbench Business Committee or Liaison Committee (select committee reports).
- **Mondays are petition days**: "The Petitions Committee can determine whether a sitting should take place on a Monday in Westminster Hall to consider one or more petitions or e-petitions. Monday sittings begin at 4.30pm and can continue for up to three hours."

---

## 2. Treasury Select Committee (Commons)

- Remit (exact wording, from https://committees.parliament.uk/committee/158/treasury-committee/ and `committees-api.parliament.uk/api/Committees/158`, both fetched 2026-07-06): "The Treasury Committee is appointed by the House of Commons to **examine the expenditure, administration and policy of HM Treasury, HM Revenue & Customs, and associated public bodies, including the Bank of England and the Financial Conduct Authority**."
- **Chair: Dame Meg Hillier MP** — Chair role start date 2024-09-09, still current **as of 2026-07-06**. Source: `https://committees-api.parliament.uk/api/Committees/158/Members?MembershipStatus=Current` (11 current members).
- How it grills HMRC/Treasury: it runs inquiries plus "regular evidence sessions ... from certain officeholders or organisations on a regular basis" (committee page). Standing business items include "The work of HMRC" (business id 6489, opened 2022-01-27, still open) and "Work of HM Treasury" (inquiry opened 5 Feb 2025). Ministers appear in person — e.g. upcoming session verified 2026-07-06: Chief Secretary to the Treasury Rt Hon Lucy Rigby KC MP giving oral evidence 8 July 2026 (committee events list). Sessions are public, broadcast on parliamentlive.tv, transcripts published.
- Current inquiries as of 2026-07-06 include: Student loans and taxation of graduates (opened 12 Mar 2026); The OBR: 15 years on; Financial Inclusion Strategy; Work of HM Treasury; AI in financial services (report published 20 Jan 2026).
- Scale of citizen input is real: TC news 27 May 2026 — "More than 52,000 responses to Treasury Committee call for evidence" (public survey on student loans/taxation of graduates). Source: https://committees.parliament.uk/committee/158/treasury-committee/news/213745/ (listed on committee page fetched 2026-07-06).
- **Contact** (copied exactly from `committees-api.parliament.uk/api/Committees?SearchTerm=Treasury`, fetched 2026-07-06):
  - Email: `treascom@parliament.uk`
  - Address: `Treasury Committee, House of Commons, London, SW1A 0AA`
  - Disclaimer on the page: "We receive a significant number of emails each day. All requests and invitations are considered but we do not respond directly to everyone. Please be aware, **the committee does not look at individual cases or specific complaints**."

### How citizens submit written evidence (the portal + format)
Source: https://www.parliament.uk/get-involved/committees/give-evidence-to-a-select-committee/ (fetched 2026-07-06) — the official guidance:
- Committees launch inquiries with a **call for evidence**; anyone with relevant knowledge or personal experience can submit.
- **Portal**: live list of inquiries currently accepting evidence: https://committees.parliament.uk/inquiries/?showadvanced=true&currentlyacceptingevidence=true . Each inquiry page (e.g. https://committees.parliament.uk/work/9682/student-loans-and-taxation-of-graduates/) links its call for evidence (e.g. https://committees.parliament.uk/call-for-evidence/3870) with an online submission form and a stated deadline (that inquiry's deadline was "5.00 pm on Tuesday 14th April 2026" — wording captured 2026-07-06).
- **Format rules** (quoted from the guidance):
  - "Keep your evidence short and to the point. Use section headings and numbered paragraphs. If you write more, offer a summary at the start."
  - "Send a **single file in Microsoft Word or another editable format**. Please do not send multiple files, or uneditable formats like PDF. Your file should be less than **25MB**." No logos for organisations.
  - "Do not include your contact details" in the document (collected separately by the form).
  - "Your contribution must be **original**, created specifically for the committee and not already published elsewhere."
  - Evidence is normally **published permanently** under your name; you may request **anonymity** (published without name) or **confidentiality** (not published at all) but "it is for the committee to say whether it will agree".
  - "Committees cannot help you with an individual problem or a specific complaint."
- Recommendations in committee reports "are not binding on the Government. But they are influential."

---

## 3. Public Accounts Committee (PAC) + National Audit Office (NAO)

- PAC remit (exact wording from https://committees.parliament.uk/committee/127/public-accounts-committee/, fetched 2026-07-06): "The Public Accounts Committee examines the **value for money** of Government projects, programmes and service delivery. **Drawing on the work of the National Audit Office** the Committee holds government officials to account for the economy, efficiency and effectiveness of public spending." (Officials — i.e. HMRC's Permanent Secretary — not ministers, is the PAC pattern; e.g. HMRC Second Permanent Secretary Angela MacDonald listed as witness 8 July 2026, and HMRC compliance director 6 July 2026, per PAC events list fetched 2026-07-06.)
- **Chair: Sir Geoffrey Clifton-Brown MP** — Chair role start 2024-09-11, current **as of 2026-07-06**. Source: `https://committees-api.parliament.uk/api/Committees/127/Members?MembershipStatus=Current` (16 members).
- **Contact** (from `committees-api.parliament.uk`, fetched 2026-07-06): Email `pubaccom@parliament.uk`; Address `Public Accounts Committee, House of Commons, London, SW1A 0AA`; same "does not look at individual cases" disclaimer.
- Live HMRC-relevant inquiries as of 2026-07-06 (PAC page): **"HMRC's tax debt reduction efforts"** (opened 3 July 2026), **"Large business tax compliance"** (opened 12 Dec 2025), **"HMRC's anti-fraud intervention on child benefit"** (opened 24 Apr 2026). PAC inquiries accept written evidence through the same committees.parliament.uk portal (e.g. "Devolving power in England — Written evidence: Accepting, Deadline 17 August 2026" shown on the same page).

### The MTD paper trail (the key citations for sole traders/landlords)
- **NAO report: "Progress with Making Tax Digital"**, published **12 June 2023** (page datePublished 2023-06-12, verified in page source 2026-07-06). URL: https://www.nao.org.uk/reports/progress-with-making-tax-digital/ . Conclusions include: "**HMRC has not demonstrated the programme offers the best value for money** for digitalising the tax system"; "The repeated delays and rephasing of MTD has undermined its credibility and increased its costs"; later business cases "significantly underplaying the total cost to customers"; recommends "a robust business case which includes a comprehensive and up-to-date assessment of the costs to customers of implementing MTD."
- **PAC report: "Progress with Making Tax Digital"** — Eightieth Report of Session 2022-23, **HC 1333**, published **24 November 2023** (publication metadata from `committees-api.parliament.uk/api/Publications?CommitteeBusinessId=7702`, fetched 2026-07-06; inquiry "Progress with making tax digital" opened 16 May 2023). Full summary HTML fetched 2026-07-06: https://publications.parliament.uk/pa/cm5803/cmselect/cmpubacc/1333/summary.html
  - **Cost findings (exact figures from the summary):** "Seven years in, with **£640 million of taxpayer's money spent**, we are concerned that the final bill for the programme could end up much higher than **HMRC's latest forecast of £1.3 billion**."
  - "HMRC completely underestimated the scale of the challenge ... repeated delays and spiralling costs. The programme is now running **at least eight years late for Self-Assessment** with the government's most recent announcement in December 2022, pushing it back to 2026 for the first customers affected."
  - "We are concerned that **HMRC omitted upfront costs to customers** transitioning to Making Tax Digital from its recent business cases." / "The programme was originally expected to reduce the overall burden on customers but will now **impose significant additional burdens and costs on customers** at a time when many can least afford it."
  - Context figures: MTD aims at "the £9 billion of tax revenue lost each year from taxpayer errors"; MTD for VAT "contributing £400 million a year in additional tax revenue" (HMRC estimate).
  - Government reply: Treasury Minutes, February 2024 (HC-series), PDF: https://assets.publishing.service.gov.uk/media/65cb4a2173806a000cec7742/Treasury_Minutes_-_February_Web.pdf#page=5 (link from the same API record).
- Citizen relevance: NAO chooses its programme of value-for-money studies and **takes public correspondence** (nao.org.uk); PAC then holds hearings on NAO reports. For MTD-affected taxpayers, PAC/NAO reports are the strongest official ammunition to quote when writing to an MP.

---

## 4. Petitions — petition.parliament.uk

Source for mechanics: https://petition.parliament.uk/help (fetched 2026-07-06):
- Create/sign: "British citizens and UK residents". A new petition needs **5 supporters** to be published. Petitions run for **6 months**.
- **"Petitions that get 10,000 signatures get a response from the UK Government."**
- **"All petitions that get 100,000 signatures will be considered for debate, and are usually debated"** — debates are usually in Westminster Hall on Mondays (see §1); the Petitions Committee ("a group of 11 MPs from government and opposition parties") decides, and may decline if the topic was recently or will soon be debated.
- Debates "are considered for" — note the honest wording: 100k = consideration, not a guarantee; and a debate is **not a vote on changing the law**.

### Honest track record on tax petitions (all from petitions JSON API, fetched 2026-07-06)
- **"Stop HMRC implementing making tax digital and enforcing quarterly submissions"** (petition 729235; open 2 Jul 2025 – 2 Jan 2026): **20,086 signatures** → Government response 15 Oct 2025: "Making Tax Digital will help businesses stay on top of their affairs ... The Government will support users and **has no plans to delay**." **Not debated.** JSON: https://petition.parliament.uk/petitions/729235.json
- **"Raise the income tax personal allowance from £12,570 to £20,000"** (petition 702844; open Dec 2024 – Jun 2025): **281,794 signatures** → response + **debated 12 May 2025** (Hansard transcript: https://hansard.parliament.uk/commons/2025-05-12/debates/EEB4E70E-87F1-450E-8CA7-1C38E316913F/IncomeTaxPersonalAllowance). Government position unchanged ("committed to keeping taxes for working people as low as possible while ensuring fiscal responsibility"). JSON: https://petition.parliament.uk/petitions/702844.json
- **"Delay implementation of IR35 legislation reform until COVID-19 is resolved"** (archived petition 552730): **26,006 signatures** → response, no debate. https://petition.parliament.uk/archived/petitions.json?q=IR35
- **"Reverse IR35 legislation"** (archived 625524): 14,160 signatures → response, no debate.
- Long tail: most MTD petitions never reach 10k (e.g. "HMRC: extend MTD ITSA quarterly update deadline from 5 weeks to 3 months" — 879 sigs as of 2026-07-06, open; "Create a government-owned, free software for Making Tax Digital" — 899 sigs, open). Current-parliament MTD search: https://petition.parliament.uk/petitions.json?q=Making+Tax+Digital&state=all
- **Takeaway for readers:** petitions reliably produce an on-the-record government statement at 10k and sometimes a Westminster Hall debate at 100k — they put issues on record and give MPs a peg, but no recent tax petition has by itself changed tax policy.

---

## 5. The Finance Bill and its Public Bill Committee

### Why it moves fast — the Finance Act 2026 timeline (Bills API, `bills-api.parliament.uk/api/v1/Bills/4042/Stages`, fetched 2026-07-06)
- Commons 1st reading **2 Dec 2025** (following the Autumn Budget) → 2nd reading + programme motion 16 Dec 2025 → **Committee of the whole House 12–13 Jan 2026** (the politically big clauses are taken on the floor of the House) → **Public Bill Committee 27 Jan, 29 Jan, 3 Feb 2026** (three sittings for everything else) → Report + 3rd reading 11 Mar 2026 → Lords: 2nd reading and 3rd reading same day 17 Mar 2026, **"Committee negatived"** (the Lords does not amend Finance Bills — Commons financial privilege) → **Royal Assent 18 Mar 2026**. Budget to Act in ~3.5 months; committee scrutiny of most clauses compressed into days.
- Practical consequence: if you want to influence a Finance Bill, the window is **short** — between 2nd reading and the end of committee stage (weeks, not months).

### How evidence gets in
Source: https://www.parliament.uk/get-involved/have-your-say-on-laws/input-into-legislation/ (fetched 2026-07-06):
- "After the second reading of a bill in the House of Commons, it will usually be referred to a public bill committee ... If the public bill committee decides to issue a 'call for evidence', **anyone can submit written evidence on the bill while the committee is meeting**. Information sent in by the public is **circulated to all the MPs that are serving on the committee**."
- Ask your MP to table (or support) an amendment: "changes can be made to a bill during its committee and report stages. You can ask your MP if they will table an amendment to the bill before it is debated at these stages." Tabled amendments appear in the publications section of the bill's page on https://bills.parliament.uk/ .
- Which committees are taking evidence now / how to submit: links on that page (Scrutiny Unit pages); bill progress at https://bills.parliament.uk/ .
- Note: PBC meetings are public; transcripts in Hansard; watch on parliamentlive.tv.

---

## 6. Lords Economic Affairs Committee — Finance Bill Sub-Committee (FBSC)

- Parent committee: **Economic Affairs Committee** (Lords). Contact (exact, from `committees-api.parliament.uk/api/Committees?SearchTerm=Economic%20Affairs`, fetched 2026-07-06): Email `economicaffairs@parliament.uk`; Phone `020 7219 5358 (committee staff) | 020 7219 6640 (Press Officer)`; Address `Economic Affairs Committee, House of Lords, London SW1A 0PW`.
- **Finance Bill Sub-Committee** (committee id 230; page https://committees.parliament.uk/committee/230/finance-bill-subcommittee/):
  - Purpose (exact, from `committees-api.parliament.uk/api/Committees/230`, fetched 2026-07-06): "The Economic Affairs Finance Bill Sub-Committee considers aspects of the Finance Bill from the point of view of **technical issues of tax administration, clarification and simplification**." (It stays off the tax *rates* — that's Commons privilege — and onto how tax administration will actually work: exactly the MTD zone.)
  - **Chair: Lord Liddle**, role start 2025-09-02, current as of 2026-07-06 (5 members; appointed sessionally). Source: `https://committees-api.parliament.uk/api/Committees/230/Members?MembershipStatus=Current`
  - Contact (exact, from API): Email `financebill@parliament.uk`; Phone `020 7219 5313 (committee staff) | 020 7219 6640 (Press Officer)`; Address `Economic Affairs Finance Bill Sub-Committee, House of Lords, London SW1A 0PW`. It issues its own calls for written evidence each autumn on the draft Finance Bill.

### FBSC's MTD scrutiny record — HMRC's sharpest parliamentary critic on MTD
- **2017: "Draft Finance Bill 2017: Making Tax Digital for Business"** (Session 2016-17, HL Paper 137). Contents page fetched 2026-07-06: https://publications.parliament.uk/pa/ld201617/ldselect/ldeconaf/137/13702.htm . Its core line, as quoted by the committee itself in 2018: "**Where the Government is wrong is not in the principle, but in the transitional arrangements**."
- **2018: "Making Tax Digital for VAT: Treating Small Businesses Fairly"** — 3rd Report of Session 2017-19, **HL Paper 229, published 22 November 2018**. Summary fetched 2026-07-06: https://publications.parliament.uk/pa/ld201719/ldselect/ldeconaf/229/22903.htm . Findings/recommendations (exact):
  - "As much as **40 per cent of affected businesses have not heard of Making Tax Digital**, let alone have started to prepare."
  - On HMRC's revenue case: "We were not convinced of this logic in 2017, and **we remain unconvinced now**."
  - "HMRC has also assumed that the programme will result in **no additional accountancy fees** ... This conflicts with the weight of evidence we have received."
  - Recommended: defer mandatory MTD for VAT "by at least one year"; wait "until at least April 2022 to implement the next stages"; "The Government and HMRC have **failed to listen** to our previous report."
- **2021: "Basis Period Reform and Uncertain Tax Treatments"** — 2nd Report of Session 2021-22, HL Paper 128, published 15 Dec 2021 (API metadata) . Summary fetched 2026-07-06: https://publications.parliament.uk/pa/ld5802/ldselect/ldeconaf/128/12803.htm . Key lines:
  - "We have questioned the wisdom of introducing both basis period reform and Making Tax Digital at a time when many businesses are recovering from ... Covid. We recommend that, for those businesses which do not have a 31 March–5 April year end, **Making Tax Digital should be deferred until at least 2025–26**." (The government later delayed MTD ITSA to 2026 — announced Dec 2022, per the PAC report above.)
  - Criticised HMRC's "**start—stop**" approach to tax policy and recommended "an independent report into HMRC customer service levels and capacity to implement change."
- Other FBSC reports in the record (via `committees-api` publications list, fetched 2026-07-06): "New powers for HMRC: fair and proportionate?" (4th Report 2019-21, pub 19 Dec 2020, HL 198); "Research and development tax relief and expenditure credit" (Jan 2023, HL 137 of 2022-23); "R&D tax relief, HMRC data requirements, promoters of tax avoidance..." (Feb 2024, HL 52); "Inheritance tax measures: unused pension funds and agricultural and business property relief" (3rd Report, pub 28 Jan 2026, HL 250 — govt response 30 Mar 2026).

---

## 7. All-Party Parliamentary Groups (APPGs) relevant to tax / self-employment

- The official registry: **Register of All-Party Parliamentary Groups**, maintained under the Parliamentary Commissioner for Standards. Index: https://www.parliament.uk/mps-lords-and-offices/standards-and-financial-interests/parliamentary-commissioner-for-standards/registers-of-interests/register-of-all-party-party-parliamentary-groups/ (fetched 2026-07-06). Latest edition **as at 29 June 2026**: https://publications.parliament.uk/pa/cm/cmallparty/260629/contents.htm (fetched 2026-07-06; PDF: .../register-260629.pdf). New editions ~every 6 weeks (2026 editions so far: 12 Jan, 23 Feb, 13 Apr, 18 May, 29 Jun).
- APPGs are informal cross-party groups with no official status, but each register entry lists officers and a **public enquiry point** — a direct route to the MPs most engaged with your issue.
- Groups in the 29 June 2026 register relevant to TaxSorted's audience (all listed on the contents page fetched 2026-07-06):
  - **Loan Charge and Taxpayer Fairness** — entry fetched 2026-07-06 (https://publications.parliament.uk/pa/cm/cmallparty/260629/loan-charge-and-taxpayer-fairness.htm). Purpose (exact): "To raise concerns about the Loan Charge legislation and associated HMRC action against thousands of freelance, contract and locum workers and small company owners in the UK, as well as the wider context of fairness of the tax system and the **conduct, performance and accountability of HMRC**." Officers as of that register: Chair & Registered Contact **Sammy Wilson (DUP)**; Co-Chair Greg Smith (Con); Vice Chairs Emily Darlington (Lab), Sarah Olney (LD). Contact: Sammy Wilson MP, House of Commons, London, SW1A 0AA, Tel 020 7219 8523, Email `barronj@parliament.uk`; Public Enquiry Point: Richard Clancey, Loan Charge Action Group, Tel 07973 621134, Email `contact@loanchargeappg.co.uk`; website https://www.loanchargeappg.co.uk ; secretariat: Loan Charge Action Group (https://www.hmrcloancharge.info/).
  - **Anti-Corruption and Responsible Tax** — https://publications.parliament.uk/pa/cm/cmallparty/260629/anti-corruption-and-responsible-tax.htm (listed; entry not fetched).
  - **Council Tax Reform** — .../council-tax-reform.htm (listed).
  - **Entrepreneurship** — .../entrepreneurship.htm (listed).
  - **Freelancers** — .../freelancers.htm (listed in register contents; entry page did not render via proxy — officers/contact unverified, fetch before publishing details).
  - Adjacent: Hospitality and Tourism; Rural Business and the Rural Powerhouse; Ethnic Minority Business Owners (all listed on contents page).

---

## 8. Data-file-ready: contact routes (all copied exactly from official sources, 2026-07-06)

| Body | Role on tax | Email | Phone | Address | Source |
|---|---|---|---|---|---|
| Your MP (any) | Casework, ministerial letters, PQs, amendments | via members.parliament.uk profile | 020 7219 3000 (switchboard) | House of Commons, London SW1A 0AA | parliament.uk/get-involved/contact-an-mp-or-lord/contact-your-mp/ |
| Treasury Committee | Policy scrutiny of HMT + HMRC | treascom@parliament.uk | — | Treasury Committee, House of Commons, London, SW1A 0AA | committees-api.parliament.uk (Committees?SearchTerm=Treasury) |
| Public Accounts Committee | Value-for-money scrutiny of HMRC | pubaccom@parliament.uk | — | Public Accounts Committee, House of Commons, London, SW1A 0AA | committees-api.parliament.uk (id 127) |
| Lords Economic Affairs Cttee | Economic policy scrutiny | economicaffairs@parliament.uk | 020 7219 5358 (committee staff) / 020 7219 6640 (Press Officer) | Economic Affairs Committee, House of Lords, London SW1A 0PW | committees-api.parliament.uk (id 175) |
| Lords Finance Bill Sub-Cttee | Technical scrutiny of draft Finance Bill | financebill@parliament.uk | 020 7219 5313 (committee staff) / 020 7219 6640 (Press Officer) | Economic Affairs Finance Bill Sub-Committee, House of Lords, London SW1A 0PW | committees-api.parliament.uk (id 230) |
| Petitions service | 10k=response, 100k=debate consideration | (web only) | — | https://petition.parliament.uk | petition.parliament.uk/help |
| Loan Charge & Taxpayer Fairness APPG | HMRC conduct/fairness campaigning | contact@loanchargeappg.co.uk (public) / barronj@parliament.uk (registered) | 07973 621134 (public) / 020 7219 8523 (registered) | Sammy Wilson MP, House of Commons, London, SW1A 0AA | publications.parliament.uk/pa/cm/cmallparty/260629/loan-charge-and-taxpayer-fairness.htm |

Both Commons committees carry this disclaimer (copy for the site): "We receive a significant number of emails each day. All requests and invitations are considered but we do not respond directly to everyone. Please be aware, the committee does not look at individual cases or specific complaints."

---

## 9. Editorial skeleton for the public page (suggested)

1. **Your MP is the universal adapter** — one constituent letter can become: a ministerial letter (civil servants must reply), a written question (answer goes on the public record at questions-statements.parliament.uk), a Westminster Hall debate, or a Finance Bill amendment. Post: House of Commons, London SW1A 0AA; phone 020 7219 3000; find them: members.parliament.uk/FindYourMP; or writetothem.com (own words — identikit letters are blocked and discounted).
2. **Committees are where HMRC answers questions under the lights.** Treasury Committee = policy; PAC (+NAO) = value for money; Lords FBSC = technical fairness of each Finance Bill. All three take public written evidence through one portal; format: one editable file, numbered paragraphs, original text.
3. **The receipts exist.** NAO 2023: MTD "not demonstrated ... best value for money". PAC 2023: £640m spent, £1.3bn forecast doubted, customer costs omitted, 8 years late. Lords 2018: "failed to listen". Lords 2021: defer MTD to 2025-26 (it was). Quote these when you write.
4. **Petitions: what 10k and 100k actually buy** — a written government position, maybe a Monday debate; not a law change. Real examples above.
5. **Speed matters on the Finance Bill** — Budget in late Nov, Royal Assent by mid-Mar. If you wait for the Act, you're a year early for the next one and a year late for this one.
6. **Find your allies** — APPG register (who already campaigns on your issue), TheyWorkForYou alerts (who talks about it), select committee membership lists (who asks the questions).

## 10. Source log (all fetched 2026-07-06)

Direct fetches (WebFetch/curl):
- https://petition.parliament.uk/help
- https://petition.parliament.uk/petitions/729235.json ; /petitions/702844.json ; /petitions.json?q=Making+Tax+Digital&state=all ; /archived/petitions.json?q=IR35&state=all
- https://www.writetothem.com/ ; https://www.writetothem.com/about-qa
- https://www.theyworkforyou.com/
- https://www.nao.org.uk/reports/progress-with-making-tax-digital/
- https://members-api.parliament.uk/api/Location/Constituency/Search?searchText=SW1A%201AA ; https://members-api.parliament.uk/api/Members/5257/Contact
- https://committees-api.parliament.uk/api/Committees?SearchTerm=Treasury ; ...?SearchTerm=Public%20Accounts ; ...?SearchTerm=Economic%20Affairs ; /api/Committees/158 ; /api/Committees/230 ; /api/Committees/158/Members?MembershipStatus=Current ; /api/Committees/127/Members?MembershipStatus=Current ; /api/Committees/230/Members?MembershipStatus=Current ; /api/CommitteeBusiness?SearchTerm=Making%20Tax%20Digital ; /api/CommitteeBusiness/7702 ; /api/Publications?CommitteeBusinessId=7702 ; /api/Publications?CommitteeId=230&Take=40 ; /api/CommitteeBusiness?CommitteeId=158&SearchTerm=HMRC
- https://bills-api.parliament.uk/api/v1/Bills?SearchTerm=Finance&BillType=1&SortOrder=DateUpdatedDescending ; /api/v1/Bills/4042/Stages
- https://oralquestionsandmotions-api.parliament.uk/EarlyDayMotions/list?parameters.searchTerm=tax

Fetched via r.jina.ai reader proxy (parliament.uk blocks non-browser clients; real URLs recorded):
- https://www.parliament.uk/get-involved/contact-an-mp-or-lord/contact-your-mp/
- https://members.parliament.uk/FindYourMP (title/description only — page is JS)
- https://www.parliament.uk/about/mps-and-lords/members/raising/
- https://www.parliament.uk/about/how/business/edms/
- https://www.parliament.uk/about/how/business/debates/westminster-hall-debates/
- https://www.parliament.uk/get-involved/committees/ ; https://www.parliament.uk/get-involved/committees/give-evidence-to-a-select-committee/
- https://www.parliament.uk/get-involved/have-your-say-on-laws/input-into-legislation/
- https://committees.parliament.uk/committee/158/treasury-committee/ ; https://committees.parliament.uk/committee/127/public-accounts-committee/ ; https://committees.parliament.uk/work/9682/student-loans-and-taxation-of-graduates/
- https://publications.parliament.uk/pa/cm5803/cmselect/cmpubacc/1333/summary.html
- https://publications.parliament.uk/pa/ld201719/ldselect/ldeconaf/229/22902.htm ; /229/22903.htm
- https://publications.parliament.uk/pa/ld201617/ldselect/ldeconaf/137/13702.htm
- https://publications.parliament.uk/pa/ld5802/ldselect/ldeconaf/128/12803.htm
- https://www.parliament.uk/mps-lords-and-offices/standards-and-financial-interests/parliamentary-commissioner-for-standards/registers-of-interests/register-of-all-party-party-parliamentary-groups/ (+ /registers-published-in-2026/)
- https://publications.parliament.uk/pa/cm/cmallparty/260629/contents.htm ; .../loan-charge-and-taxpayer-fairness.htm
- https://questions-statements.parliament.uk/

Known gaps / re-verify before publish:
- Freelancers APPG entry page did not render (officers unverified).
- Petitions Committee chair not captured (help page says 11 MPs; chair name would need committees-api id lookup).
- "usually debated" at 100k is the service's own claim; our examples confirm one debated (702844) and one 20k not debated (729235) — consistent.
- Names/chairs recorded as of 2026-07-06; re-check chairs via committees-api before each publish.
