# Public-decision pathway market review

Checked: 16 July 2026

This is a bounded market scan, not proof that no comparable service exists.
The question was whether TaxSorted should add another political tracker or a
different public layer.

## What already exists

Official services expose useful parts of the process:

- HMRC's
  [tax consultation tracker](https://www.gov.uk/guidance/check-the-status-of-tax-policy-consultations)
  shows open and closed consultation status;
- [Bills before Parliament](https://bills.parliament.uk/) and Parliament's
  [developer services](https://developer.parliament.uk/home) expose formal
  legislative records;
- Parliament explains
  [who to contact](https://members.parliament.uk/help/whotocontact), how to
  [contact an MP](https://www.parliament.uk/get-involved/contact-an-mp-or-lord/contact-your-mp/)
  and how to
  [submit written evidence](https://publications.parliament.uk/pa/cm/written-evidence-guidance.htm);
- GOV.UK exposes consultations, petitions, complaints, appeals and FOI as
  separate services.

Civic technology also covers nearby jobs:

- [TheyWorkForYou](https://www.theyworkforyou.com/about/) makes representatives'
  words and votes easier to inspect;
- [WriteToThem](https://www.writetothem.com/) finds representatives and carries
  messages;
- [WhatDoTheyKnow](https://www.whatdotheyknow.com/help/about) publishes FOI
  requests and replies;
- [Democracy Club](https://democracyclub.org.uk/about/) builds election and
  candidate infrastructure.

Commercial public-affairs services add monitoring, stakeholder management,
contact records and workflows for organisations that want to shape policy.
This scan sampled PolicyMogul, DeHavilland and Dods. Their existence is useful
market evidence, but TaxSorted does not copy their contact databases,
relationship claims or influence language.

## The visible gap

HM Treasury itself says stakeholders find policy development hard to track and
that it will explore a dedicated resource for technical tax announcements.
That points to a real discovery problem, but also means an official tracker
could reduce part of the gap.

The stronger TaxSorted opportunity is not raw monitoring. It is a neutral
authority-and-route layer:

```text
desired outcome
→ territory and decision family
→ current formal stage
→ who proposes, decides, implements, scrutinises and adjudicates
→ lawful public doors
→ each door's effect, deadline, visibility and limit
→ source and checked date
```

No sampled neighbour joined all of those elements from a person's intended
public outcome. That conclusion is an inference from a limited scan, not a
claim of market exclusivity.

## Why the gap matters

The current Treasury principles explicitly prioritise frequent engagement with
tax professionals, allow government to decide that formal consultation is not
appropriate and set consultation length case by case. A 2026 House of Lords
report called for more open consultation and greater disclosure of privately
consulted parties. Together these sources support showing the access structure
plainly.

Showing an access structure is different from alleging hidden control.
TaxSorted should record:

- the official consultation rule;
- the public doors that actually exist;
- the participants or evidence routes publicly documented;
- the limit of each door; and
- a clearly labelled inference where professional capacity creates a practical
  access advantage.

It should not infer that a meeting caused a decision, build a private influence
network or assign an effectiveness score.

## Product decision

Build one deep, sourced tax path before adding breadth. Keep it:

- free, read-only and account-free;
- useful to both humans and agents through the same stable IDs;
- explicit about powers, effects, uncertainty and gaps;
- separate from personal appeals and complaints;
- safe to mirror through JSON Schema, OpenAPI, ETags and ordinary HTTP; and
- incapable of sending, profiling, targeting or making a personalised,
  ideological or ranked political recommendation.

The first live example is the Finance Bill 2026–27 draft-legislation
consultation. It is useful because it demonstrates that a door can be open
while part of the policy is already fixed: the official purpose is technical
testing of draft clauses, the window closes on 7 September 2026, and the
Chancellor still decides the final Bill contents.

## What would invalidate this decision

Revisit the product if an official service begins publishing the complete
authority chain and public-door semantics in a stable machine format, or if
users mainly need live monitoring rather than decision understanding. Do not
respond by adding surveillance, private contacts or persuasion features. A
smaller complementary layer is preferable to manufacturing a moat.

## Review sources

- HM Treasury,
  [Tax Policy Making Principles](https://www.gov.uk/government/publications/tax-policy-making-principles/tax-policy-making-principles)
- HMRC,
  [tax consultation tracker](https://www.gov.uk/guidance/check-the-status-of-tax-policy-consultations)
- House of Lords Economic Affairs Committee,
  [Finance Bill report](https://publications.parliament.uk/pa/ld5901/ldselect/ldeconaf/250/250.pdf)
- HMRC,
  [Finance Bill 2026–27 draft legislation](https://www.gov.uk/government/collections/finance-bill-2026-27-draft-legislation-and-technical-tax-documents)
