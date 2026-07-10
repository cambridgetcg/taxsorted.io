# UK political system transparency method

Checked: 10 July 2026

This is the editorial contract behind the non-personal endpoints under
`/v1/politics/uk`. It covers the Westminster foundation first. Devolved and
local systems are not silently squeezed into Westminster's rules.

## Five facts that must stay separate

1. An office has formal powers; a person temporarily holds that office.
2. A public body has a budget; that budget is not the office-holder's money.
3. A source reports a relationship; that record alone does not prove influence.
4. An investigation is a process; it is not a finding of breach.
5. A bill is a proposal; it is not current law until enacted and commenced.

## Responsibility is an event chain

There is no single person who “runs a UK election”. Parliament makes the law;
registration officers maintain registers; Returning Officers or the Chief
Electoral Officer administer the poll and result; campaign participants keep
their own regulated records; the Electoral Commission regulates specified
political-finance lanes; police, prosecutors and courts handle separate
criminal and judicial stages.

Every API stage therefore names its responsible actor, public records and
source. Responsibility is attached to a duty and election type, not treated as
one permanent hierarchy.

## Formal office power

The draft method scores six visible dimensions from 0 to 5: executive,
law-making, oversight, enforcement, public money and appointments. The raw
total is out of 30 and the display value is rounded to the nearest 5 out of
100. Jurisdiction and competence remain separate and always appear beside it.

The score measures neither virtue nor informal influence. Several offices held
by one person are listed separately and never added. Collective power belongs
to the body, not to every member as an individual. The current assessments are
marked provisional and keep their method version and law-as-at date.

Research depth follows each dimension:

- 0–1: source, function, limits and official contact route;
- 2: also collective body, votes, delegation and checks;
- 3–5: also decisions, appointees, budgets, enforcement interfaces and
  historical changes in that domain.

## Money and organisations

Candidate, party and non-party campaign spending are separate legal lanes.
Public support such as Policy Development Grants, Short Money, Cranborne Money
and election-delivery funding is stored separately from private donations.
Budget records distinguish plan, Parliamentary authority, allocation, claim,
payment and outturn.

Corporate and organisational evidence is represented as a sourced edge:
declared interest, donation or loan, ministerial meeting or hospitality,
consultant-lobbying client, or public contract. Joins require stable official
identifiers and effective dates. A name match is never enough.

## Release boundaries

The system and method endpoints contain no personal records and remain public
while the people-data gate is closed. Current-member data still needs the
documented privacy review. Political Finance Online remains separately gated
until the Electoral Commission confirms reuse and attribution terms in writing.

Historical election results have an identified Open Parliament Licence source,
but bulk candidate names and political affiliation still need a recorded lawful
basis and Article 9 condition. Historical contacts and staff details are not
kept as a timeline.

The canonical machine-readable method, sources and declared gaps are returned
by `GET /v1/politics/uk/system`.
