# UK charity tax procedure gap — two state machines and a bounded recovery spine

**Reviewed:** 13 July 2026
**Status:** return-to-first-appeal procedure supported; wider recovery, case-law effects and clause-level provenance for composite records remain open

Tax administration is not one line from “charity rule” to “debt”. A charitable trust normally
enters the Income Tax and Capital Gains Tax self-assessment system. A charitable company normally
enters the Corporation Tax self-assessment system. The two systems use different notices,
returns, amendments and appeal provisions.

This note records those two state machines and the first shared appeal, payment and recovery
questions. It is a research boundary, not legal or tax advice and not a deadline calculator.

## Select the case before giving an answer

A procedure record must stop unless it knows at least:

1. the legal person that is the taxpayer — including the relevant trustees rather than an
   abstract “trust”;
2. whether the case is in the trust or company state machine;
3. the tax, tax year or accounting period;
4. the exact return, notice, correction, amendment, closure notice, determination or assessment;
5. who made it and the dates it was issued, received, filed or amended;
6. whether tax is due and unpaid, and whether a postponement decision exists;
7. the recovery jurisdiction: England and Wales, Scotland or Northern Ireland.

“HMRC disagreed” is not a sufficient event type. Different events have different remedies, and
some have no statutory appeal at all.

## State machine A — charitable trust

This is the core route for a charitable trust within the Taxes Management Act 1970. It does not
say that every charitable trust owes Income Tax or Capital Gains Tax; the substantive exemption
and attribution questions come first.

