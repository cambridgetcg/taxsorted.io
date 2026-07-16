# Public-decision pathways method

Checked: 16 July 2026

This is the editorial contract for the human guide at
`/uk/politics/decisions/` and the read-only API at
`/v1/politics/uk/public-decision-pathways`.

## Start with the decision

TaxSorted maps the decision before it maps a person. The first release asks
what somebody wants to change, then separates three processes that must not be
collapsed:

1. change a public tax rule through confirmed primary legislation, or identify
   that a different legal instrument needs its own map;
2. challenge how HMRC applied a rule in one case; or
3. complain about HMRC service.

A policy consultation cannot replace a statutory appeal. An appeal cannot
change the rule for everyone. A service complaint normally cannot decide
either question.

## What version 1 covers

Version 1 deeply maps one exact family: a UK central-government tax policy
that needs primary legislation through a Finance Bill. The ten stages keep
these functions separate:

- problem definition and policy development;
- consultation where government opens one;
- a fiscal announcement and Commons financial authority;
- Commons and Lords scrutiny;
- Royal Assent and commencement;
- HMRC implementation; and
- later scrutiny, correction or replacement.

The route is not a template for Scottish, Welsh, Northern Irish or local
taxes. It also does not guess that a rate, threshold, relief or other rule
needs a Finance Bill. Secondary legislation, treaties, international
negotiation and other public decisions remain named gaps until each has its
own power, instrument and territory review.

## Formal power and participation are different

Each actor carries a typed formal role. Government proposes tax policy. The
House of Commons authorises taxation. Parliament scrutinises legislation.
Royal Assent enacts a Bill. HMRC implements and administers the law. The OBR
scrutinises costings without choosing policy. Courts and tribunals adjudicate
within their jurisdiction.

Professional bodies, researchers, charities, businesses, campaigners and
members of the public may contribute evidence. Participation does not turn a
participant into the legal decision-maker. TaxSorted therefore keeps
`actors` and `participants` in separate collections.

## What a public door means

Every door states:

- who may use it and when;
- what information it needs;
- whether the contribution or identity may become public;
- its formal procedural effect;
- what it cannot do; and
- what outcome is not guaranteed.

The first release maps consultation responses, Treasury correspondence,
constituency MPs, select-committee evidence, Finance Bill written evidence,
petitions, Freedom of Information requests and the route to stand for election.
It does not rank a best route, estimate influence, draft persuasive messages or
send anything. It does provide TaxSorted-written general process options,
separately labelled as unranked and non-personalised.

Petitions are not votes on policy. Committee recommendations are not binding.
FOI is a route to recorded information, not a route that compels a policy
change. Contacting an MP does not require the MP to act as requested.

## Current windows are dated evidence

An `eventWindow` is an example attached to an official source, not a permanent
feature of the pathway. It carries:

- `checkedOn`, `opensOn`, `closesOn` and `reviewAfter`;
- legal and territorial status;
- whether the scope is formative, partly fixed or fixed;
- what can still change; and
- an instruction to verify the source before acting.

The first dated window is the Finance Bill 2026–27 draft-legislation technical
consultation, published on 13 July 2026 and closing on 7 September 2026. The
official page says the consultation tests whether draft legislation works as
intended and that the Chancellor will decide the final Bill contents. The API
therefore marks the scope `partly-fixed`; it does not describe the whole policy
as open for redesign.

## Barriers and inference

Legal constraints and official procedure use primary or official sources.
Practical barriers use the strongest available evidence. Each barrier
separately labels `mechanismAnalysisStatus` and
`generalOptionsStatus`: an official process description or
`taxsorted-inference` is distinct from
`taxsorted-written-general-guidance`.

The current Treasury principles say government will prioritise frequent
engagement with tax professionals, while formal consultation is not always
appropriate and has no single duration. TaxSorted records the resulting
access asymmetry as an inference supported by those official facts. It does
not claim that a named participant controlled an outcome or that private
engagement caused a policy decision.

