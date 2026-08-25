import { beforeEach, describe, expect, it, vi } from "vitest";

const openidMocks = vi.hoisted(() => ({
  ResponseBodyError: class MockResponseBodyError extends Error {
    readonly error: string;

    constructor(error: string) {
      super(error);
      this.error = error;
    }
  },
  ClientSecretBasic: vi.fn((secret: string) => ({ method: "basic", secret })),
  discovery: vi.fn(),
  randomPKCECodeVerifier: vi.fn(),
  calculatePKCECodeChallenge: vi.fn(),
  randomState: vi.fn(),
  randomNonce: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  authorizationCodeGrant: vi.fn(),
  refreshTokenGrant: vi.fn(),
  tokenRevocation: vi.fn(),
}));

vi.mock("openid-client", () => openidMocks);

import {
  XERO_ISSUER,
  XERO_SCOPE,
  createXeroOidcClient,
  type XeroOidcClient,
  type XeroOpenIdRuntime,
} from "../xero-oidc.js";

const CONFIGURATION = {} as Awaited<
  ReturnType<XeroOpenIdRuntime["discover"]>
>;
const CALLBACK_URI =
  "https://api.example.test/v1/accounting/oauth/xero/callback";
const CODE_VERIFIER = "v".repeat(43);
const CODE_CHALLENGE = "c".repeat(43);
const STATE = "s".repeat(43);
const NONCE = "n".repeat(43);
const ACCESS_TOKEN = "access-token-value";
const REFRESH_TOKEN = "refresh-token-value";
const ID_TOKEN = "id-token-value";
const SUBJECT = "4d89f55d-a390-4f55-a2cb-40248550c79f";
const CONNECTION_ID = "e1eede29-f875-4a5d-8470-17f6a29a88b1";
const AUTH_EVENT_ID = "d99ecdfe-391d-43d2-b834-17636ba90e8d";
const TENANT_ID = "70784a63-d24b-46a9-a4db-0e70a274b056";

function tokenResponse(overrides: Record<string, unknown> = {}) {
  const response = {
    access_token: ACCESS_TOKEN,
    refresh_token: REFRESH_TOKEN,
    token_type: "bearer" as const,
    expires_in: 1_800,
    scope: XERO_SCOPE,
    id_token: ID_TOKEN,
    ...overrides,
  };
  return {
    ...response,
    claims:
      typeof overrides.claims === "function"
        ? overrides.claims
        : () =>
            response.id_token === undefined
              ? undefined
              : { sub: SUBJECT },
    expiresIn: () => response.expires_in,
  } as unknown as Awaited<
    ReturnType<XeroOpenIdRuntime["authorizationCodeGrant"]>
  >;
}

function authorizationUrl(parameters: Record<string, string>): URL {
  const url = new URL("https://login.xero.com/identity/connect/authorize");
  url.searchParams.set("client_id", "xero-client-id");
  url.searchParams.set("response_type", "code");
  for (const [name, value] of Object.entries(parameters)) {
    url.searchParams.set(name, value);
  }
  return url;
}

function fakeRuntime(
  overrides: Partial<XeroOpenIdRuntime> = {},
): XeroOpenIdRuntime {
  return {
    discover: vi.fn(async () => CONFIGURATION),
    randomCodeVerifier: vi.fn(() => CODE_VERIFIER),
    calculateCodeChallenge: vi.fn(async () => CODE_CHALLENGE),
    randomState: vi.fn(() => STATE),
    randomNonce: vi.fn(() => NONCE),
    buildAuthorizationUrl: vi.fn((_configuration, parameters) =>
      authorizationUrl(parameters),
    ),
    authorizationCodeGrant: vi.fn(async () => tokenResponse()),
    refreshTokenGrant: vi.fn(async () => tokenResponse()),
    tokenRevocation: vi.fn(async () => undefined),
    ...overrides,
  };
}

