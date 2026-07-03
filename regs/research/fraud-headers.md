# HMRC Fraud Prevention Headers (Gov-Client-*/Gov-Vendor-*) — spec for a WEB application

Research date: 2026-07-02; independently re-verified against live primary sources on 2026-07-03 (all quotes re-checked; raw copies re-downloaded to `raw/`).
Current specification version: **3.3, issued 27 January 2025** (HMRC Developer Hub guide); the legally
operative Commissioners' Directions were last updated on gov.uk **16 April 2025** and state they
"have effect from 16 October 2023", replacing the 6 January 2021 directions.

Primary sources fetched (raw copies saved alongside this file):

| Source | URL | Local copy |
|---|---|---|
| Main fraud prevention guide (v3.3) | https://developer.service.hmrc.gov.uk/guides/fraud-prevention/ | `guide.txt` |
| WEB_APP_VIA_SERVER header spec | https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/web-app-via-server/ | `webapp-text.txt` |
| Connection methods ("What you need to send") | https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/ | `connmethod.txt` |
| Getting it right (formats, checks, missing data) | https://developer.service.hmrc.gov.uk/guides/fraud-prevention/getting-it-right/ | `gir.txt` |
| Use the Test API | https://developer.service.hmrc.gov.uk/guides/fraud-prevention/test-api/ | `test-api.txt` |
| Change log | https://developer.service.hmrc.gov.uk/guides/fraud-prevention/change-log/ | (fetched inline) |
| Test Fraud Prevention Headers API docs + OAS | https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/txm-fph-validator-api/1.0 | `fph-oas.yaml` |
| SI 2019/360 (the regulations, as made) | https://www.legislation.gov.uk/uksi/2019/360/made | `si2019-360.txt` |
| Commissioners' Directions (force of law) | https://www.gov.uk/government/publications/direction-under-regulation-22-of-the-delivery-of-tax-information-through-software-ancillary-metadata-regulations-2019-si-2019360 (ODT: https://assets.publishing.service.gov.uk/media/67ffa43e694d57c6b1cf8e05/delivery_of_tax_information_through_software_ancillary_metadata_regulations_2019_S.I.2019_360_.odt) | `directions.txt` |
| Compliance and Sanctions Guidelines (PDF) | https://developer.service.hmrc.gov.uk/guides/fraud-prevention/Fraud%20Prevention%20Header%20Data%20Compliance%20and%20Sanctions%20Guidelines.pdf | `compliance-sanctions.pdf` |
| HMRC Transaction Monitoring DPIA v3.1 (public) | https://developer.service.hmrc.gov.uk/api-documentation/assets/content/documentation/3f4c263faa8231bea05c1826b7f6b81c-TxM%20DPIA%20v3%201%20Public.pdf | `txm-dpia.pdf` |
| ICO guidance: legal obligation lawful basis | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/legal-obligation/ | `ico-legal-obligation.html` |
| HMRC Developer Hub Terms of Use (production-access questionnaire) | https://developer.service.hmrc.gov.uk/api-documentation/docs/terms-of-use | `raw/tou.txt` |

---

## 0. Scope: who must send these headers

- "You are required by law to submit header data for the **VAT (MTD)** and **Income Tax Self Assessment (MTD)** APIs. This includes all associated APIs and endpoints." (guide, v3.3)
- TaxSorted (MTD IT quarterly updates + final declaration) is squarely in scope: the Directions
  explicitly cover MTD ITSA and note "It is HMRC's policy to only grant production credentials to
  MTD ITSA third party software products … where their products meet transaction monitoring
  requirements."
- The connection method for a browser-based product whose backend calls HMRC is
  **`WEB_APP_VIA_SERVER`**: "Your application is web based, connecting to HMRC through intermediary
  servers." Only include intermediary servers "that are part of your application domain and are in
  your control. Do not include third-party servers such as transport layers or internet providers."
- "Originating device means the device that initiates an action, for example a VAT return" — i.e.
  the user's browser/machine, not your server.

## 1. The current required header list for WEB_APP_VIA_SERVER

