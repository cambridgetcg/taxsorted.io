import { describe, expect, it, vi } from "vitest";
import {
  isProfessionalOpportunityGuardedPath,
  makeProfessionalOpportunityEdgeWorker,
  professionalOpportunityEdgeGateIsOpen,
  professionalOpportunityEdgeRoutes,
  type ProfessionalOpportunityEdgeGateManifest,
} from "../uk-professional-opportunity-edge-guard";

function manifest(
  state: "closed" | "open",
  reviewBy: string | null,
): ProfessionalOpportunityEdgeGateManifest {
  return {
    schema: "taxsorted.uk.professional-opportunity-edge-gate/1",
    state,
    corpusDigest: `sha256:${"a".repeat(64)}`,
    reviewBy,
  };
}

function workerFor(value: ProfessionalOpportunityEdgeGateManifest) {
  const source = makeProfessionalOpportunityEdgeWorker(value).replace(
    "export default",
    "return",
  );
  return new Function(source)() as {
    fetch(
      request: Request,
      environment: {
        ASSETS: { fetch(request: Request): Promise<Response> };
      },
    ): Promise<Response>;
  };
}

describe("professional-opportunity Cloudflare edge guard", () => {
  it("uses an inclusive UTC review date and fails closed on malformed state", () => {
    expect(
      professionalOpportunityEdgeGateIsOpen(
        manifest("open", "2026-10-24"),
        "2026-10-24",
      ),
    ).toBe(true);
    expect(
      professionalOpportunityEdgeGateIsOpen(
        manifest("open", "2026-10-24"),
        "2026-10-25",
      ),
    ).toBe(false);
    expect(
      professionalOpportunityEdgeGateIsOpen(
        manifest("closed", "2099-01-01"),
        "2026-10-24",
      ),
    ).toBe(false);
  });

  it("guards only the two atlas route trees", () => {
    for (const path of [
      "/uk/opportunities",
      "/uk/opportunities/",
      "/uk/opportunities/example",
      "/uk/regulator-scrutiny",
      "/uk/regulator-scrutiny/__next.route.txt",
    ]) {
      expect(isProfessionalOpportunityGuardedPath(path), path).toBe(true);
    }
    expect(isProfessionalOpportunityGuardedPath("/uk")).toBe(false);
    expect(isProfessionalOpportunityGuardedPath("/_next/static/app.js")).toBe(
      false,
    );
    expect(professionalOpportunityEdgeRoutes.include).toHaveLength(4);
  });

  it("returns a corpus-free no-store shell when closed or expired", async () => {
    const assets = { fetch: vi.fn() };
    const closed = workerFor(manifest("open", "2000-01-01"));
    const response = await closed.fetch(
      new Request("https://taxsorted.io/uk/opportunities/example"),
      { ASSETS: assets },
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, nofollow",
    );
    expect(
      response.headers.get(
        "x-taxsorted-professional-opportunity-guard",
      ),
    ).toBe("closed");
    expect(body).toContain("Hosted distribution gate closed");
    expect(body).not.toContain("Commercial-property fixtures");
    expect(assets.fetch).not.toHaveBeenCalled();

    const headResponse = await closed.fetch(
      new Request("https://taxsorted.io/uk/opportunities/example", {
        method: "HEAD",
      }),
      { ASSETS: assets },
    );
    expect(headResponse.status).toBe(200);
    expect(await headResponse.text()).toBe("");
    expect(
      headResponse.headers.get(
        "x-taxsorted-professional-opportunity-guard",
      ),
    ).toBe("closed");
  });

  it("marks current guarded assets no-store and passes unrelated assets through", async () => {
    const assets = {
      fetch: vi.fn(async () =>
        new Response("guarded corpus projection", {
          headers: { "Cache-Control": "public, max-age=3600" },
        }),
      ),
    };
    const open = workerFor(manifest("open", "2099-01-01"));
    const guarded = await open.fetch(
      new Request("https://taxsorted.io/uk/opportunities"),
      { ASSETS: assets },
    );
    expect(await guarded.text()).toBe("guarded corpus projection");
    expect(guarded.headers.get("cache-control")).toBe("no-store");
    expect(
      guarded.headers.get(
        "x-taxsorted-professional-opportunity-guard",
      ),
    ).toBe("open");

    const unrelated = await open.fetch(
      new Request("https://taxsorted.io/_next/static/app.js"),
      { ASSETS: assets },
    );
    expect(await unrelated.text()).toBe("guarded corpus projection");
  });
});
