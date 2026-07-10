# UK public-integrity and law-enforcement method

Checked: 10 July 2026

This is the editorial and safety contract for the finance, corporate-relationship
and law-enforcement APIs under `/v1/politics/uk`. It is a public-accountability
graph, not a universal people dossier.

## What a relationship means

Each official record stays a typed event: declared interest, donation, loan,
meeting, gift, hospitality, lobbyist-client return, contract, grant, subsidy,
company record, land title or final official finding. Each event says what it
proves and what it does not prove.

A donation, meeting and later contract are three records. Their shared entity is
not evidence of influence, favouritism, an exchange of benefits or corruption.
TaxSorted creates no causal edge unless a competent official body explicitly
publishes that finding. Allegation, investigation, finding, sanction, correction
and appeal are separate dated states.

Automatic joins require an exact official identifier: Parliament member ID,
Companies House number, charity number, Electoral Commission reference, OCID or
the source's own stable record ID. A name-only match is a review candidate and is
never an automatic merge.

Money is stored in integer minor units with a currency and an
exact/range/band/estimate basis. A contract award is not proof of payment or
performance. A price-paid record is not current ownership.

## Finance and corporate sources

The first live feed is the Contracts Finder OCDS award API, with supplier names
disclosed only when a verified public organisation identifier is present.
The projection removes buyer and supplier addresses, contact people, emails,
phone numbers and attachment bodies. Supplier names appear only with a verified
public organisation identifier.

The GOV.UK monthly ministerial gift and hospitality parser is built, but named
records have a separate publication gate. It keeps only reviewed columns and
never joins a published counterparty by name.

Mapped next sources are:

- Commons Interests API: corporate employer, donor, company number, declared
  value and coarse land descriptions after category and free-text review;
- Register of Consultant Lobbyists: registrant organisations, company numbers,
  organisation clients, quarters and nil returns;
- the APPG register: group purpose, Parliamentary officers, secretariat
  organisation and reported qualifying benefits after reviewed extraction;
- Find a Tender OCDS notices;
- Government Grants Register and UK subsidy database;
- department payments, IPSA bulk business-cost files and Charity Commission
  organisation identity after their separate field and feed reviews;
- corporate identity from Companies House, excluding officer, individual PSC,
  address, birth, signature and filing-image data;
- department spending CSVs and charity identity sources after source-specific
  reuse review.

Political Finance Online remains closed until the Electoral Commission confirms
the bulk database's reuse and attribution terms. The bulk file itself can contain
individual donor records, so fetching it also requires a separate Article 9,
minimisation and retention decision. Even after both gates open, the outward
projection is verified companies only.

HM Land Registry corporate ownership data requires an account and a
dataset-specific licence. TaxSorted does not provide a natural-person reverse
property search. Declared land interests use only the declaration category and a
coarse description; exact addresses, title numbers, coordinates and residence
clues are removed.

## Law enforcement is not one command chain

The graph uses explicit relationship types:

- `appoints_and_can_remove`
- `sets_strategy_for`
- `directs_operationally`
- `holds_to_account`
- `accountable_to`
- `inspects`
- `receives_complaints_about`
- `prosecutes_cases_from`

Every relationship carries a negative constraint. In England and Wales, a PCC
or policing mayor sets strategy and budget and appoints the chief constable, but
does not issue operational orders. The chief constable directs the force. Police
investigate; the CPS independently decides and conducts prosecutions; courts
adjudicate. IOPC complaint oversight and HMICFRS inspection are separate again.

Scotland has Police Scotland, the Scottish Police Authority, PIRC, HMICS and
COPFS. The Chief Constable directs policing and resources, subject to law,
authority oversight and lawful prosecutorial instructions in relevant
investigations. Northern Ireland separately has PSNI, the Northern Ireland
Policing Board, Police Ombudsman, inspection and PPSNI. The NCA Director General
is accountable to the Home Secretary and Parliament while operational decisions
remain independent.

Funding, sponsorship, appointment, inspection or political accountability never
silently becomes operational command.

## People threshold

Named law-enforcement people are limited to elected, statutory or officially
designated senior accountability offices. The current institution must
deliberately publish the name, effective term and accountability purpose. A
security, necessity, licence and privacy review must approve the source family.

Even when enabled, the API returns only the senior public name, rank or office
and official role context. It does not return biographies, family details,
direct emails, personal phone numbers, addresses or personal social accounts.

Parliament-published staff are a different source family and have their own
gate. Enabling member records does not fetch or publish staff names. That gate
stays closed until necessity, reasonable expectations, correction handling and
the exact public fields are approved.

Commons registered interests also have their own gate. A member profile does
not fetch those records while it is closed. Opening it requires category-level
third-party review and stronger handling of land, family, payer, donor and
location details than a broad member-directory approval.

Never publish:

- rank-and-file, investigator, intelligence, firearms, undercover or protection
  rosters;
- collar numbers, shifts, duty stations, deployments, incident commanders,
  tactics, live operations, protected locations or response routes;
- officer-specific complaints, allegations, disciplinary histories or open
  cases;
- victim, witness, minor, suspect, conviction, biometric or location dossiers;
- bulk private-security individual licence records.

Generic institutional switchboards, forms, FOI, complaints and recruitment
routes are allowed. Email addresses are never inferred.

## Pay, people and public activity

Pay data is a versioned institutional dataset: jurisdiction, rank, pay point,
effective date, base pay, allowances, pension and benefits remain separate.
Named exact salary appears only where a senior-remuneration publication clearly
requires it and a separate review approves it.

Workforce and demographics are aggregate only. Source suppression is preserved,
small intersections are broadened or withheld, and query combinations must not
permit differencing. TaxSorted does not infer a characteristic about a person.