The spec page opens with a warning: **"You must submit data for all of these headers."** There is
no formal mandatory/optional split for this connection method — all 16 are required, but for 5 of
them the spec itself describes situations where "you will not be able to collect a value", in which
case the **missing-data protocol** applies (see §2.3): you must contact HMRC (SDSTeam@hmrc.gov.uk)
to explain, and only after that discussion may you omit the header or send it empty. Never send
placeholders (`null`, `undefined`).

The legally-binding Commissioners' Directions list **exactly the same 16 headers** for
"Web application via server" (verified against the 16 April 2025 ODT).

| # | Header | Effectively | Spec-recognised "cannot collect" case |
|---|--------|-------------|----------------------------------------|
| 1 | `Gov-Client-Connection-Method` | Always, fixed value `WEB_APP_VIA_SERVER` | — |
| 2 | `Gov-Client-Browser-JS-User-Agent` | Always | — |
| 3 | `Gov-Client-Device-ID` | Always | — |
| 4 | `Gov-Client-Multi-Factor` | If MFA used | "If you authenticate with username and password only, you will not be able to collect a value" |
| 5 | `Gov-Client-Public-IP` | Always in practice | "If the connection between client and server is over a private network" |
| 6 | `Gov-Client-Public-IP-Timestamp` | Always | — |
| 7 | `Gov-Client-Public-Port` | Always in practice | private network; "Some popular load balancers do not" support collecting it |
| 8 | `Gov-Client-Screens` | Always | — |
| 9 | `Gov-Client-Timezone` | Always | — |
| 10 | `Gov-Client-User-IDs` | Always | — |
| 11 | `Gov-Client-Window-Size` | Always | — |
| 12 | `Gov-Vendor-Forwarded` | Always | — (private-network hops excluded from list) |
| 13 | `Gov-Vendor-License-IDs` | If licensed software involved | "If there are no licenses on the originating device" |
| 14 | `Gov-Vendor-Product-Name` | Always | — |
| 15 | `Gov-Vendor-Public-IP` | Always in practice | private network case |
| 16 | `Gov-Vendor-Version` | Always | — |

Source: https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/web-app-via-server/

