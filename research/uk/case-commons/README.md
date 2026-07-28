# UK case commons

This folder holds TaxSorted's public, reusable research packets about challenges
to public power.

The first release is deliberately narrow:

- one decided case;
- official sources only;
- no allegations about a live dispute;
- no claimant intake or professional marketplace;
- no probability, win score or promised return;
- no private evidence or contact details.

The machine source is
[`data/uk-case-commons.json`](data/uk-case-commons.json). The API validates it
strictly and returns a content digest with each complete case packet. The digest
identifies the canonical substantive packet fields before integrity metadata
and route links are added. The response checksum verifies the exact delivered
bytes. Neither proves truth, identity or professional status.

[`INTERPRETATION.md`](INTERPRETATION.md) defines the derived tax-dispute
reading layer. It gives people and agents one twelve-dimension framework for
questions, facts, rules, arguments, evidence, decisive reasons, outcomes,
remedies and transfer limits. Missing material stays an explicit gap. Concise
public judicial reasons can be mapped; hidden model reasoning and outcome
predictions are not requested or published.

Production publication also requires
[`data/publication-approval.json`](data/publication-approval.json) to match the
exact canonical corpus digest, corpus version and reviewed case IDs. Editing or
adding a case without recording a new approval closes both the API case surface
and static human projection.

The interpretation, case WhyGraph and training examples are deterministic
projections of those approved packets plus TaxSorted's own labels. They
therefore have a second, exact release decision at
[`data/interpretation-publication-approval.json`](data/interpretation-publication-approval.json).
It binds the framework, corpus, packet, adapter, interpretation, graph,
training-example and case-set identities. The checked-in decision approves the
current exact release. Computing a later digest is not approval, and any
content mismatch closes the derived surface.

The framework, schemas and agent instructions remain readable for correction
work. Every case-derived representation additionally follows the packet
publication switch, both emergency stops and case-level stops. A stale or bad
adapter closes only the derived resources and cannot prevent the API or source
packets from starting.

The current one-case export is a format and evaluation seed, not a sufficient
or representative model-training corpus. Its contract separates
approved source packets from TaxSorted-derived labels and does not assert
qualified legal review. Runtime requests, private assessments and user data
are outside it and are not used for training by this service.

## Public and private halves

The public packet contains the court record, TaxSorted's labelled analysis,
counterevidence, remedy, money meanings, sources and professional-review
questions.

The private half stays with the prospective client or their instructed
professional. It can contain identity, instructions, evidence, advice,
conflict-check material and funding terms. TaxSorted has no upload route and
does not need a copy.

## Admission rule

A case can enter this release only when:

1. the relevant proceeding is decided and current procedural status is checked;
2. every material statement resolves to an official source;
3. party positions, court findings, later outcomes and TaxSorted analysis are
   separate;
4. the public packet contains no private or safety-sensitive matter;
5. money is labelled by what it is and what it is not;
6. a reviewer checks defamation, contempt, reporting restrictions, privacy,
   source rights and the correction route;
7. the emergency stop and rollback have been tested.

Live-case intake remains a separate, closed project.