function responseJson(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

type TestFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function mockFetch(implementation: TestFetch) {
  return vi.fn(implementation);
}

function connectionResponse() {
  return [
    {
      id: CONNECTION_ID,
      authEventId: AUTH_EVENT_ID,
      tenantId: TENANT_ID,
      tenantType: "ORGANISATION",
      tenantName: "TaxSorted Demo Ltd",
      createdDateUtc: "2026-08-25T12:13:14.123Z",
      updatedDateUtc: "2026-08-25T12:15:16.456Z",
    },
  ];
}

async function makeClient(options: {
  runtime?: XeroOpenIdRuntime;
  fetch?: typeof fetch;
  timeout?: number;
} = {}): Promise<XeroOidcClient> {
  return createXeroOidcClient(
    {
      clientId: "xero-client-id",
      clientSecret: "xero-client-secret",
      callbackUri: CALLBACK_URI,
      ...(options.timeout === undefined
        ? {}
        : { requestTimeoutMs: options.timeout }),
    },
    {
      openid: options.runtime ?? fakeRuntime(),
      fetch: options.fetch ?? mockFetch(async () => responseJson([])),
    },
  );
}

function header(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name);
}

beforeEach(() => {
  vi.clearAllMocks();
  openidMocks.discovery.mockResolvedValue(CONFIGURATION);
});

describe("Xero OIDC configuration", () => {
  it("discovers Xero with ClientSecretBasic and a bounded timeout", async () => {
    const basic = { method: "basic", secret: "xero-client-secret" };
    openidMocks.ClientSecretBasic.mockReturnValue(basic);

    await createXeroOidcClient(
      {
        clientId: "xero-client-id",
        clientSecret: "xero-client-secret",
        callbackUri: CALLBACK_URI,
      },
      { fetch: mockFetch(async () => responseJson([])) },
    );

    expect(openidMocks.ClientSecretBasic).toHaveBeenCalledWith(
      "xero-client-secret",
    );
    expect(openidMocks.discovery).toHaveBeenCalledWith(
      new URL(XERO_ISSUER),
      "xero-client-id",
      undefined,
      basic,
      { timeout: 10 },
    );
  });

  it.each([
    [
      { clientId: "", clientSecret: "secret", callbackUri: CALLBACK_URI },
      "invalid_configuration",
    ],
    [
      { clientId: "client", clientSecret: "", callbackUri: CALLBACK_URI },
      "invalid_configuration",
    ],
    [
      {
        clientId: "client",
        clientSecret: "secret",
        callbackUri: "https://api.example.test/wrong-path",
      },
      "invalid_configuration",
    ],
    [
      {
        clientId: "client",
        clientSecret: "secret",
        callbackUri: CALLBACK_URI,
        requestTimeoutMs: 30_001,
      },
      "invalid_configuration",
    ],
  ])("rejects invalid client configuration", async (options, code) => {
    await expect(
      createXeroOidcClient(options, {
        openid: fakeRuntime(),
        fetch: mockFetch(async () => responseJson([])),
      }),
    ).rejects.toMatchObject({ code });
  });
});

