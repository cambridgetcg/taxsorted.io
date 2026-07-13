/**
 * TaxSorted for Agents — MCP server.
 *
 * A stdio Model Context Protocol server that lets any agent host (Claude
 * Desktop, an IDE assistant, a bookkeeping bot) call TaxSorted's honest UK
 * tax compute. It is a thin, decoupled client of the public compute API
 * (api.taxsorted.io/v1/compute) — no engine coupling, no keys, no account.
 *
 * The server never invents figures: it forwards the caller's numbers to the
 * published API and returns the API's own result, explanation, sources, and
 * disclaimer verbatim. Education, not advice — HMRC's own calculation is the
 * number that counts. This mirrors the API's substrate-honest perimeter:
 * stateless, sessionless, nothing stored.
 *
 * Run:  TAXSORTED_API=https://api.taxsorted.io npx taxsorted-mcp
 * (defaults to the production API; override for local testing.)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = (process.env.TAXSORTED_API ?? "https://api.taxsorted.io").replace(/\/+$/, "");
const UA = "taxsorted-mcp/0.1 (+https://taxsorted.io/from-the-builders)";

const server = new McpServer({
  name: "taxsorted",
  version: "0.1.0",
});

server.registerTool(
  "compute_uk_income_tax",
  {
    description:
      "Compute UK income tax on employment / non-savings income (England, Wales, " +
      "Northern Ireland; 2026/27). Returns the figure WITH a band-by-band " +
      "explanation and gov.uk sources. Education, not advice — HMRC's own " +
      "calculation is the number that counts. Does not cover Scotland's separate " +
      "bands, savings/dividend income, National Insurance, or student loan.",
    inputSchema: {
      employment_income: z
        .number()
        .min(0)
        .describe("Gross annual employment / non-savings income in GBP."),
    },
  },
  async ({ employment_income }) => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/v1/compute/uk/income-tax`, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": UA },
        body: JSON.stringify({ employment_income }),
      });
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Could not reach TaxSorted (${API_BASE}): ${String(err)}` }],
      };
    }
    const body = await res.text();
    if (!res.ok) {
      return { isError: true, content: [{ type: "text", text: `TaxSorted API ${res.status}: ${body}` }] };
    }
    // Forward the API's own honest payload verbatim — the server adds nothing
    // to the numbers, so nothing can drift from the published engine.
    return { content: [{ type: "text", text: body }] };
  },
);

server.registerTool(
  "get_uk_income_tax_contract",
  {
    description:
      "Fetch the machine-readable contract for UK income-tax compute: exact inputs, " +
      "what is and is not covered, sources, and the disclaimer. Call this first if " +
      "you want to know the scope before computing.",
  },
  async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/compute/uk/income-tax`, {
        headers: { "user-agent": UA },
      });
      return { content: [{ type: "text", text: await res.text() }] };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Could not reach TaxSorted (${API_BASE}): ${String(err)}` }],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