**Headers NOT required for WEB_APP_VIA_SERVER** (but required for other connection methods —
don't cargo-cult them from VAT desktop examples):
- `Gov-Client-Browser-Plugins`, `Gov-Client-Local-IPs`, `Gov-Client-Local-IPs-Timestamp` — dropped
  for web-app-via-server on 31 January 2022 ("If your application submits values for these headers
  it is not an issue").
- `Gov-Client-Browser-Do-Not-Track` — dropped in spec v3.2, 1 August 2023.
- `Gov-Client-User-Agent`, `Gov-Client-MAC-Addresses` — desktop/mobile methods only.
Source: change log, https://developer.service.hmrc.gov.uk/guides/fraud-prevention/change-log/

## 2. Exact formats and encodings

### 2.1 Global encoding rules (Getting it right page)

- "Header data contents must be submitted using the **US-ASCII** character set, with other
  characters **percent encoded**" (links to RFC 3986 §2.1).
- **Key-value structure**: `<key-1>=<value-1>&<key-2>=<value-2>&…` — "Keys and values must be
  percent encoded." "Key-value pairs can be submitted in **any order**." "Whenever a key is
  applicable but has no applicable value, you can omit the key-value pair or include the key with
  an empty value."
- **List structure**: `<value-1>,<value-2>,…` — "Values must be percent encoded." "Values must
  **not be empty**."
- **Do not percent-encode the separators** (`=`, `&`, `,`) — repeated per-header on the spec page.
- "You must not include a placeholder value, for example `null` or `undefined`."
Source: https://developer.service.hmrc.gov.uk/guides/fraud-prevention/getting-it-right/

### 2.2 Per-header format detail (quoting the WEB_APP_VIA_SERVER page)

1. **Gov-Client-Connection-Method** — literal `WEB_APP_VIA_SERVER` on every request.

2. **Gov-Client-Browser-JS-User-Agent** — "JavaScript-reported user agent string from the
   originating device", passed as reported by the browser:
   `Mozilla/5.0 (iPad; U; CPU OS 3_2_1 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Mobile/7B405`

3. **Gov-Client-Device-ID** — a **UUID** "generated by an application and persistently stored on
   the device. You can store the device ID in a hidden file, the Windows registry, or **in a
   cookie**. The identifier should not expire. If your end user deletes the device ID, you need to
   generate a new one." Example: `beec798b-b366-47fa-b1f8-92cede14a1ce`.
   (Change log 6 Jan 2021: must be a UUID.)

4. **Gov-Client-Multi-Factor** — list of key-value structures, one per factor, fields:
   - `type`: `TOTP` | `AUTH_CODE` | `OTHER`
   - `timestamp`: "UTC timestamp recording the time of the **last successful prompt** for this
     factor. As a minimum, use this format `yyyy-MM-ddThh:mmZ`. You can include seconds and
     milliseconds. You must include T and use the 24 hour format." (T + 24h clock mandated in v3.3.)
   - `unique-reference`: "identifies a single factor. For example, a salted-and-hashed phone number
     used for SMS, or an identifier linked to a TOTP secret, but not the secret itself. Use the
     same hashing function consistently."
   - "This relates to users accessing **your software**, not users granting authority for your
     software to access their data" (i.e. not the HMRC OAuth journey).
   Example: `type=AUTH_CODE&timestamp=2021-11-21T13%3A23Z&unique-reference=fc4b5f…,type=TOTP&timestamp=2021-11-21T13%3A20Z&unique-reference=0283da…`

5. **Gov-Client-Public-IP** — "public IPv4 or IPv6 address from which the originating device makes
   the request". Examples: `198.51.100.0`, `ABCD:EF01:2345:6789:ABCD:EF01:2345:6789`.

6. **Gov-Client-Public-IP-Timestamp** — "Collect the timestamp at the same time your application
   collects the client's public IP address. This is usually when the backend server receives the
   request from the client. It could be at the Web Application Firewall (WAF), load balancer,
   reverse proxy or the server process itself." Format `yyyy-MM-ddThh:mm:ss.sssZ`, `Z` = zero
   offset (convert if needed), "You must include T and use the 24 hour format", "You must include
   **seconds and milliseconds, including trailing zeros**." Example: `2020-09-21T14:30:05.123Z`.

7. **Gov-Client-Public-Port** — "public TCP port used by the originating device when initiating the
   request. This must not be a server port, for example 80 … 443. The valid range is between 1 and
   65535." Example: `12345`.

8. **Gov-Client-Screens** — list of key-value structures, one per screen:
   `width`, `height` ("must be positive whole numbers", clarified v3.3), `scaling-factor`
   (may be fractional, e.g. `1.25`), `colour-depth` (bits).
   Example: `width=1920&height=1080&scaling-factor=1&colour-depth=16,width=3000&height=2000&scaling-factor=1.25&colour-depth=16`

9. **Gov-Client-Timezone** — "a recognised timezone in UTC format, expressed as `UTC±<hh>:<mm>`".
   Examples: `UTC+00:00`, `UTC+01:00`, `UTC-01:15`. (Bare `UTC` fails validation — the Test API
   error text is "Value must be a recognised timezone in UTC format, submitted as UTC±<hh>:<mm>".)

10. **Gov-Client-User-IDs** — key-value structure. "The keys should indicate accounts the user
    holds. Additional fields need to contain the user's identifiers. This includes the identifier
    that the user signs into the application with, for example username, email or phone number.
    If there is an internal identifier, you should include it too." Example:
    `my-application=alice123`. (Key = your realm/product, value = the sign-in identifier.)

11. **Gov-Client-Window-Size** — key-value structure with `width` and `height` in pixels, "positive
    whole numbers". Example: `width=1256&height=803`.

12. **Gov-Vendor-Forwarded** — "A list that details hops over the internet between services that
    terminate Transport Layer Security (TLS). For each hop over the internet, a key-value data
    structure with a `by` and `for` field must be appended to the list."
    - `by` = "the public IP address that the server received the request on. For the **first hop**,
      this is the public IP address of the server and value of **Gov-Vendor-Public-IP**." (corrected
      in v3.3)
    - `for` = "the public IP address of the request sender. For the first hop, this is the public
      IP address of the client and value of **Gov-Client-Public-IP**. For subsequent hops, it is
      the public IP address of the intermediate server."
    - "Do not include hops within a private network."
    Simple example: `by=203.0.113.6&for=198.51.100.0`. Multi-hop example percent-encodes the IPv6
    colons: `by=2001%3A0db8%3A…&for=198.51.100.0,by=203.0.113.6&for=2001%3A0db8%3A…,…`
    HMRC **cross-validates** consistency of Gov-Vendor-Forwarded ↔ Gov-Vendor-Public-IP ↔
    Gov-Client-Public-IP (see §5).

13. **Gov-Vendor-License-IDs** — key-value structure of **hashed** licence keys:
    `<software-name>=<hashed-license-value>&…`. "Use the same hashing function" for consistency.
    Example: `my-licensed-software=8D796349…`. For a free/open-source product with no licence keys
    this is a legitimate missing-data case ("If there are no licenses on the originating device,
    you will not be able to collect a value") — but you must still clear it with HMRC first (§2.3).

14. **Gov-Vendor-Product-Name** — "name of the product marketed to end users", percent encoded.
    "If your application is built for internal use only, submit your company name. If you're using
    a white-labelled product, submit your company name." Example: `Gov-Vendor-Product-Name: Tax%20Sorted`.

15. **Gov-Vendor-Public-IP** — "public IP address of the servers the originating device sent their
    requests to. This could be an IP address of a Web Application Firewall (WAF), a DDoS Protection
    Service, or a load balancer that the vendor's DNS record resolves to." Example: `203.0.113.6`.

16. **Gov-Vendor-Version** — key-value structure `<software-name>=<version-number>&…`, e.g.
    `my-web-app=2.2.2`. Note: the Directions' "Desktop app via server" section adds "A minimum of
    two key-value pairs must be provided, one for the server and another for the client
    application"; the Test API emits a warning for single-entry values: "For client server
    architectures, submit a version for the client and the server. For all other architectures,
    submit at least 1 version." Safe practice for a web app: send both, e.g.
    `taxsorted-frontend=1.4.0&taxsorted-server=1.4.0`.

### 2.3 Missing header data protocol (Getting it right page, quoted)

> "You are required by law to submit all header data for your connection method. Most organisations
> are able to send all header data required for their connection method. In exceptional cases you
> may be unable to collect a value due to restrictions beyond your reasonable control, such as:
> operating system or platform restrictions; security measures.
> If you are unable to submit a header, you must contact us to explain why. Make sure you include
> full details of the restrictions. **After discussing a missing header with us, you can omit the
> header or submit it with an empty value.** You must not include a placeholder value, for example
> `null` or `undefined`."

Contact: **SDSTeam@hmrc.gov.uk**.

## 3. Test Fraud Prevention Headers API (the validator)

Docs: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/txm-fph-validator-api/1.0
(API name: "Test Fraud Prevention Headers", service id `txm-fph-validator-api`, v1.0, beta; doc page
"Last updated 24 March 2026" — actively maintained). The fraud-prevention guide instructs:
"**Before you submit any headers, you need to use the Test Fraud Prevention Headers API.**"
Usage constraints on the doc page: "do not use this API as a guarantee that requests in production
will meet the specification"; "do not send HMRC your logs from this API. We use your most recent
submissions to the sandbox to check fraud prevention headers"; "You need to fix all errors and
check any advisories. In responses, advisories are referred to as warnings."

- OpenAPI 3.0.3 spec `servers:` block lists **sandbox only**: `https://test-api.service.hmrc.gov.uk`.
- Both endpoints are **application-restricted** (OAuth 2.0 client-credentials bearer token) and
  need `Accept: application/vnd.hmrc.1.0+json`.

### 3.1 `GET /test/fraud-prevention-headers/validate`
"This resource validates fraud prevention headers submitted with this HTTP request." Call it with
the exact headers your app will send. 200 response shapes (from the OAS examples):
- `{"specVersion":"3.1","code":"VALID_HEADERS","message":"All headers required for your connection method have been supplied and all appear to be valid. Validation is based on a single request. We have access to all requests and can draw additional conclusions."}`
- `code: "INVALID_HEADERS"` with `errors[]` — each `{code, message, headers[]}` where code is
  `INVALID_HEADER`, `MISSING_HEADER` ("Header required"), or cross-header `INVALID_HEADERS`.
- `code: "POTENTIALLY_INVALID_HEADERS"` with `warnings[]` (`POTENTIALLY_INVALID_HEADER`) —
  advisories.
- No headers at all → `code: "INVALID_HEADERS", message: "No fraud prevention headers submitted. These are required by law. Check the specification."`

### 3.2 `GET /test/fraud-prevention-headers/{api}/validation-feedback?connectionMethod=…`
"Use this resource to get feedback on fraud prevention headers submitted by your application in
sandbox. You'll get detailed feedback on the most recent request to each endpoint of a supported
API." The `{api}` path parameter is an enum of 30 values covering the whole MTD ITSA surface
(relevant to TaxSorted: `self-assessment-mtd`, `business-details-mtd`, `obligations-mtd`,
`property-business-mtd`, `self-employment-business-mtd`, `individual-calculations-mtd`,
`individual-losses-mtd`, `business-source-adjustable-summary-mtd`, `individuals-expenses-mtd`,
`individuals-reliefs-mtd`, …, plus `vat-mtd`). Optional `connectionMethod` query filter enum:
`BATCH_PROCESS_DIRECT | DESKTOP_APP_DIRECT | DESKTOP_APP_VIA_SERVER | MOBILE_APP_DIRECT |
MOBILE_APP_VIA_SERVER | OTHER_DIRECT | OTHER_VIA_SERVER | WEB_APP_VIA_SERVER`.
Response: per-request breakdown — `path`, `method`, `requestTimestamp`, overall `code`, then
per-header `{header, value, code (VALID_HEADER|INVALID_HEADER|MISSING_HEADER|POTENTIALLY_INVALID_HEADER), errors[], warnings[]}`
plus a `crossValidation[]` block.

### 3.3 Production monitoring ("How we check data" / "Check your application")

- "We monitor API calls from all applications. We run automated tests to check data meets the
  requirements and is formatted correctly. In addition, **we manually test data to make sure values
  are realistic and what we expect**. If your application passes our automated checks, you still
  need to fix any issues we find when we test it manually."
- Statuses shown per production app on Developer Hub (View all applications → your Production app →
  "Fraud prevention" tab): **Missing, Invalid, Errors, Advisories** = issues to fix/review;
  **Correct** = "we have not found any issues this month … not that your application is
  'compliant'". HMRC sends a **monthly status email** (detailed monthly reports discontinued).
  "Your header status is not to be shared outside your organisation."

## 4. Legal basis and the privacy tension

### 4.1 The law

- **SI 2019/360 — The Delivery of Tax Information through Software (Ancillary Metadata)
  Regulations 2019** (made 25 Feb 2019, laid 26 Feb 2019, **in force 19 March 2019**), made under
  **s.135(1),(2)(a),(d),(e),(g),(4)(a),(c),(d),(7),(10) Finance Act 2002**.
  https://www.legislation.gov.uk/uksi/2019/360/made
  - Reg 2(2): the Commissioners "may by specific or general direction define the set of metadata
    receipt of which they consider necessary for the purpose of ensuring the authenticity and
    security of a delivery".
  - Reg 3(2): "The software supplier must ensure that the program operates so that it (a) collects,
    and (b) delivers to the Commissioners, the relevant ancillary metadata."
  - Reg 3(4) (the user-blocking defence): "The program is not required to collect or deliver
    relevant ancillary metadata **to the extent that the person using it … has blocked the
    collection of, or manipulated, such metadata**."
  - Reg 3(5): metadata "must be made at the same time as the delivery of the tax information".
  - Reg 4: penalty **£3,000**, max one penalty per program per 12 months; Sch 36 FA 2008 penalty
    procedure applies (appeal rights).
  - "Software supplier" = a person who "develops (or procures the development of), and supplies" a
    program whose functions include providing information to HMRC electronically.
- **The Commissioners' Directions** under reg 2(2) are the instrument that makes the header list
  legally binding: "The text below **has force of law** under regulation 2(2)… These directions
  have effect from **16 October 2023**. They replace the earlier directions dated 6 January 2021."
  The Directions enumerate the headers per connection method (identical to the Developer Hub spec)
  and defer full detail to the Developer Hub.
  https://www.gov.uk/government/publications/direction-under-regulation-22-of-the-delivery-of-tax-information-through-software-ancillary-metadata-regulations-2019-si-2019360

### 4.2 What a privacy-respecting commons is forced to collect

For every HMRC API call, TaxSorted must collect and transmit, about the **user**:
public IP + ephemeral TCP source port (+ collection timestamp), a **persistent device UUID**
(cookie), JS user-agent string, all screen dimensions/scaling/colour-depth, browser window size,
local timezone, the user's sign-in identifier(s) (username/email — percent-encoded, **not**
required to be hashed) and internal ID, and MFA metadata (method, last-success time, hashed factor
reference). Plus, about the operator: server public IPs, TLS hop chain, product name, versions.
This is deliberate device fingerprinting — HMRC's own DPIA describes TxM as "specifically designed
to capture and analyse a wide range of personal data".

### 4.3 What HMRC does with it (from the public TxM DPIA v3.1, 18/03/2019)

- Purpose: Transaction Monitoring (TxM) "records customer activity across HMRC customer facing
  services … to detect suspicious behaviours which might indicate fraud or crime"; alerts are
  reviewed by humans (no solely-automated decisions, per Q7).
- HMRC's lawful basis: **UK GDPR Article 6(1)(e) public task** — "HMRC processes TxM data in
  performance of its Public task (Article 6(1)(e) of the GDPR). HMRC require third party software
  developers to provide additional metadata for the furtherance of our Public task. The collection
  and supply of this data is mandated by Statutory Instrument."
- No consent: "TxM are not required to seek consent from customers." Customers are informed by "a
  published fair processing notice"; full specifics are withheld because disclosure "would
  undermine the primary purpose of the system".
- Retention: "**6 years + current year** in accordance with the HMRC records management and
  retention and disposal policy … in line with the legal requirement for retention of tax records."
- Sharing: internal Risk Intelligence and Fraud Investigation teams; "We may share TxM data with
  other government departments, the Police and the National Cyber Security Centre for the purposes
  of prevention and detection of crime."
- Offshoring (as of the 2019 DPIA): device-profiling supplier with data centres in the **USA
  (Portland, Seattle, Miami) and Amsterdam**; data offshored: "Device Fingerprint (Browser
  Specification, OS version, Installed Apps, User Agent String etc), Client IP Address …, Customer
  ID". Supplier retains 2 years, or 5 years where fraud is confirmed. (The DPIA cites "US-EU
  Privacy Shield certified", which predates Schrems II (2020) — the published DPIA has not been
  refreshed on this point. Treat as historical.)
