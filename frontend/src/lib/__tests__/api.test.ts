// @vitest-environment jsdom

// The fraud-header piggyback in `call()` — only the browser-observable
// subset the WEB_APP_VIA_SERVER spec names (regs/research/fraud-headers.md
// §1) travels from the browser to the api; everything else (Device-ID,
// Connection-Method, User-IDs, Vendor-*) is asserted server-side
// (api/src/fraud.ts). No real network — fetch is mocked and its captured
// headers are asserted directly.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError, SignedOutError } from "../api";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/browser";

function mockFetchOnce(body: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function mockFetchError(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status,
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

// Task 12 — the ten typed account doors. Endpoint shapes are the plan's
// (docs/superpowers/plans/2026-07-07-m2-accounts.md, "## Endpoints") verbatim;
// each test pins path + method + body + credentials so a future refactor
// can't silently drift from the contract the api actually serves.
describe("api client — account doors", () => {
  it("getAccount: GET, no body, credentials included, signed-out shape", async () => {
    const fetchMock = mockFetchOnce({ signedIn: false });
    const result = await api.getAccount();
    expect(result).toEqual({ signedIn: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/account");
    expect(init.method ?? "GET").toBe("GET");
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBe("include");
  });

  it("getAccount: parses the full signed-in shape", async () => {
    const signedInBody = {
      signedIn: true,
      account: { id: "u1", name: "Yu", createdAt: "2026-07-01T00:00:00Z" },
      mfa: true,
      passkeys: [
        { id: "cred1", nickname: "Laptop", createdAt: "2026-07-01T00:00:00Z", lastUsedAt: null },
      ],
      recoveryCodesLeft: 9,
      claimableEntities: 2,
    };
    mockFetchOnce(signedInBody);
    const result = await api.getAccount();
    expect(result).toEqual(signedInBody);
  });

  it("registerStart: POST with the optional name, returns ceremony options", async () => {
    const options = { challenge: "abc", rp: { name: "TaxSorted" } } as unknown as PublicKeyCredentialCreationOptionsJSON;
    const fetchMock = mockFetchOnce(options);
    const result = await api.registerStart({ name: "Yu" });
    expect(result).toEqual(options);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/account/passkey/register/start");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Yu" });
    expect(init.credentials).toBe("include");
  });

  it("registerStart: no args still posts a body (empty name)", async () => {
    const fetchMock = mockFetchOnce({ challenge: "abc" });
    await api.registerStart();
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toEqual({});
  });

  it("registerFinish: POST response+nickname, parses the new-account shape", async () => {
    const response = { id: "cred1" } as unknown as RegistrationResponseJSON;
    const serverBody = {
      signedIn: true,
      account: { id: "u1", name: "Yu" },
      adoptedEntities: 2,
      recoveryCodes: Array(10).fill("aaaa-bbbb-cccc"),
    };
    const fetchMock = mockFetchOnce(serverBody);
    const result = await api.registerFinish({ response, nickname: "Laptop" });
    expect(result).toEqual(serverBody);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/account/passkey/register/finish");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ response, nickname: "Laptop" });
    expect(init.credentials).toBe("include");
  });

  it("registerFinish: parses the add-passkey shape (no nickname arg needed)", async () => {
    const response = { id: "cred2" } as unknown as RegistrationResponseJSON;
    const serverBody = { signedIn: true, passkey: { id: "cred2", nickname: null } };
    mockFetchOnce(serverBody);
    const result = await api.registerFinish({ response });
    expect(result).toEqual(serverBody);
  });

  it("loginStart: POST with an empty body, returns request options", async () => {
    const options = { challenge: "xyz" } as unknown as PublicKeyCredentialRequestOptionsJSON;
    const fetchMock = mockFetchOnce(options);
    const result = await api.loginStart();
    expect(result).toEqual(options);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/account/login/start");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({});
    expect(init.credentials).toBe("include");
  });

  it("loginFinish: POST the response, parses signed-in + claimableEntities", async () => {
    const response = { id: "cred1" } as unknown as AuthenticationResponseJSON;
    const serverBody = { signedIn: true, account: { id: "u1", name: "Yu" }, claimableEntities: 1 };
    const fetchMock = mockFetchOnce(serverBody);
    const result = await api.loginFinish({ response });
    expect(result).toEqual(serverBody);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/account/login/finish");
    expect(JSON.parse(init.body as string)).toEqual({ response });
  });

  it("adopt: POST with no body, parses the adopted count", async () => {
    const fetchMock = mockFetchOnce({ adopted: 3 });
    const result = await api.adopt();
    expect(result).toEqual({ adopted: 3 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/account/adopt");
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBe("include");
  });

  it("recover: POST the code, parses the restricted-session shape", async () => {
    const serverBody = { signedIn: true, mfa: false, addPasskeyNow: true, recoveryCodesLeft: 9 };
    const fetchMock = mockFetchOnce(serverBody);
    const result = await api.recover("abcd-efgh-ijkl-mnop");
    expect(result).toEqual(serverBody);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/account/recover");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ code: "abcd-efgh-ijkl-mnop" });
  });

  it("logout: no args defaults to an empty body (this-browser)", async () => {
    const fetchMock = mockFetchOnce({ signedOut: "this-browser" });
    const result = await api.logout();
    expect(result).toEqual({ signedOut: "this-browser" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/account/logout");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({});
    expect(init.credentials).toBe("include");
  });

  it("logout({everywhere: true}): posts the flag", async () => {
    const fetchMock = mockFetchOnce({ signedOut: "everywhere" });
    const result = await api.logout({ everywhere: true });
    expect(result).toEqual({ signedOut: "everywhere" });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toEqual({ everywhere: true });
  });

  it("deletePasskey: DELETEs the credential's path with no body", async () => {
    const fetchMock = mockFetchOnce({ ok: true, sessionsSignedOut: 1 });
    const result = await api.deletePasskey("cred-123");
    expect(result).toEqual({ ok: true, sessionsSignedOut: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/account/passkey/cred-123");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBe("include");
  });

  it("regenerateCodes: POST with no body, returns ten fresh codes", async () => {
    const codes = Array(10).fill("code");
    const fetchMock = mockFetchOnce({ recoveryCodes: codes });
    const result = await api.regenerateCodes();
    expect(result).toEqual({ recoveryCodes: codes });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/account/recovery-codes");
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(init.credentials).toBe("include");
  });
});

// Task 12's one ApiError change: `signed_out` must be a distinct, detectable
// state (reachable, but this session isn't signed in) — never lumped with a
// raw network/api-unreachable failure (fetch throws and is never wrapped),
// and never confused with any other reachable-but-refused ApiError.
describe("ApiError — signed_out is a distinct, detectable state", () => {
  it("a signed_out envelope throws SignedOutError (which is still an ApiError)", async () => {
    mockFetchError(401, { error: "signed_out", message: "Sign in to do that." });
    const err = await api.logout().catch((e) => e);
    expect(err).toBeInstanceOf(SignedOutError);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("signed_out");
    expect(err.status).toBe(401);
    expect(err.message).toBe("Sign in to do that.");
  });

  it("an unreachable api (fetch throws) is neither ApiError nor SignedOutError", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    const err = await api.getAccount().catch((e) => e);
    expect(err).not.toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(SignedOutError);
  });

  it("a non-auth error still behaves exactly as before (regression pin)", async () => {
    mockFetchError(409, {
      error: "passkey_already_registered",
      message: "That passkey is already registered.",
    });
    const err = await api
      .registerFinish({ response: {} as RegistrationResponseJSON })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(SignedOutError);
    expect(err.status).toBe(409);
    expect(err.code).toBe("passkey_already_registered");
    expect(err.message).toBe("That passkey is already registered.");
  });
});