describe("authorization code, PKCE, state and nonce", () => {
  it("builds one fixed, least-privilege authorization request", async () => {
    const runtime = fakeRuntime();
    const client = await makeClient({ runtime });

    const transaction = await client.beginAuthorization();
    const url = new URL(transaction.authorizationUrl);

    expect(transaction).toMatchObject({
      codeVerifier: CODE_VERIFIER,
      state: STATE,
      nonce: NONCE,
    });
    expect(runtime.calculateCodeChallenge).toHaveBeenCalledWith(CODE_VERIFIER);
    expect(runtime.buildAuthorizationUrl).toHaveBeenCalledWith(CONFIGURATION, {
      redirect_uri: CALLBACK_URI,
      scope: "openid offline_access accounting.settings.read",
      code_challenge: CODE_CHALLENGE,
      code_challenge_method: "S256",
      state: STATE,
      nonce: NONCE,
    });
    expect(url.searchParams.get("scope")).toBe(XERO_SCOPE);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.getAll("state")).toHaveLength(1);
  });

  it("rejects a discovered authorisation endpoint outside Xero's fixed login door", async () => {
    const runtime = fakeRuntime({
      buildAuthorizationUrl: vi.fn((_configuration, parameters) => {
        const url = new URL("https://lookalike.example/identity/connect/authorize");
        url.searchParams.set("response_type", "code");
        for (const [name, value] of Object.entries(
          parameters as Record<string, string>,
        )) {
          url.searchParams.set(name, value);
        }
        return url;
      }),
    });
    const client = await makeClient({ runtime });

    await expect(client.beginAuthorization()).rejects.toMatchObject({
      code: "invalid_oauth_transaction",
    });
  });

  it("passes expected state, expected nonce and PKCE verifier to openid-client", async () => {
    const grant = vi.fn(async () => tokenResponse());
    const runtime = fakeRuntime({ authorizationCodeGrant: grant });
    const client = await makeClient({ runtime });
    const callbackUrl = `${CALLBACK_URI}?code=provider-code&state=${STATE}`;

    await expect(
      client.completeAuthorization({
        callbackUrl,
        codeVerifier: CODE_VERIFIER,
        expectedState: STATE,
        expectedNonce: NONCE,
      }),
    ).resolves.toEqual({
      accessToken: ACCESS_TOKEN,
      refreshToken: REFRESH_TOKEN,
      expiresInSeconds: 1_800,
      scope: XERO_SCOPE,
      idToken: ID_TOKEN,
      subject: SUBJECT,
    });

    expect(grant).toHaveBeenCalledWith(
      CONFIGURATION,
      new URL(callbackUrl),
      {
        pkceCodeVerifier: CODE_VERIFIER,
        expectedState: STATE,
        expectedNonce: NONCE,
        idTokenExpected: true,
      },
    );
  });

  it("does not hand-parse state and leaves equality validation to openid-client", async () => {
    const grant = vi.fn(async () => tokenResponse());
    const client = await makeClient({
      runtime: fakeRuntime({ authorizationCodeGrant: grant }),
    });
    const returnedState = "r".repeat(43);

    await client.completeAuthorization({
      callbackUrl: `${CALLBACK_URI}?code=provider-code&state=${returnedState}`,
      codeVerifier: CODE_VERIFIER,
      expectedState: STATE,
      expectedNonce: NONCE,
    });

    expect(grant).toHaveBeenCalledWith(
      CONFIGURATION,
      expect.objectContaining({
        href: `${CALLBACK_URI}?code=provider-code&state=${returnedState}`,
      }),
      expect.objectContaining({ expectedState: STATE, expectedNonce: NONCE }),
    );
  });

  it.each([
    ["https://evil.example/callback?code=x&state=y"],
    [`${CALLBACK_URI}?code=one&code=two&state=${STATE}`],
    [`${CALLBACK_URI}#code=fragment`],
  ])("rejects a callback outside the fixed callback contract", async (callbackUrl) => {
    const runtime = fakeRuntime();
    const client = await makeClient({ runtime });
    await expect(
      client.completeAuthorization({
        callbackUrl,
        codeVerifier: CODE_VERIFIER,
        expectedState: STATE,
        expectedNonce: NONCE,
      }),
    ).rejects.toMatchObject({ code: "invalid_callback_url" });
    expect(runtime.authorizationCodeGrant).not.toHaveBeenCalled();
  });

  it("rejects missing or broader granted scopes after library validation", async () => {
    const client = await makeClient({
      runtime: fakeRuntime({
        authorizationCodeGrant: vi.fn(async () =>
          tokenResponse({
            scope: `${XERO_SCOPE} accounting.transactions.read`,
          }),
        ),
      }),
    });
    await expect(
      client.completeAuthorization({
        callbackUrl: `${CALLBACK_URI}?code=code&state=${STATE}`,
        codeVerifier: CODE_VERIFIER,
        expectedState: STATE,
        expectedNonce: NONCE,
      }),
    ).rejects.toMatchObject({ code: "invalid_token_response" });
  });

  it("takes the subject from verified claims and accepts Xero's Bearer casing", async () => {
    const claims = vi.fn(() => ({ sub: SUBJECT }));
    const client = await makeClient({
      runtime: fakeRuntime({
        authorizationCodeGrant: vi.fn(async () =>
          tokenResponse({ token_type: "Bearer", claims }),
        ),
      }),
    });

    await expect(
      client.completeAuthorization({
        callbackUrl: `${CALLBACK_URI}?code=code&state=${STATE}`,
        codeVerifier: CODE_VERIFIER,
        expectedState: STATE,
        expectedNonce: NONCE,
      }),
    ).resolves.toMatchObject({ subject: SUBJECT });
    expect(claims).toHaveBeenCalledOnce();
  });

  it("rejects an initial grant without a verified OpenID subject", async () => {
    const client = await makeClient({
      runtime: fakeRuntime({
        authorizationCodeGrant: vi.fn(async () =>
          tokenResponse({ claims: () => ({}) }),
        ),
      }),
    });

    await expect(
      client.completeAuthorization({
        callbackUrl: `${CALLBACK_URI}?code=code&state=${STATE}`,
        codeVerifier: CODE_VERIFIER,
        expectedState: STATE,
        expectedNonce: NONCE,
      }),
    ).rejects.toMatchObject({ code: "invalid_token_response" });
  });
});

