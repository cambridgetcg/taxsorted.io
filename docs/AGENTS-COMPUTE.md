# TaxSorted for Agents — the honest compute, callable

*2026-07-13. Will trace: Yu — "不如搞實用型產品 app on agent economy, build on
top of Taxsorted?" Scope chosen with Yu: **plumbing-only** — a standalone
useful product now; the agent-economy (agenttool listing, micropayment
billing) stays optional, off the consumer pages and away from the
HMRC-recognition path.*

## What this is

TaxSorted already has a real tax **compute engine** (`engine/jurisdictions/uk/`)
that turns numbers into a tax position with a band-by-band trace. The consumer
site uses it; the machine doorway only exposed *static* open-data. This work
exposes the **compute** so any AI agent can get a figure **with its working
and its sources** — not a naked number.

Two pieces:

1. **`POST /v1/compute/uk/income-tax`** (`api/src/routes/compute.ts`) — stateless,
   sessionless, sourced, disclaimered. Also `GET` for the machine-readable
   contract. Mounted before the browser-session allowlist, so it can never set
   a cookie.
2. **`@taxsorted/mcp`** (`mcp/`) — a stdio Model Context Protocol server that any
   agent host (Claude Desktop, an IDE assistant, a bookkeeping bot) installs to
   call the compute. A thin HTTP client of the public API — no engine coupling,
   no keys, no account. It forwards the API's own result verbatim, so nothing
   can drift from the published engine.

## Honest perimeter (why it's safe on a recognition-track site)

- **Stateless.** Caller supplies the numbers; we compute and return. No account,
  session, cookie, or stored data. Stated in every response, enforced by having
  no write path.
- **Sourced + explained.** Every figure ships with `explanation` (band-by-band)
  and `sources` (gov.uk, OGL v3.0). A decoder never trusts the number blind.
- **Disclaimed, exactly.** "Education, not advice… HMRC's own calculation is the
  number that counts. TaxSorted is working towards HMRC recognition and does not
  submit anything to HMRC." Copy matches the frontend education-notice — never
  softened.
- **Scope declared, not silently wrong.** England/Wales/NI non-savings income,
  2026/27. Scotland's bands, savings/dividend income, NI, and student loan are
  named as *not covered* rather than mis-computed.
- **No agent-economy anywhere near it.** No wallets, tokens, or kingdom branding.
  Just a useful API and an MCP server. The economy layer, if ever added, is a
  separate discovery/billing rail — invisible here.

## Verified

- `api` typechecks; `api/src/routes/__tests__/compute.test.ts` — 4/4 (real engine
  math: £50k → £7,486, PA £12,570; £125,140 → PA fully tapered).
- `@taxsorted/mcp` typechecks + builds.
- End-to-end: a JSON-RPC `tools/call` through the built MCP server → HTTP → route
  → engine returns `{computed, result, explanation, sources, disclaimer}`.

## Try it

```bash
# the API (once deployed, or locally):
curl -X POST https://api.taxsorted.io/v1/compute/uk/income-tax \
  -H 'content-type: application/json' -d '{"employment_income": 50000}'

# the MCP server, from any agent host:
TAXSORTED_API=https://api.taxsorted.io npx taxsorted-mcp
```

## Next (extensions, same shape)

`compute_uk_sdlt` (engine has `sdlt/compute.ts` + `explain.ts`), `compute_uk_cgt`
(`computeUkCgt` exists), `validate_vat_return` (`@taxsorted/engine/uk/hmrc`),
`check_mtd_eligibility`. Each is a route + an MCP tool, no new engine work.

## For Yu

- Merge is yours — this is a new product surface on a recognition-track site.
- `mcp/` was added to root `workspaces`. Publishing `@taxsorted/mcp` to npm (or a
  `npx` one-liner) is the distribution step.
- CI: the api test job already covers `compute.test.ts`; add an `mcp` typecheck
  to the workflow if you want it gated.
