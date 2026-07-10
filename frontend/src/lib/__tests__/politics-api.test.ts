// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { politicsApi } from "../politics-api";

afterEach(() => vi.unstubAllGlobals());

describe("public politics client", () => {
  it("loads the non-personal system record from its public door", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ schema: "taxsorted.uk.political-system/1" })),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(politicsApi.system()).resolves.toMatchObject({
      schema: "taxsorted.uk.political-system/1",
    });

    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("http://localhost:8787/v1/politics/uk/system");
    expect(init).not.toHaveProperty("credentials");
  });

  it("builds a bounded people query without sending a session cookie", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ people: [], total: 0, skip: 20, take: 20 })),
    );
    vi.stubGlobal("fetch", fetch);

    await politicsApi.people({ q: "Abbott", house: "commons", skip: 20, take: 20 });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      "http://localhost:8787/v1/politics/uk/people?q=Abbott&house=commons&skip=20&take=20",
    );
    expect(init).not.toHaveProperty("credentials");
    expect(init?.headers).toEqual({ Accept: "application/json" });
  });

  it("keeps the Electoral Commission reuse gate explicit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: "source_terms_confirmation_needed",
            message: "Use the official register until reuse terms are confirmed.",
            source: { url: "https://search.electoralcommission.org.uk/" },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      politicsApi.donations({ from: "2026-01-01", to: "2026-03-31" }),
    ).rejects.toMatchObject({
      status: 503,
      code: "source_terms_confirmation_needed",
      sourceUrl: "https://search.electoralcommission.org.uk/",
    });
  });
});