- Data subject rights: SARs via normal channels, but "exemptions from data subject rights will
  apply where their application would be likely to prejudice the prevention or detection of crime
  … or the assessment or collection of a tax" (Sch 2 DPA 2018).

### 4.4 Lawful basis for TaxSorted itself (analysis, anchored to ICO guidance)

- The obligation in reg 3(2) SI 2019/360 sits on the **software supplier**. TaxSorted's collection
  and onward transmission of this data therefore fits **UK GDPR Article 6(1)(c) — legal
  obligation**: "processing is necessary for compliance with a legal obligation to which the
  controller is subject" (ICO). ICO expects you to "identify the obligation in question, either by
  reference to the specific legal provision or else by pointing to an appropriate source of advice
  or guidance" — cite SI 2019/360 + the Directions + the HMRC guide.
  Source: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/legal-obligation/
- Consequence (per the same ICO page): under 6(1)(c) "the individual has **no right to erasure,
  right to data portability, or right to object**" for this processing — worth saying plainly in
  the privacy notice.
- ICO also requires: document the decision, and "include information about your purposes and lawful
  basis in your privacy notice".
- Open questions needing proper legal advice (my analysis, not verified against a source):
  - **Self-hosted deployments**: SI 2019/360 defines the "software supplier" as the person who
    develops *and* supplies the program. For an open-source commons, who carries the reg 3
    obligation for a self-hosted instance is not addressed anywhere in the HMRC guidance I found.
    In practice each HMRC application (client ID) owner is the one HMRC monitors and sanctions.
  - **PECR/cookie analysis** for the Gov-Client-Device-ID persistent cookie (storage/access on the
    user's device): not addressed in HMRC guidance; needs its own analysis (arguably within the
    "strictly necessary" exemption because the service cannot lawfully be provided without it, but
    I did not find authority for that — flag as low confidence).
