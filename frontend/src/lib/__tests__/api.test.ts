// @vitest-environment jsdom

// The fraud-header piggyback in `call()` — only the browser-observable
// subset the WEB_APP_VIA_SERVER spec names (regs/research/fraud-headers.md
// §1) travels from the browser to the api; everything else (Device-ID,
// Connection-Method, User-IDs, Vendor-*) is asserted server-side
// (api/src/fraud.ts). No real network — fetch is mocked and its captured
// headers are asserted directly.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "../api";

function mockFetchOnce(body: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Node 22's built-in global `localStorage` stub throws ("getItem is not a
// function") in this jsdom + Vitest setup — unrelated to the header logic
// under test, but collectFraudPreventionHeaders()'s device-id lookup touches
// it. A tiny in-memory stand-in sidesteps the environment quirk.
function fakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", fakeLocalStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api client — fraud-header piggyback (fraud: true calls)", () => {
  it("forwards exactly the four browser-observable headers", async () => {
    const fetchMock = mockFetchOnce({ obligations: [], source: "hmrc-sandbox" });

    await api.itsaObligations("entity-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;

    expect(headers["Gov-Client-Timezone"]).toMatch(/^UTC[+-]\d{2}:\d{2}$/);
    expect(headers["Gov-Client-Screens"]).toMatch(/^width=\d+&height=\d+&scaling-factor=/);
    expect(headers["Gov-Client-Window-Size"]).toMatch(/^width=\d+&height=\d+$/);
    expect(typeof headers["Gov-Client-Browser-JS-User-Agent"]).toBe("string");
  });

  it("never forwards Gov-Client-Device-ID, Connection-Method, User-IDs, or any Gov-Vendor-* header — those are server-asserted", async () => {
    const fetchMock = mockFetchOnce({ obligations: [], source: "hmrc-sandbox" });

    await api.itsaObligations("entity-1");

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;

    expect(headers["Gov-Client-Device-ID"]).toBeUndefined();
    expect(headers["Gov-Client-Connection-Method"]).toBeUndefined();
    expect(headers["Gov-Client-User-IDs"]).toBeUndefined();
    for (const key of Object.keys(headers)) {
      expect(key.startsWith("Gov-Vendor-")).toBe(false);
    }
  });

  it("never forwards Gov-Client-Browser-Plugins or Gov-Client-Browser-Do-Not-Track (dropped from the required list)", async () => {
    const fetchMock = mockFetchOnce({ obligations: [], source: "hmrc-sandbox" });

    await api.itsaObligations("entity-1");

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;

    expect(headers["Gov-Client-Browser-Plugins"]).toBeUndefined();
    expect(headers["Gov-Client-Browser-Do-Not-Track"]).toBeUndefined();
  });

  it("does not attach fraud headers on a non-fraud call", async () => {
    const fetchMock = mockFetchOnce({ ok: true, hmrc: { configured: true, env: "sandbox" } });

    await api.health();

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers["Gov-Client-Timezone"]).toBeUndefined();
  });
});