## Personal routes stay bounded

The appeal and complaint records are hand-offs to official guidance, not
personalised case tools. TaxSorted:

- does not ask for a tax letter, taxpayer identifier, postcode or case facts;
- does not calculate a deadline or decide which remedy applies;
- does not draft grounds, submit proceedings or represent a person;
- does not say an appeal suspends payment; and
- tells the reader that the decision letter and tax-specific law control.

Judicial review is shown as a parallel exceptional warning, not the fifth step
after appeal and tribunal. The card says to act immediately, links to Civil
Procedure Rule 54.5 and states the prompt, normally three-month outer limit
without deciding whether the route is available. That detailed court-procedure
card is expressly limited to England and Wales; Scotland and Northern Ireland
require their own current court rules and deadlines.

## Political and privacy boundary

The guide has no account, saved topic, message composer, postcode resolver,
analytics event or write API. It does not infer political opinions, ideology,
party affinity, susceptibility, motive or personal networks. It does not
score an official, organisation or public door for effectiveness.

Contacts are official institutional routes. Current office-holder names are
avoided where the durable office is enough. A later named-person or live-event
service would need its own purpose, source-rights, privacy, freshness and
off-switch review.

## Evidence and change control

The corpus uses stable IDs and claim-linked sources. Every source has a
retrieval date, authority class and limitations. Every source must support at
least one retained claim, and every source reference must resolve at startup.
Stage ordering, reciprocal stage-door and pathway links, and cross-collection
office references also fail validation if broken. Source rights remain in the
separate mixed-rights contract because publisher terms do not reduce to one
field shared by every page.

The old five-stage Tax Consultation Framework was withdrawn in September
2025. It is not used as current procedure. Review this release when:

- the Tax Policy Making Principles change;
- the Finance Bill example closes or changes status;
- Finance Bill or Commons financial procedure changes;
- an appeal, tribunal, complaint, petition or FOI route changes; or
- a named coverage gap is researched deeply enough to admit.

## Machine contract

The root, decision list, decision detail, doors, rights and JSON Schema are
separate GET and HEAD resources. Successful bytes have strong ETags and must
revalidate after one hour. Unknown children and every write method remain
behind the ordinary politics gate. The politics bulk emergency stop overrides
the public exemption and returns `503` with `Cache-Control: no-store`.

The static human page is deployed separately. An API stop cannot retract it;
containment also requires a Cloudflare Pages rollback and cache purge.

TaxSorted curation is offered under CC BY-SA 4.0. Upstream material keeps its
own Crown, Parliamentary or publisher-specific rights. The rights route is the
machine-readable boundary, not a claim that every linked source shares one
licence.

## Main official sources

- HM Treasury,
  [Tax Policy Making Principles](https://www.gov.uk/government/publications/tax-policy-making-principles/tax-policy-making-principles)
- HMRC,
  [tax-policy consultation tracker](https://www.gov.uk/guidance/check-the-status-of-tax-policy-consultations)
- UK Parliament,
  [Finance Bill procedure](https://guidetoprocedure.parliament.uk/articles/9Sc0nmH5)
- UK Parliament,
  [taxation and spending procedure](https://guidetoprocedure.parliament.uk/collections/C6pm6WK1/taxation-and-spending)
- UK Parliament,
  [secondary legislation](https://www.parliament.uk/about/how/laws/secondary-legislation/)
- HMRC,
  [Finance Bill 2026–27 draft legislation](https://www.gov.uk/government/collections/finance-bill-2026-27-draft-legislation-and-technical-tax-documents)
- GOV.UK,
  [tax reviews](https://www.gov.uk/tax-appeals/review-of-a-tax-or-penalty-decision)
  and [the tax tribunal](https://www.gov.uk/tax-tribunal)
- Ministry of Justice,
  [Civil Procedure Rule 54.5](https://www.justice.gov.uk/courts/procedure-rules/civil/rules/part54)