- Note reg 3(4): if the **user** blocks or manipulates collection (e.g. blocks JS APIs), the
  supplier is not in breach "to that extent". The Compliance guidelines mirror this: a developer is
  not non-compliant "where a user chooses to 'downgrade' or otherwise customise their software in
  such a way that it cannot capture or transmit the required header information".

### 4.4a Contractual layer: Developer Hub Terms of Use (production-access questionnaire)

Beyond SI 2019/360, the Terms of Use HMRC applies when granting production credentials add
explicit, checkable obligations (source: https://developer.service.hmrc.gov.uk/api-documentation/docs/terms-of-use):

- UK GDPR compliance including "telling customers: **what personal data you will be processing and
  why**, that you are responsible for protecting their data, [and] **your lawful basis** for
  processing personal data".
- "You must encrypt access tokens and personally identifiable data when it is stored and in transit."
- A **privacy policy URL** and a **terms and conditions URL** "covering the software you request
  production credentials for" are required.
- Security breaches: report to HMRC "immediately … by logging a ticket … within 72 hours", and
  "You must also notify the ICO about personal data breaches … within 72 hours of becoming aware".
- For VAT/ITSA APIs specifically: "Does your software submit fraud prevention data? You must submit
  header data in line with the fraud prevention specification" and "Have you checked that your
  software submits fraud prevention data correctly? Before you submit any header data, you need to
  use the Test Fraud Prevention Headers API."
- Also: "Only use 'HMRC recognised' when advertising your software. Do not use terms like
  'accredited' or 'approved'." And server location for cloud software is asked ("Where are your
  servers that process customer information?").

### 4.5 What honest disclosure looks like

HMRC itself points vendors at the DPIA "to review your privacy notices", and the sanctions
guidelines say "Developers may want to share this guidance with users of their products for
transparency". An honest TaxSorted disclosure can therefore say, with citations:

1. UK law (SI 2019/360 + Commissioners' Directions with force of law) requires any software that
   files to HMRC's MTD APIs to send "fraud prevention headers" with **every** API call — this is
   not optional and not our choice; the penalty for not doing so is £3,000 per program per year and
   removal from HMRC's API platform.
2. Exactly what is sent (the 16-header table above, with live preview of the user's own values —
   a commons can render the actual headers before submission; nothing in the spec forbids showing
   users their own data).
3. What HMRC does with it: fraud/crime detection (TxM), kept 6 years + current year, may be shared
   with other government departments, the Police and the NCSC; no consent is sought because HMRC
   relies on its public task; our transmission relies on legal obligation, so erasure/objection
   rights don't apply to this specific flow.
4. What we do NOT do with it: nothing beyond transmission to HMRC (a commons can commit to not
   logging/retaining the fingerprint data itself beyond what transport requires).
5. The reg 3(4) fact: users *can* block collection (the software then sends what it can), but
   HMRC may then scrutinise their filings differently — honest, since the law explicitly
   contemplates it.

## 5. Common rejection reasons / HMRC feedback on header quality

From the Test API OAS examples, the change log, and the guide:

1. **No headers at all** → "No fraud prevention headers submitted. These are required by law."
2. **Gov-Client-Timezone format** — must be `UTC±<hh>:<mm>`; bare "UTC" or IANA names rejected:
   "Value must be a recognised timezone in UTC format, submitted as UTC±<hh>:<mm>". (Format
   clarified in spec v3.1 because of widespread errors.)
3. **Missing headers** → `MISSING_HEADER` / "Header required" (e.g. forgetting `Gov-Vendor-Version`).
4. **Gov-Client-Screens incomplete** — "At least 1 screen is missing a value for scaling factor" /
   "…for colour depth" (sending only width/height).
5. **Cross-header IP inconsistency** — "At least 1 pair of IPs in Gov-Vendor-Forwarded must include
   Gov-Client-Public-IP in the 'for' field and Gov-Vendor-Public-IP in the 'by' field. Check all 3
   headers are consistent." (This tripped enough vendors that v3.2 and v3.3 both added
   clarifications.)
6. **Gov-Vendor-Version with one entry** for client-server architectures → warning "submit a
   version for the client and the server".
7. **Wrong connection method / desktop-style fields from a web app** → warning "Check you are using
   the correct Gov-Client-Connection-Method. Web applications do not usually provide the os field
   as browsers do not expose this information." (i.e. web apps claiming `os=` values they can't
   know look fabricated.)