describe("refresh and revocation", () => {
  it("uses openid-client refresh and retains the current refresh token if omitted", async () => {
    const refreshTokenGrant = vi.fn(async () =>
      tokenResponse({ refresh_token: undefined, id_token: undefined }),
    );
    const runtime = fakeRuntime({ refreshTokenGrant });
    const client = await makeClient({ runtime });

    await expect(client.refresh(REFRESH_TOKEN)).resolves.toEqual({
      accessToken: ACCESS_TOKEN,
      refreshToken: REFRESH_TOKEN,
      expiresInSeconds: 1_800,
      scope: XERO_SCOPE,
    });
    expect(refreshTokenGrant).toHaveBeenCalledWith(
      CONFIGURATION,
      REFRESH_TOKEN,
    );
  });

  it("revokes only the refresh token with an explicit type hint", async () => {
    const tokenRevocation = vi.fn(async () => undefined);
    const client = await makeClient({
      runtime: fakeRuntime({ tokenRevocation }),
    });

    await client.revoke(REFRESH_TOKEN);

    expect(tokenRevocation).toHaveBeenCalledWith(
      CONFIGURATION,
      REFRESH_TOKEN,
      { token_type_hint: "refresh_token" },
    );
  });

  it("turns openid-client invalid_grant into a stable reauthorisation signal", async () => {
    const providerError = new openidMocks.ResponseBodyError("invalid_grant");
    const client = await makeClient({
      runtime: fakeRuntime({
        refreshTokenGrant: vi.fn(async () => {
          throw providerError;
        }),
      }),
    });

    await expect(client.refresh(REFRESH_TOKEN)).rejects.toMatchObject({
      code: "invalid_grant",
      message:
        "Xero refresh grant is no longer valid; reauthorisation is required",
    });
  });
});