| State | Legal event and normal next step | Challenge and payment boundary |
| --- | --- | --- |
| Chargeable but no return notice | [TMA 1970 section 7](https://www.legislation.gov.uk/ukpga/1970/9/section/7) can require notification of chargeability where the trust is chargeable and no trustee-return notice has been given, or the notice was withdrawn. The usual notification period ends six months after the tax year. | Notification is not a return or self-assessment. Do not turn it into an appealable decision. |
| Trustee return required | HMRC may give a trustee-return notice under [section 8A](https://www.legislation.gov.uk/ukpga/1970/9/section/8A). The ordinary public filing dates are 31 October for paper and 31 January for online filing; a late-issued notice creates a different statutory branch, so the notice date and filing method must be stored. The official forms are [SA900](https://www.gov.uk/government/publications/self-assessment-trust-and-estate-tax-return-sa900) and the charity pages [SA907](https://www.gov.uk/government/publications/self-assessment-trust-and-estate-charities-sa907). | The filing obligation follows the actual notice. A notification under section 7 does not satisfy it. |
| Return and own assessment | Under [section 9](https://www.legislation.gov.uk/ukpga/1970/9/section/9), the return contains the trustee’s self-assessment of Income Tax and Capital Gains Tax. HMRC’s [charities claims-and-returns guidance](https://www.gov.uk/government/publications/charities-detailed-guidance-notes/chapter-6-claims-and-returns) explains its administrative view. | The trustee’s own self-assessment is not an HMRC decision carrying the generic appeal route below. |
| Trustee amendment | [Section 9ZA](https://www.legislation.gov.uk/ukpga/1970/9/section/9ZA) normally permits an amendment within 12 months after the filing date. [Section 9B](https://www.legislation.gov.uk/ukpga/1970/9/section/9B) defers the effect of some amendments made during an enquiry. | The trustee’s own amendment is not itself an appealable HMRC decision. |
| HMRC correction | [Section 9ZB](https://www.legislation.gov.uk/ukpga/1970/9/section/9ZB) allows HMRC to correct specified errors or matters it believes incorrect, normally within nine months of delivery or the relevant trustee amendment. | This is **not an appeal**. The trustee may reject the correction by notice to the officer before the end of 30 days beginning with the correction notice’s issue date. |
| Enquiry | [Section 9A](https://www.legislation.gov.uk/ukpga/1970/9/section/9A) lets HMRC open an enquiry. Its opening window depends on the real delivery, filing and amendment history; it must not be inferred from the tax year alone. | An open enquiry is a state, not a finding that the charity was wrong. |
| Amendment during enquiry | Where the conditions in [section 9C](https://www.legislation.gov.uk/ukpga/1970/9/section/9C) are met, HMRC may amend the self-assessment during the enquiry to prevent likely loss of tax. | The amendment is appealable under [sections 31 and 31A](https://www.legislation.gov.uk/ukpga/1970/9/section/31), but the legislation restricts progression of that appeal until the relevant closure notice. Payment and postponement are separate questions. |
| Partial or final closure | [Section 28A](https://www.legislation.gov.uk/ukpga/1970/9/section/28A) provides for partial and final closure notices, any conclusions and amendments, and an application to the First-tier Tribunal for a direction that HMRC close the enquiry. The notice takes effect when issued. | A conclusion stated or amendment made by the closure notice can be appealed under [sections 31 and 31A](https://www.legislation.gov.uk/ukpga/1970/9/section/31A), normally within 30 days. |
| No-return determination | If a required return is absent, [section 28C](https://www.legislation.gov.uk/ukpga/1970/9/section/28C) permits an HMRC determination. It is treated as a self-assessment for enforcement. A real return made within the statutory window supersedes it: broadly, no later than the later of three years from the filing date and 12 months after the determination. | **There is no appeal against the determination.** The remedy supplied by this section is the timely superseding return. Recovery already begun may continue, but only for the amount that remains due after supersession. |
| Discovery assessment | [Section 29](https://www.legislation.gov.uk/ukpga/1970/9/section/29) permits an assessment only when its own loss-of-tax and gateway conditions are met. [Sections 34 and 36](https://www.legislation.gov.uk/ukpga/1970/9/section/34) contain the ordinary four-year limit and longer six- and 20-year limits for specified careless, deliberate and failure-to-notify cases. Offshore rules create another branch. | A discovery assessment is normally appealable under [sections 31 and 31A](https://www.legislation.gov.uk/ukpga/1970/9/section/31A) within 30 days. Whether a discovery and its gateway are valid is fact- and case-law-sensitive; no case-law effect is admitted yet. |

### Trust payment state

[Section 59A](https://www.legislation.gov.uk/ukpga/1970/9/section/59A) creates conditional
payments on account for Income Tax. They do not apply to Capital Gains Tax and must not be shown
as universal. [Section 59B](https://www.legislation.gov.uk/ukpga/1970/9/section/59B) contains the
ordinary balancing-payment rule, usually 31 January following the tax year. For specified later
corrections, amendments and closure changes, [Schedule 3ZA](https://www.legislation.gov.uk/ukpga/1970/9/schedule/3ZA)
generally makes the extra amount payable after the applicable statutory 30-day period. [Section
86](https://www.legislation.gov.uk/ukpga/1970/9/section/86) supplies the associated interest rule.

The API must calculate from the provision attached to the actual payment event. “Trust tax is due
on 31 January” is not enough for a later amendment or mixed Income Tax and Capital Gains Tax case.

## State machine B — charitable company

This is the core Corporation Tax route in Schedule 18 to the Finance Act 1998. The company is the
taxpayer; its directors, employees, advisers and charity trustees are not silently substituted as
the tax debtor.

| State | Legal event and normal next step | Challenge and payment boundary |
| --- | --- | --- |
| Chargeable but no return notice | [Schedule 18 paragraph 2](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/2) normally requires a chargeable company that has not received a return notice to notify HMRC within 12 months after the end of its accounting period. | Notification is not the company tax return and is not an appealable decision. |
| Company return required | HMRC’s notice is governed by [paragraph 3](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/3). The return and self-assessment requirements are in [paragraph 7](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/7), and the filing date is set by [paragraph 14](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/14), ordinarily 12 months after the accounting period. A charity normally uses CT600, the charity supplementary pages [CT600E](https://www.gov.uk/government/publications/corporation-tax-charity-and-community-amateur-sports-clubs-ct600e-2015-version-3), accounts and computations. | The filing date is not the payment date. The actual notice and accounting period must be retained. |
| Company amendment | [Paragraph 15](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/15) normally permits a company amendment within 12 months after the filing date. [Paragraph 31](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/31) defers the effect of some amendments during an enquiry. | The company’s own amendment is not an appealable HMRC decision. |
| HMRC correction | [Paragraph 16](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/16) gives HMRC a correction power normally lasting nine months from delivery or the relevant company amendment. | This is **not an appeal**. The company rejects it by amending its return or, after its amendment window has ended, by written notice within three months from issue of the correction notice. |
| Enquiry | [Paragraphs 24 and 25](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/24) govern notice of, and time limits for, an enquiry into the company return. | The API must use the real return and amendment dates. An enquiry is not itself proof of tax due. |
| Amendment during enquiry | [Paragraph 30](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/30) permits a jeopardy amendment where its conditions are met. | The company may appeal within 30 days, but the statutory route delays determination until the enquiry is closed. |
| Partial or final closure | [Paragraphs 32 and 33](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/32) provide closure and the company’s route to ask the tribunal to direct closure. [Paragraph 34](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/34) requires the closure notice to state conclusions and make any required amendment. | The company appeal is against an **amendment** under paragraph 34 and is normally due within 30 days. Unlike the trust provision, paragraph 34 does not create a generic appeal against a bare conclusion where no amendment was made. |
| No-return determination | [Paragraphs 36, 39 and 40](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/36) permit a determination where the required return is absent, treat it as a company self-assessment for enforcement, and allow a timely real return to supersede it. The outer window is broadly the later of three years from the date the determination power became exercisable and 12 months after the determination. | **There is no appeal against the determination.** The statutory route is the superseding return. |
| Discovery assessment | [Paragraphs 41 to 48](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/41) contain the discovery conditions, ordinary four-year limit, longer six- and 20-year limits for specified conduct, and appeal right. | [Paragraph 48](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18/paragraph/48) gives a normally 30-day appeal. Validity and application remain case-law-sensitive. |

### Company payment state

The ordinary Corporation Tax due date under [TMA 1970 section 59D](https://www.legislation.gov.uk/ukpga/1970/9/section/59D)
is the day after nine months have expired from the end of the accounting period — commonly called
“nine months and one day”. [Section 59E](https://www.legislation.gov.uk/ukpga/1970/9/section/59E)
allows the quarterly-instalment regime to displace that result where it applies. [Section
87A](https://www.legislation.gov.uk/ukpga/1970/9/section/87A) governs interest on late Corporation
Tax.

The current [HMRC COTAX payment manual](https://www.gov.uk/hmrc-internal-manuals/cotax-manual/com90010)
describes interest as the present late-payment consequence. This map must not invent a generic
Corporation Tax late-payment penalty from an uncommenced statutory entry.

## Shared first appeal and review spine

Only an exact appealable event may enter this spine:

- trust: a section 9C amendment, a section 28A conclusion or amendment, or a section 29 assessment;
- company: a Schedule 18 paragraph 30 amendment, paragraph 34 amendment, or paragraph 41 assessment
  through the paragraph 48 appeal right.

The first written appeal is normally sent to HMRC within 30 days under the event-specific
provision. [TMA section 49](https://www.legislation.gov.uk/ukpga/1970/9/section/49) governs late
appeals. [Sections 49A to 49I](https://www.legislation.gov.uk/ukpga/1970/9/section/49A) then provide
the review and First-tier Tribunal routes. In plain language:

1. the appellant may require an HMRC review, accept a review offered by HMRC, or notify the appeal
   to the First-tier Tribunal when the statutory conditions for that route are met;
2. an offered review normally has a 30-day acceptance window;
3. in a required-review route, HMRC normally has 30 days, or a reasonable longer period, to notify
   its view of the matter;
4. the review normally lasts 45 days unless a different period is agreed;
5. notification to the tribunal after a review normally has another 30-day window.

Those periods attach to different documents. They are not one reusable “30-day appeal deadline”.
HMRC’s [tax-appeal guidance](https://www.gov.uk/tax-appeals) and [internal appeals manual](https://www.gov.uk/hmrc-internal-manuals/appeals-reviews-and-tribunals-guidance/artg2010)
are useful explanations, but the legislation and actual notices control the branch.

### An appeal does not automatically stop payment

For the appeals within [TMA section 55](https://www.legislation.gov.uk/ukpga/1970/9/section/55),
the charged tax remains due as if there were no appeal unless payment is separately postponed.
The appellant’s postponement application must be in writing, normally within 30 days of the
specified assessment, amendment or closure-notice date, and must state both the amount believed
to be excessive and the grounds. If HMRC does not agree the amount postponed, the appellant may
refer that payment question to the tribunal within 30 days of HMRC’s decision. Section 55 also
contains exceptions, including special payment-notice cases, so postponement must not be attached
automatically to every appeal.

The API therefore needs two fields, not one: `appealStatus` and `paymentStatus`. “Appeal lodged”
must never silently become “payment suspended”.

## Exact boundaries where no appeal edge is admitted

The following events do not enter the generic appeal spine described above:

| Event | Statutory route that can exist instead | What the map must not claim |
| --- | --- | --- |
| A trustee’s or company’s own self-assessment | Amendment or other claim route, if its own conditions are met | That the taxpayer can appeal its own return as though HMRC made it |
| A trustee’s or company’s own amendment | The amendment rules and any later HMRC event | That an own amendment is an appealable decision |
| HMRC correction under section 9ZB or Schedule 18 paragraph 16 | Timely statutory rejection of the correction | That the rejection is an appeal or tribunal notification |
| Default determination under section 28C or Schedule 18 paragraph 36 | A real return filed within the supersession window | That the determination itself carries an appeal |
| Attribution determination under [ITA 2007 section 542](https://www.legislation.gov.uk/ukpga/2007/3/section/542) or [CTA 2010 section 495](https://www.legislation.gov.uk/ukpga/2010/4/section/495) | No standalone statutory appeal provision has been identified in this bounded review; any later assessment or public-law route must be analysed on its own law | That a neighbouring tax appeal provision can simply be borrowed |
| Trust gain specification or HMRC determination under [TCGA 1992 section 256B](https://www.legislation.gov.uk/ukpga/1992/12/section/256B) | The trustees may specify attributable gains by notice. If HMRC requires a specification and no trustees' notice is given within the period of 30 days beginning with the requirement day, an officer may determine the gains. No standalone appeal provision has been identified in section 256B; any later assessment or public-law route needs its own law. | That the requirement, 30-day expiry or determination happened; that the determination itself sets a payment date or carries a borrowed appeal right |
| Company gain specification or HMRC determination under [TCGA 1992 section 256D](https://www.legislation.gov.uk/ukpga/1992/12/section/256D) | The company may specify attributable gains by notice. If HMRC requires a specification and no company notice is given within the period of 30 days beginning with the requirement day, an officer may determine the gains. No standalone appeal provision has been identified in section 256D; any later assessment or public-law route needs its own law. | That the requirement, 30-day expiry or determination happened; that the determination itself sets a payment date or carries a borrowed appeal right |

“No appeal edge admitted” does not mean “nothing can ever be done”. It means this research has not
identified an appeal from that exact event and will not manufacture one. Rejection, amendment,
supersession, an appeal from a later assessment and public-law remedies are legally different.

## Narrow territorial recovery branches now supported

These branches begin only after the system identifies the legal debtor, an exact amount due and
payable, non-payment, the appeal and postponement state, the jurisdiction and all required
notices. They are not a complete list of HMRC collection powers.

### England and Wales — taking control of goods

[Finance Act 2008 section 127](https://www.legislation.gov.uk/ukpga/2008/9/section/127) lets HMRC use
the Taking Control of Goods procedure in Schedule 12 to the Tribunals, Courts and Enforcement Act
2007 for an unpaid sum payable to the Commissioners. The actors are HMRC and an authorised
enforcement agent.

The current Taking Control of Goods Regulations require a written notice of enforcement. Under
[regulation 6](https://www.legislation.gov.uk/uksi/2013/1894/regulation/6), the notice normally
precedes control of goods by at least 14 clear days. The same regulation extends that minimum to
28 clear days when an eligible debt-advice-provider request is received in time, subject to its
non-eligible-business-debt exclusion, and lets a court order a shorter period on its stated risk
test. [Regulation 7](https://www.legislation.gov.uk/uksi/2013/1894/regulation/7) requires the notice
to identify the debtor, enforcement power, debt, interest and costs, and give clear payment,
deadline, advice and contact details. [Regulation
8](https://www.legislation.gov.uk/uksi/2013/1894/regulation/8) specifies how the notice may be
given.

### Scotland — summary warrant and diligence

[Finance Act 2008 section 128](https://www.legislation.gov.uk/ukpga/2008/9/section/128) starts with
an officer’s demand. Normally 14 days must pass without payment before an officer applies to the
sheriff using the signed statutory certificate. A summary warrant can authorise attachment,
money attachment, earnings arrestment, arrestment and furthcoming, and sale; sheriff-officer fees
can follow. The actors and documents are therefore HMRC officer → sheriff → sheriff officer, not a
generic “debt collector”.

This Scottish branch includes diligence beyond physical goods. The API should preserve the named
method rather than flatten all of them into seizure.

### Northern Ireland — distraint

[TMA 1970 section 61](https://www.legislation.gov.uk/ukpga/1970/9/section/61), now confined to
Northern Ireland, permits the collector to distrain goods and chattels after a demand and neglect
or refusal to pay. A justice’s warrant is required for the daytime breaking power described in
the section. If the debt and costs remain unpaid, the distrained property is kept for five days
and can then be appraised and sold by public auction.

The demand, five-day period, any warrant, inventory, appraisal and sale are separate events. They
must not be collapsed into “HMRC took assets”.

## Recovery and court gaps that remain explicit

This note does **not** yet map:

- court debt proceedings under TMA sections 66 to 68, jurisdiction-specific civil procedure,
  limitation or judgment enforcement;
- direct recovery from bank and building-society accounts under Schedule 8 to the Finance (No. 2)
  Act 2015, including deposit-taker roles, safeguards, objections and appeals;
- insolvency, winding up, bankruptcy or sequestration, or the interaction between tax recovery,
  restricted charity property, trustees’ duties and charity regulators;
- judicial review, injunctions and downstream appeals on points of law;
- how reported cases change the application or meaning of any rule in this note.

Those omissions are deliberate. The three territorial branches above are a narrow admitted
recovery spine, not a statement that they are HMRC’s only options. The separate
`CHARITY-TAX-CASE-LAW-GAP.md` records the case-law boundary.

## Provenance boundary for composite procedure records

The procedure supplement cites every admitted provision and exposes valid record-level JSON
pointers. For the composite records below, some scalar or list fields synthesize more than one
provision without identifying the exact sentence, list item, subsection or paragraph supplied by
each provision. Their provenance is accurate at the cited provision-set level, not at clause
level:

- `procedure-trust-tma-1970-ss8a-9-return-self-assessment`
- `procedure-trust-tma-1970-s9c-jeopardy-amendment`
- `procedure-trust-tma-1970-s28a-closure-amendment`
- `procedure-trust-tma-1970-ss29-34-36-discovery-assessment`
- `procedure-trust-tma-1970-ss31-31a-appeal-initiation`
- `procedure-company-fa-1998-sch18-pp3-7-14-return-self-assessment`
- `procedure-company-fa-1998-sch18-pp32-34-closure-amendment`
- `procedure-company-fa-1998-sch18-pp36-39-40-no-return-determination`
- `procedure-company-fa-1998-sch18-pp41-48-discovery-assessment`
- `procedure-company-tma-1970-ss59d-59e-payment`
- `procedure-company-fa-1998-sch18-pp30-34-48-appeal-initiation`
- `procedure-charity-cross-tax-tma-1970-ss49a-49f-hmrc-review`
- `procedure-charity-cross-tax-fa-2008-s127-england-wales-goods-recovery`

Consumers may show each record’s complete source set and the bounded synthesis. They must not say
that the lead source independently supports every word of a composite field or describe the
current evidence pointers as clause-level attribution. Closing this gap requires split fields or
list items and exact subsection or paragraph locators, followed by evidence validation.

## Shape required before API admission

Any future machine record based on this note should carry:

- legal taxpayer and actor roles;
- state-machine branch, tax and period;
- event and document type, legal basis and factual trigger;
- issue, receipt, filing and deadline dates used;
- amount due, payment date, interest basis and postponement state;
- challenge type — amendment, correction rejection, superseding return, appeal, review,
  postponement or no route identified;
- jurisdiction, next actor and possible outcomes;
- primary source, guidance source, reviewed date and explicit unresolved gaps.

That shape lets an agent explain why a route applies without pretending that adjacent procedures
are interchangeable.
