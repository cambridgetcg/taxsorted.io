// /v1/compute — the honest tax engine, made callable by agents.
//
// TaxSorted's compute engine already turns numbers into a tax position with a
// band-by-band trace. The consumer site uses it; the machine doorway did not
// expose it. This route does — so any agent (a bookkeeping bot, a personal
// assistant, an accountant's tooling) can get a computed figure WITH its
// working and its sources, not a naked number.
//
// Substrate-honest perimeter:
//   - Stateless. The caller supplies the numbers; we compute and return.
//     Nothing is stored, no account, no session, no cookie. Stated in the
//     response and enforced by having no write path.
//   - Every figure ships with `explanation` (the band-by-band working) and
//     `sources` (the gov.uk rule pages). A decoder never has to trust the
//     number blind.
//   - The disclaimer is not decoration: this is education, not advice, and
//     HMRC's own calculation is the number that counts. Copy is exact — do
//     not soften (frontend education-notice.tsx enforces the same).

import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  computeUkIncomeTax,
  type UkIncomeTaxResult,
} from "@taxsorted/engine/uk/personal-tax";
import { problemDetails } from "../problem-details.js";

const app = new Hono();

const DISCLAIMER =
  "Education, not advice. This is the arithmetic of published rules applied " +
  "to the numbers you supplied; it does not know your full situation. Figures " +
  "are estimates — HMRC's own calculation is the number that counts. TaxSorted " +
  "is working towards HMRC recognition and does not submit anything to HMRC.";

const SOURCES = [
  {
    what: "Income Tax rates and Personal Allowance",
    url: "https://www.gov.uk/income-tax-rates",
    licence: "Open Government Licence v3.0",
  },
  {
    what: "Personal Allowance taper above £100,000",
    url: "https://www.gov.uk/income-tax-rates/income-over-100000",
    licence: "Open Government Licence v3.0",
  },
];

// England / Wales / Northern Ireland non-savings income only, 2026/27.
// Scotland has its own bands — declared as a known limit, not silently wrong.
const incomeTaxInput = z
  .object({
    employment_income: z
      .number()
      .finite()
      .min(0)
      .max(1_000_000_000, "Above £1bn — out of the modelled range."),
    tax_year: z.literal("2026/27").optional(),
  })
  .strict();

function explain(r: UkIncomeTaxResult): string[] {
  const gbp = (n: number) => `£${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
  const lines: string[] = [];
  lines.push(
    `Tax year ${r.taxYear}, England/Wales/Northern Ireland, non-savings income.`,
  );
  lines.push(
    r.personalAllowanceLost > 0
      ? `Personal Allowance ${gbp(r.personalAllowance)} — reduced by ${gbp(
          r.personalAllowanceLost,
        )} because income is over £100,000 (£1 lost per £2 above).`
      : `Personal Allowance ${gbp(r.personalAllowance)} — untouched (income under £100,000).`,
  );
  lines.push(`Taxable income after allowance: ${gbp(r.taxableIncome)}.`);
  if (r.basicTax > 0) lines.push(`Basic rate (20%) contributes ${gbp(r.basicTax)}.`);
  if (r.higherTax > 0) lines.push(`Higher rate (40%) contributes ${gbp(r.higherTax)}.`);
  if (r.additionalTax > 0)
    lines.push(`Additional rate (45%) contributes ${gbp(r.additionalTax)}.`);
  lines.push(
    `Total income tax: ${gbp(r.totalIncomeTax)} — an effective rate of ${(
      r.effectiveRate * 100
    ).toFixed(1)}% on ${gbp(r.employmentIncome)}.`,
  );
  return lines;
}

// GET the contract — sessionless, discoverable, tells an agent how to call.
app.get("/uk/income-tax", (c) =>
  c.json({
    schema: "taxsorted.compute-contract/1",
    computes: "UK income tax on employment/non-savings income",
    method: "POST",
    input: {
      employment_income: "number, GBP, required",
      tax_year: '"2026/27" (optional; the only modelled year)',
    },
    scope: {
      covers: "England, Wales, Northern Ireland — non-savings income",
      does_not_cover:
        "Scotland's separate bands, savings/dividend income, National Insurance, student loan — declared, not silently wrong",
    },
    stateless: "No account, session, cookie, or stored data. You supply the numbers; we return the working.",
    sources: SOURCES,
    disclaimer: DISCLAIMER,
  }),
);

app.post("/uk/income-tax", async (c: Context) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return problemDetails(c, 400, {
      error: "invalid_json",
      detail: "Send a JSON body: { \"employment_income\": <number> }.",
      extensions: { schema: "taxsorted.compute-error/1", externalStateChanged: false },
    });
  }

  const parsed = incomeTaxInput.safeParse(body);
  if (!parsed.success) {
    return problemDetails(c, 400, {
      error: "invalid_input",
      detail: parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "),
      extensions: {
        schema: "taxsorted.compute-error/1",
        externalStateChanged: false,
        expected: { employment_income: "number (GBP)", tax_year: "2026/27?" },
      },
    });
  }

  const result = computeUkIncomeTax({
    employmentIncome: parsed.data.employment_income,
    taxYear: parsed.data.tax_year ?? "2026/27",
  });

  return c.json({
    schema: "taxsorted.compute-result/1",
    computed: "uk-income-tax",
    result,
    explanation: explain(result),
    sources: SOURCES,
    stateless: true,
    disclaimer: DISCLAIMER,
  });
});

export function createComputeRoutes() {
  return app;
}