Vacancies contain only the current title, closing date and official application
link. Applicant data is never collected. Public activities mean published board
meetings, agendas, minutes, inspection programmes, reports, strategies and
official speeches—not operational activity logs.

Private security is organisation-first. The map explains the SIA's regulatory
role, verifies companies through official identifiers and can show public awards
to verified suppliers. The individual SIA checker remains an official link for
a supplied licence, not a bulk directory. A licence or private-security job is
not represented as the office of constable or general police power.

## Power cards

The enforcement method scores seven visible dimensions from zero to five:
coercive authority, operational direction, prosecution discretion, rules and
sanctions, money and resources, appointments and removal, and geographic scope.
The display score is a rounded summary, not a leaderboard.

Scores belong to an office or institution, never its holder. Fame, budget size,
relationships, donations, allegations and supposed influence add no points.
Every card shows territory, exercise mode, legal constraints, source IDs,
law-as-at date and evidence coverage. Compare only the same office family,
jurisdiction and method version.

## Observable official language

The safe name is “Observable language in official texts.” The method permits
reproducible surface measures from Hansard, attributable official speeches,
signed letters and official transcripts. A department press release belongs to
the institution unless authorship is explicit; “delivered by” does not mean
“written by.”

The minimum corpus is ten documents, 5,000 words, three dates and 30 days.
Allowed outputs include sentence length, question rate, first-person pronouns,
modal terms, contrast connectors, numeric-token rate and speaking-turn length.
Every result needs its numerator, denominator, tokeniser version, language,
corpus dates, source URLs and hashes.

No sentiment, honesty, aggression, manipulation, ideology, competence, emotion,
personality, mental-state, management-style or intent score is allowed. People
are not ranked. Identifiable analysis remains unimplemented until a separate
legitimate-interests assessment, DPIA and Article 14 notice are approved.

## Publication controls

Once bulk publication is approved and open, non-personal institutions, methods and source maps
stay independent of every named-person switch. While bulk publication is awaiting approval or
emergency-stopped, those older static routes return `503`. The live contract query follows buyer
identity from the official award and discloses a supplier name only when an approved organisation
identifier verifies that supplier. Named features fail closed in production. The master emergency
switch overrides every personal-data feature:

```text
POLITICS_PERSONAL_DATA_EMERGENCY_STOP=true
```

Named responses use `Cache-Control: no-store`. The stop blocks new upstream
fetches and responses; operators must also purge any external cache before
considering the incident contained. Re-enablement is manual and reviewed.

The source registry and live publication state are available at:

- `/v1/politics/uk/integrity`
- `/v1/politics/uk/integrity/sources`
- `/v1/politics/uk/integrity/corrections`
- `/v1/politics/uk/relationships/schema`
- `/v1/politics/uk/relationships/datasets`
- `/v1/politics/uk/enforcement/institutions`
- `/v1/politics/uk/enforcement/governance`
- `/v1/politics/uk/enforcement/power/offices`

## Open distribution

Institutional, aggregate and organisation-only datasets marked available are a
commons. They require no account, API key or payment. Start at:

- `/v1/open-data` for every TaxSorted public dataset;
- `/v1/politics/uk` for politics discovery;
- `/v1/politics/uk/datasets` or its `/manifest` alias for the machine catalogue;
- `/v1/politics/uk/datasets/rights` for the curation and source-rights boundary.

Each catalogue entry has a permanent dataset ID, primary key, field order,
record count, source IDs where applicable, update cadence, snapshot date, schema version,
content-derived dataset version, licence note and ready-to-copy JSON, CSV and
NDJSON links. Each record has a stable `id`. IDs must not be recycled; a public
release and tombstone ledger remains necessary to audit that promise across time.

JSON downloads are self-describing envelopes. NDJSON is one canonical record
per line. CSV follows the published field order, uses CRLF rows, stores nested
values as canonical JSON in one cell, keeps money in integer minor units and
neutralises spreadsheet formula prefixes. All formats have exact-byte ETags,
SHA-256 checksums, `Last-Modified`, record-count and dataset-version headers.
Use `If-None-Match` to mirror efficiently; `304` means that exact format has
not changed.

The bulk catalogue contains no current-member directory, staff, registered
interests, political donations, ministerial counterparties or senior-officer
names. A later approval for a purpose-bound named lookup does not create a
bulk download. Live contract awards with verified supplier disclosure remain a
bounded query service because an ever-growing event archive needs its own
retention and correction design.

`POLITICS_BULK_DATA_EMERGENCY_STOP=true` independently stops curated static
record bodies in both the dataset downloads and older static reading routes if
a projection is later found unsafe. The catalogue, mixed-rights statement,
bulk dataset schemas and correction method stay readable so the reason and repair can be
inspected. Re-enablement is manual after review and correction.

Production serving also requires `POLITICS_BULK_DATA_ENABLED=true`. That
release switch should remain closed until Yu adopts the boundary, per-dataset
admission records have a human decision, and a confidential safety-reporting route is live. It
is valid in production only when the same secrets update records the public approver, approval
date, exact current admission-ledger digest and HTTPS confidential-intake URL. The catalogue,
admission ledger and record descriptors then report that decision together. A missing or stale
value keeps serving closed. This is a publication decision, never an account or payment tier.

TaxSorted's curated schema and summaries use the repository content licence.
Underlying official material retains its source-specific terms. Reusers should
keep `sourceIds`, attribution and the source ledger with the data.

This method is not legal advice. Production publication still needs the recorded
lawful-basis, rights, security and correction decisions described in the data
protection assessment.
