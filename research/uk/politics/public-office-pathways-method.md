# Public-office pathways method

Checked: 15 July 2026

This is the editorial contract for the human guide at `/uk/politics/stand/`
and the non-personal API at `/v1/politics/uk/public-office-pathways`.

## What this product is for

The first question is the work, not the title: local services and council
decisions point towards a councillor route; national law, taxation and
government scrutiny point towards an MP route. The guide then shows the
lawful path, its costs and duties, where practical support exists, and what
TaxSorted does not know.

It does not recommend a party, ideology or candidate. It does not tell anyone
how to target, profile or persuade voters. It does not collect a postcode,
political preference, legal history or any other applicant fact. It cannot
decide that a person is eligible.

## Why only two deep routes

Version 1 deeply maps:

- a UK Parliamentary candidate in Great Britain; and
- a principal-council candidate in England.

These two routes are useful together because their work, nomination deposits,
subscriber rules, finance limits, pay and duties differ visibly. They are not
templates for every UK election. Northern Ireland Parliamentary elections,
parish and town councils, Scottish, Welsh and Northern Irish local elections,
the devolved legislatures, mayors, the Greater London Authority and police and
crime commissioners remain named gaps until each has its own evidence review.

Appointed public roles, the House of Lords, ministers, special advisers and
public appointments are a separate future family. “Public office” on this API
means the elected routes explicitly listed in its coverage, not every office
that the phrase could describe.

## Facts that stay separate

1. Statutory eligibility is not political-party selection.
2. A party route and an independent route meet the same election law but have
   different choices about ballot descriptions and internal approval.
3. A deposit, campaign spending limit, salary, allowance and reimbursable
   office cost are different kinds of money.
4. The Electoral Commission writes guidance and regulates specified rules;
   local statutory officers administer nominations, polls and candidate
   returns; police and courts have separate enforcement roles.
5. An Act receiving Royal Assent, a provision coming into force and a rule
   applying to a particular election can be different dates.
6. A Bill is proposed law. It is never merged into the current-law route.

## What “least friction” means here

Least friction means the simplest lawful next step for one exact office and
election type. It never means avoiding a rule. Party membership can offer an
internal selection and campaign structure, but also adds a separate selection
process. Standing independently avoids that internal party gate, but does not
remove nomination, agent, finance, reporting or safety work. TaxSorted shows
both routes without pretending either is universally easier.

## Evidence and barriers

Legal requirements use primary law or current Electoral Commission guidance.
Role, pay, allowance and transition facts use the responsible public body.
Support organisations describe their own programmes; TaxSorted does not treat
a provider's claim about itself as independent proof of outcomes.

The barriers layer distinguishes a legal gate from a practical burden and from
a documented evidence gap. Party access, time, money, networks, care,
disability and harassment can affect who is able to stand even when they are
not statutory qualifications. The API names the evidence supporting each
claim and avoids ranking people, parties or providers.

## Dates and change control

Each route carries `lawAsAt`; every source carries `retrievedAt`. A user must
recheck the official election timetable and candidate guidance when a poll is
called. Event-relative deadlines must not be converted into calendar dates
until an official notice supplies the event date.

The Representation of the People Bill completed Commons third reading on 14
July 2026 but was not an Act on this review date. Its proposed changes stay in
the legal-watch collection. The guide must be reviewed when that Bill changes
stage, receives Royal Assent, or any relevant provision is commenced, and when
the Electoral Commission publishes new election-specific guidance.

## Machine contract

Stable office and source IDs are not reused. The full document, office list,
office detail, support/barrier view, mixed-rights statement and JSON Schema are separate read-only
doors. Responses are deterministic, cacheable, require no account, and link
the human guide and politics OpenAPI description.

The API may return rules and missing facts. A future eligibility evaluator, if
ever built, must be stateless and return `eligible`, `ineligible` or
`uncertain` with matched rules, missing facts and a legal-advice warning. It
must never collapse complex disqualification law into an unsupported boolean.