8. **Placeholder values** (`null`, `undefined`) — explicitly banned.
9. **Timestamp precision** — Gov-Client-Public-IP-Timestamp needs milliseconds incl. trailing
   zeros; MFA timestamps need `T` + 24-hour format (both v3.3 clarifications).
10. **Values that pass format checks but aren't realistic** — HMRC manual review: "we manually test
    data to make sure values are realistic and what we expect. If your application passes our
    automated checks, you still need to fix any issues we find when we test it manually."
    (e.g. hardcoded screens/window sizes, server ports as client port, private IPs as public IPs.)
11. **Technology-stack data loss** — the spec warns twice that "some popular load balancers do not"
    pass client public IP/port; choose infrastructure that preserves them (or terminate TLS where
    you can capture the socket peer).

### Enforcement path if HMRC deems headers non-compliant (Compliance & Sanctions Guidelines PDF)

- HMRC "allows developers a **6-month period** to accommodate new fraud headers".
- "**From 14 December 2020**, it has become HMRC policy to only grant developer access to MTD APIs,
  if their application is compliant with fraud prevention header requirements" — i.e. production
  credentials for MTD ITSA are gated on FPH compliance (also restated in the Directions for ITSA).
- Sanctions ladder: **Step 1** formal notice of non-compliance (30 days to remediate or agree a
  plan; review rights via txm_compliance@hmrc.gov.uk); **Step 2** initial sanctions — exclusion
  from HMRC support events, removal from the gov.uk Software Choices list, blocked from
  new/additional MTD APIs; **Step 3** (discretionary, after a further 3 months) £3,000 penalty
  (appeal via Sch 36 FA 2008 / TMA 1970 Part 5); **Step 4** removal from the HMRC API platform
  entirely ("will also bar developers from all other elements of MTD").