describe("bounded Xero resource client", () => {
  it("lists only strictly parsed connections from the fixed endpoint", async () => {
    const request = mockFetch(async () => responseJson(connectionResponse()));
    const client = await makeClient({ fetch: request });

    await expect(client.listConnections(ACCESS_TOKEN)).resolves.toEqual([
      {
        connectionId: CONNECTION_ID,
        authEventId: AUTH_EVENT_ID,
        tenantId: TENANT_ID,
        tenantType: "ORGANISATION",
        tenantName: "TaxSorted Demo Ltd",
        createdAt: "2026-08-25T12:13:14.123Z",
        updatedAt: "2026-08-25T12:15:16.456Z",
      },
    ]);
    expect(request).toHaveBeenCalledOnce();
    const [url, maybeInit] = request.mock.calls[0]!;
    const init = maybeInit!;
    expect(url).toBe("https://api.xero.com/connections");
    expect(init.method).toBe("GET");
    expect(init.redirect).toBe("error");
    expect(header(init, "Authorization")).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(header(init, "Accept")).toBe("application/json");
    expect(header(init, "xero-tenant-id")).toBeNull();
  });

  it("normalises provider UUID casing before a binding reaches storage", async () => {
    const [raw] = connectionResponse();
    const request = mockFetch(async () => responseJson([{
      ...raw,
      id: CONNECTION_ID.toUpperCase(),
      authEventId: AUTH_EVENT_ID.toUpperCase(),
      tenantId: TENANT_ID.toUpperCase(),
    }]));
    const client = await makeClient({ fetch: request });

    await expect(client.listConnections(ACCESS_TOKEN)).resolves.toEqual([
      expect.objectContaining({
        connectionId: CONNECTION_ID,
        authEventId: AUTH_EVENT_ID,
        tenantId: TENANT_ID,
      }),
    ]);
  });

  it("accepts Xero's official connection example without authEventId or a Z suffix", async () => {
    const request = mockFetch(async () =>
      responseJson([
        {
          id: "7cb59f93-2964-421d-bb5e-a0f7a4572a44",
          tenantId: "fe79f7dd-b6d4-4a92-ba7b-538af6289c58",
          tenantName: "Demo Company (NZ)",
          tenantType: "ORGANISATION",
          createdDateUtc: "2019-12-07T18:46:19.5165400",
          updatedDateUtc: "2019-12-07T18:46:19.5187840",
        },
      ]),
    );
    const client = await makeClient({ fetch: request });

    await expect(client.listConnections(ACCESS_TOKEN)).resolves.toEqual([
      {
        connectionId: "7cb59f93-2964-421d-bb5e-a0f7a4572a44",
        authEventId: null,
        tenantId: "fe79f7dd-b6d4-4a92-ba7b-538af6289c58",
        tenantType: "ORGANISATION",
        tenantName: "Demo Company (NZ)",
        createdAt: "2019-12-07T18:46:19.5165400",
        updatedAt: "2019-12-07T18:46:19.5187840",
      },
    ]);
  });

  it("rejects an impossible connection timestamp", async () => {
    const [connection] = connectionResponse();
    const request = mockFetch(async () =>
      responseJson([
        {
          ...connection,
          createdDateUtc: "2026-02-31T12:13:14.123Z",
        },
      ]),
    );
    const client = await makeClient({ fetch: request });

    await expect(client.listConnections(ACCESS_TOKEN)).rejects.toMatchObject({
      code: "invalid_xero_response",
    });
  });

  it("gets only organisation settings and pins the requested tenant header", async () => {
    const request = mockFetch(async () =>
      responseJson({
        Id: "de7343b5-8b7c-4c58-ae57-610cf2869d0a",
        Status: "OK",
        ProviderName: "TaxSorted",
        DateTimeUTC: "/Date(1787650000000)/",
        Organisations: [
          {
            OrganisationID: TENANT_ID,
            Name: "TaxSorted Demo Ltd",
            CountryCode: "GB",
            BaseCurrency: "GBP",
            IsDemoCompany: true,
            OrganisationStatus: "ACTIVE",
            LegalName: "Ignored but never persisted here",
          },
        ],
      }),
    );
    const client = await makeClient({ fetch: request });

    await expect(
      client.getOrganisation(ACCESS_TOKEN, TENANT_ID),
    ).resolves.toEqual({
      organisationId: TENANT_ID,
      name: "TaxSorted Demo Ltd",
      countryCode: "GB",
      baseCurrency: "GBP",
      isDemoCompany: true,
      status: "ACTIVE",
    });
    const [url, maybeInit] = request.mock.calls[0]!;
    const init = maybeInit!;
    expect(url).toBe("https://api.xero.com/api.xro/2.0/Organisation");
    expect(init.method).toBe("GET");
    expect(header(init, "xero-tenant-id")).toBe(TENANT_ID);
  });

  it("rejects an organisation response for a different tenant", async () => {
    const request = mockFetch(async () =>
      responseJson({
        Organisations: [
          {
            OrganisationID: "45e4708e-d862-4111-ab3a-dd8cd03913e1",
            Name: "Wrong tenant",
            CountryCode: "GB",
            BaseCurrency: "GBP",
            IsDemoCompany: false,
            OrganisationStatus: "ACTIVE",
          },
        ],
      }),
    );
    const client = await makeClient({ fetch: request });
    await expect(
      client.getOrganisation(ACCESS_TOKEN, TENANT_ID),
    ).rejects.toMatchObject({ code: "invalid_xero_response" });
  });

  it("disconnects by the connectionId returned by Xero and no other endpoint", async () => {
    const request = mockFetch(async () => responseJson([]));
    request
      .mockResolvedValueOnce(responseJson(connectionResponse()))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = await makeClient({ fetch: request });
    const [connection] = await client.listConnections(ACCESS_TOKEN);

    await client.disconnectConnection(ACCESS_TOKEN, connection!);

    const [url, maybeInit] = request.mock.calls[1]!;
    const init = maybeInit!;
    expect(url).toBe(
      `https://api.xero.com/connections/${CONNECTION_ID}`,
    );
    expect(init.method).toBe("DELETE");
    expect(header(init, "xero-tenant-id")).toBeNull();
  });

  it("rejects duplicate JSON fields, malformed shapes and oversized bodies", async () => {
    const duplicate = new Response(
      `[{"id":"${CONNECTION_ID}","id":"${CONNECTION_ID}"}]`,
      { headers: { "Content-Type": "application/json" } },
    );
    const malformed = responseJson([{ id: "not-a-uuid" }]);
    const oversized = new Response("[]", {
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(128 * 1024 + 1),
      },
    });
    const request = mockFetch(async () => responseJson([]));
    request
      .mockResolvedValueOnce(duplicate)
      .mockResolvedValueOnce(malformed)
      .mockResolvedValueOnce(oversized);
    const client = await makeClient({ fetch: request });

    await expect(client.listConnections(ACCESS_TOKEN)).rejects.toMatchObject({
      code: "invalid_xero_response",
    });
    await expect(client.listConnections(ACCESS_TOKEN)).rejects.toMatchObject({
      code: "invalid_xero_response",
    });
    await expect(client.listConnections(ACCESS_TOKEN)).rejects.toMatchObject({
      code: "xero_response_too_large",
    });
  });

  it("caps the pilot connection response at 25 entries", async () => {
    const request = mockFetch(async () =>
      responseJson(
        Array.from({ length: 26 }, () => connectionResponse()[0]),
      ),
    );
    const client = await makeClient({ fetch: request });

    await expect(client.listConnections(ACCESS_TOKEN)).rejects.toMatchObject({
      code: "invalid_xero_response",
    });
  });

  it("has a bounded request timeout and never falls through to a real network", async () => {
    const request = mockFetch(
      async (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    const client = await makeClient({ fetch: request, timeout: 1 });

    await expect(client.listConnections(ACCESS_TOKEN)).rejects.toEqual(
      expect.objectContaining({
        code: "xero_request_timed_out",
      }),
    );
    expect(request).toHaveBeenCalledOnce();
  });

  it("does not echo provider response bodies or bearer tokens in errors", async () => {
    const request = mockFetch(async () =>
      responseJson({ secret: "provider-private-detail" }, 401),
    );
    const client = await makeClient({ fetch: request });

    let caught: unknown;
    try {
      await client.listConnections(ACCESS_TOKEN);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    const error = caught as Error;
    expect(error.message).toBe("Xero request failed with HTTP 401");
    expect(error.message).not.toContain(ACCESS_TOKEN);
    expect(error.message).not.toContain("provider-private-detail");
  });
});
