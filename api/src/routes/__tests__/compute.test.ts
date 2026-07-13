// The compute route — stateless UK income-tax with working + sources.
//
// Mirrors the sdlt test's shape: exercise the real Hono app against the real
// engine (no mocks — this is pure compute), assert honest figures, the
// mandatory disclaimer, the sourced provenance, and the sessionless perimeter
// (no set-cookie ever).

import { describe, expect, it } from "vitest";
import { createComputeRoutes } from "../compute.js";

const app = createComputeRoutes();

async function compute(payload: unknown) {
  return app.request("/uk/income-tax", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /v1/compute/uk/income-tax", () => {
  it("computes a £50,000 salary with band working, sources, and a disclaimer", async () => {
    const res = await compute({ employment_income: 50_000 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.computed).toBe("uk-income-tax");
    // £50k, 2026/27 EWNI: PA £12,570 → taxable £37,430, all basic rate = £7,486.
    expect(body.result.personalAllowance).toBe(12_570);
    expect(body.result.totalIncomeTax).toBe(7_486);
    expect(body.result.higherTax).toBe(0);
    expect(body.explanation.length).toBeGreaterThan(0);
    expect(body.sources.some((s: { url: string }) => s.url.includes("gov.uk"))).toBe(true);
    expect(body.disclaimer).toContain("Education, not advice");
    expect(body.stateless).toBe(true);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("tapers the Personal Allowance above £100,000 and reaches higher/additional rates", async () => {
    const res = await compute({ employment_income: 125_140 });
    const body = await res.json();
    // At £125,140 the Personal Allowance is fully tapered away.
    expect(body.result.personalAllowance).toBe(0);
    expect(body.result.personalAllowanceLost).toBe(12_570);
    expect(body.result.higherTax).toBeGreaterThan(0);
  });

  it("rejects a missing/invalid amount with a typed problem, not a crash", async () => {
    const res = await compute({ salary: "lots" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
  });

  it("serves a sessionless contract on GET", async () => {
    const res = await app.request("/uk/income-tax");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schema).toBe("taxsorted.compute-contract/1");
    expect(body.scope.does_not_cover).toContain("Scotland");
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
