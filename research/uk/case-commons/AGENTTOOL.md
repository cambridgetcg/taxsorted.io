# Optional AgentTool local mirror

TaxSorted's public case API needs no AgentTool account or SDK. Direct HTTP stays
the universal door.

For a citizen or professional who already operates a local `agent-data/v1`
node, TaxSorted also ships a bounded mirror using
[`@agenttool/sdk` 0.16.0](https://github.com/cambridgetcg/agenttool/releases/tag/sdk-v0.16.0).
That was the latest published SDK checked on 24 July 2026. The dependency is
pinned exactly rather than floated.

The bridge:

- downloads one public case packet;
- verifies the checksum of the exact response bytes;
- independently verifies the packet's TaxSorted content identifier;
- defaults to a dry run;
- runs at most one collect operation when `--write` is explicit;
- accepts only a credential-free loopback Agent Data origin, with no path,
  query or fragment;
- fetches from the official TaxSorted API or a loopback development origin;
  an external fork needs its own reviewed bridge;
- uses the SDK's separate `DataClient`, not the hosted AgentTool project API;
- has no polling loop, claimant intake or private evidence field.

It will not create a node or collection. The operator first creates a private
collection named `taxsorted-case-commons` (or supplies another collection ID)
in their own node and enables the built-in `text` collector.

```bash
# Verify only. No write.
npm run mirror:case-commons --workspace api

# Run one collect operation for one verified public packet in the local node.
AGENT_DATA_NODE_URL=http://127.0.0.1:7742 \
AGENT_DATA_COLLECTION=taxsorted-case-commons \
npm run mirror:case-commons --workspace api -- --write
```

If the node requires a bearer, supply `AGENT_DATA_NODE_TOKEN` through the local
secret environment used for that one command. Do not put it in a URL, shell
history, repository or case packet. An AgentTool project bearer is a different
authority and must never be reused as the data-node token.

The bridge stores only the already-public packet. A completed professional
assessment, client identity, instructions, advice, conflict material or raw
evidence belongs in the professional's approved private matter system—not this
mirror.

AgentTool 0.16.0 also introduced optional credential-backed transports for its
hosted client. This bridge does not claim that protection: it uses only the
separate local-node client and refuses a remote node URL. A fork that changes
that custody boundary needs its own threat review.
