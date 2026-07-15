# UK politics directory — source and publishing record

**Last checked:** 2026-07-10
**Status:** non-personal system API ready; personal publication gated
**Stance:** official-source first, non-partisan, no inferred personal data

## First prepared layer

The first layer is Westminster. It joins these official records without claiming
to cover all UK politics:

- current Commons and Lords members, parties, seats and membership dates;
- government and opposition posts;
- public professional office contacts;
- declared interests, recent Parliamentary contributions and the latest
  constituency election result;
- a public-staff field that remains unapproved until the necessity and reasonable-
  expectations review is complete;
- a separate party-donations feed, disabled until the Electoral Commission confirms
  bulk database-reuse and attribution terms in writing.

Devolved legislatures, local councils, special advisers, senior civil servants,
party officers, lobbying returns and ministerial meetings are separate source
families. They belong in later layers, each with its own licence and privacy
decision.

The first public-integrity layer now maps those later source families without
pretending they are all safe to republish. Organisation-only public-contract
awards and police-force institutions have live whitelisted façades. Ministerial
benefits and senior police-office names have independent gates. Corporate land,
lobbying, grants, subsidies, company roles and further declarations expose their
source and publication state before any record feed opens. The full contract is
in `public-integrity-method.md`.

## Proposed official words and actions layer

The proposed [official-events method](official-events-method.md) defines three
evidence collections: institutional official events, separately gated named
attributions and append-only corrections. It keeps source text link-only,
requires exact official identifiers and forbids inferred vote choices,
personality, rhetoric, motive or influence. It is a method proposal only; no
official-events dataset or endpoint is implemented or released.

## Non-personal system layer

The political-system endpoints stay readable while the people gate is closed.
They publish the UK Parliamentary election responsibility chain, current
campaign-finance rules, public political-funding schemes, public-money
accountability, relationship-evidence rules, enforcement states, historical
coverage and a strict current-versus-proposed-law boundary.

Formal power is assessed against offices, never people. Six visible dimensions
(executive, law-making, oversight, enforcement, public money and appointments)
are scored under a versioned rubric. Jurisdiction and checks sit beside every
result; offices held by one person are never added. Current assessments are
marked provisional. The full editorial rule is in `system-method.md`.

## Public-office entry pathways

The public-office pathfinder joins role discovery to the exact official legal
door without collecting a political profile or applicant facts. Version 1
deeply maps a UK Parliamentary candidate in Great Britain and a principal-
council candidate in England. It keeps party selection separate from statutory
nomination, represents a non-applicable deposit differently from £0, dates
current law separately from proposed reform, and names every office family it
does not yet cover.

The market decision is in `public-office-market.md`; the editorial boundary is
in `public-office-pathways-method.md`; the reviewed machine corpus is
`data/public-office-pathways.json`.

## Sources and terms

### UK Parliament

- Members API and OpenAPI specification:
  <https://members-api.parliament.uk/index.html>
- Structured Commons interests API:
  <https://interests-api.parliament.uk/index.html>
- Open Parliament Licence v3.0:
  <https://www.parliament.uk/site-information/copyright/open-parliament-licence/>

Required attribution: “Contains Parliamentary information licensed under the
Open Parliament Licence v3.0.” The licence excludes personal data, Parliamentary
photographs, the Crowned Portcullis, trade marks and third-party rights. TaxSorted
does not republish member portraits. The licence does not replace a data-protection
lawful basis for names, contacts, staff or political affiliation.

### Electoral Commission

- Political Finance Online: <https://search.electoralcommission.org.uk/>
- Donations and loans publication explanation:
  <https://www.electoralcommission.org.uk/political-registration-and-regulation/financial-reporting/donations-and-loans>
- Privacy notice for regulated entities:
  <https://www.electoralcommission.org.uk/privacy-policy/regulated-entities>

Political Finance Online supplies official CSV/PDF downloads and undocumented
JSON/CSV routes used by its own interface. No blanket licence for bulk/commercial
reuse of that database was found on 2026-07-10. The separate Election Information
API licence does not cover Political Finance Online. Therefore TaxSorted's
normalized donation feed stays off until written reuse and attribution terms are
confirmed and the separate bulk-file privacy review is approved. The outward feed
is then verified companies only; the public UI links to the Commission meanwhile.

## Publication boundary

Publish:

- role and office facts deliberately published by an official body;
- generic or role-based inboxes, switchboards and office addresses;
- named professional contacts only where the official source expressly publishes
  them for public contact, with freshness and source dates;
- financial declarations as official facts, with their coverage limits.

Do not publish:

- home or residential addresses, personal phone numbers, inferred email addresses
  or private social accounts;
- donor street addresses or postcodes;
- candidate nomination addresses, electoral-register data or family details;
- inferred political beliefs, motive, control, corruption or wrongdoing;
- member portraits unless their separate image terms have been checked.

Registered-interest text is filtered to remove donor, payer, destination, location
and address lines. Public contact records are filtered to reject home, private,
personal and residential contact types. The original official record remains linked
so a reader can inspect the source in context.

## Production data-protection gate

Public availability does not remove UK GDPR duties. Before the directory is enabled
in production, record and approve:

1. an Article 6 lawful basis and legitimate-interests assessment;
2. an Article 9 condition for political-affiliation and other special-category fields;
3. a data-protection impact assessment for joining personal records at scale;
4. Article 14 privacy information, retention/freshness rules, and correction,
   objection and deletion handling;
5. a field-by-field decision for named staff and named professional contacts.

ICO references:

- Legitimate interests:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/>
- Conditions for special-category data:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-conditions-for-processing/>
- Data-protection impact assessments:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-impact-assessments/>
- The right to be informed:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/>

## API rules

- read-only and cookie-free;
- no API key for public official records;
- bounded pagination and date windows;
- upstream timeouts, useful institutional cache headers and no caching of errors
  or named-person responses;
- source URL and retrieval time in every successful response;
- no person matching by name alone;
- no silent claims of completeness;
- no private fields in logs or upstream error bodies.

Non-personal doors:

- `/system`, `/elections/process`, `/funding/rules`, `/funding/public`;
- `/power/method`, `/power/offices`, `/budgets/accountability`;
- `/relationships/method`, `/enforcement/method`, `/history/method`, `/law/watch`.
- `/integrity`, `/integrity/sources`, `/relationships/schema`,
  `/relationships/datasets`, `/relationships/contracts`;
- `/enforcement/institutions`, `/enforcement/governance`, generic rank/pay/
  workforce/funding/vacancy/activity source maps and `/enforcement/power/*`.