- A developer is NOT non-compliant where users run an old version despite a compliant upgrade being
  available, or where the user blocks/customises collection.

## 6. Build notes for TaxSorted (synthesis)

- Collect client-side via JS on every session: `navigator.userAgent`, `window.screen.*`
  (width/height/colorDepth) + `devicePixelRatio` (scaling-factor), `window.innerWidth/innerHeight`,
  timezone offset (beware DST — compute at request time; `UTC±hh:mm` from `Date.getTimezoneOffset()`),
  device-ID UUID in a long-lived first-party cookie/localStorage.
- Capture server-side at the TLS-terminating edge: client socket IP + **source port** + timestamp
  (millis). If using a PaaS/CDN, verify port survives (many strip it — spec warns). Build
  `Gov-Vendor-Forwarded` from the real hop chain; keep it consistent with `Gov-Client-Public-IP`
  and `Gov-Vendor-Public-IP` or you hit the cross-validation error.
- Send `Gov-Client-User-IDs: taxsorted=<sign-in-identifier>`; if MFA is implemented (recommended),
  send `Gov-Client-Multi-Factor`; if not, agree the omission with SDSTeam@hmrc.gov.uk **before**
  production. Same for `Gov-Vendor-License-IDs` (no licences in a free commons — likely agreed
  omission).
- Wire the Test API into CI: call `/test/fraud-prevention-headers/validate` with generated headers;
  after sandbox runs, poll `/test/fraud-prevention-headers/{api}/validation-feedback` for each MTD
  API used. Treat warnings, not just errors, as build failures where feasible.
- Headers accompany **every** call to the ITSA MTD API family ("all associated APIs and
  endpoints"), not just submissions.
