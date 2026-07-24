# AgentTool and the opportunity atlas

Direct HTTPS is the universal door. When the qualified-review and deployment
gates are open, reading TaxSorted's public opportunity packets requires no
AgentTool identity, account, key or SDK. While they are closed, the method
and source ledger close with the atlas; schemas, rights and the blank local
assessment remain available.

TaxSorted already exact-pins
[`@agenttool/sdk` 0.16.2](https://github.com/cambridgetcg/agenttool/releases/tag/sdk-v0.16.2).
The stable GitHub releases, npm `latest` tag and public AgentTool source were
checked on 24 July 2026. The official 0.16.2 release artifact is pinned with
lockfile integrity because npm `latest` still points to 0.16.0. Repository
version 0.16.3 is not treated as released without a corresponding release.

This atlas does not add a second storage writer. Agents discover it through
TaxSorted's plain-text manifest, wake response and task-sized OpenAPI, then use
ordinary conditional `GET` requests. That keeps the public packet useful to
every citizen and avoids making an optional identity or storage product the
price of entry.

An operator may place an already-public, checksum-verified packet in their own
local system. That act is the operator's copy, not a TaxSorted submission,
professional instruction, qualification check or claim endorsement. Never put
a completed assessment, client identity, instructions, conflict material,
privileged communication or raw evidence in a public or shared research
collection.

The bounded machine path is:

1. `GET /v1/professional-opportunities/uk/opportunities/{id}`.
2. Verify `X-Checksum-SHA256` against the exact response bytes.
3. Verify the packet's embedded content digest.
4. Keep the source IDs, corpus version and proof limits with the copy.
5. Stop. A later refresh is a new caller-chosen turn, not a polling loop.

The blank local assessment contract is available separately. Completed files
stay in the professional's approved matter system and TaxSorted provides no
endpoint that accepts them.
