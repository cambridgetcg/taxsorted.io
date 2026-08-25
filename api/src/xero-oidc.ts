import * as openidClient from "openid-client";
import { assertNoDuplicateJsonKeys } from "./strict-json.js";

export const XERO_ISSUER = "https://identity.xero.com";
export const XERO_SCOPE =
  "openid offline_access accounting.settings.read";

const AUTHORIZATION_URL =
  "https://login.xero.com/identity/connect/authorize";
const CONNECTIONS_URL = "https://api.xero.com/connections";
const ORGANISATION_URL =
  "https://api.xero.com/api.xro/2.0/Organisation";
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const OIDC_TIMEOUT_SECONDS = 10;
const MAX_CONNECTIONS_RESPONSE_BYTES = 128 * 1024;
const MAX_ORGANISATION_RESPONSE_BYTES = 256 * 1024;
const MAX_CONNECTIONS = 25;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const OAUTH_VALUE = /^[A-Za-z0-9._~-]+$/u;

type Fetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type OidcTokenResponse = openidClient.TokenEndpointResponse &
  openidClient.TokenEndpointResponseHelpers;

export interface XeroOpenIdRuntime {
  discover(
    clientId: string,
    clientSecret: string,
    timeoutSeconds: number,
  ): Promise<openidClient.Configuration>;
  randomCodeVerifier(): string;
  calculateCodeChallenge(codeVerifier: string): Promise<string>;
  randomState(): string;
  randomNonce(): string;
  buildAuthorizationUrl(
    configuration: openidClient.Configuration,
    parameters: Record<string, string>,
  ): URL;
  authorizationCodeGrant(
    configuration: openidClient.Configuration,
    callbackUrl: URL,
    checks: openidClient.AuthorizationCodeGrantChecks,
  ): Promise<OidcTokenResponse>;
  refreshTokenGrant(
    configuration: openidClient.Configuration,
    refreshToken: string,
  ): Promise<OidcTokenResponse>;
  tokenRevocation(
    configuration: openidClient.Configuration,
    token: string,
    parameters: Record<string, string>,
  ): Promise<void>;
}

const PANVA_OPENID_RUNTIME: XeroOpenIdRuntime = {
  discover(clientId, clientSecret, timeoutSeconds) {
    return openidClient.discovery(
      new URL(XERO_ISSUER),
      clientId,
      undefined,
      openidClient.ClientSecretBasic(clientSecret),
      { timeout: timeoutSeconds },
    );
  },
  randomCodeVerifier: openidClient.randomPKCECodeVerifier,
  calculateCodeChallenge: openidClient.calculatePKCECodeChallenge,
  randomState: openidClient.randomState,
  randomNonce: openidClient.randomNonce,
  buildAuthorizationUrl: openidClient.buildAuthorizationUrl,
  authorizationCodeGrant: openidClient.authorizationCodeGrant,
  refreshTokenGrant: openidClient.refreshTokenGrant,
  tokenRevocation: openidClient.tokenRevocation,
};

export interface XeroAuthorizationRequest {
  readonly authorizationUrl: string;
  /** Secret, single-use transaction material. Persist encrypted and consume it
      before completing the callback. */
  readonly codeVerifier: string;
  readonly state: string;
  readonly nonce: string;
}

export interface XeroAuthorizationCallback {
  readonly callbackUrl: string | URL;
  readonly codeVerifier: string;
  readonly expectedState: string;
  readonly expectedNonce: string;
}

export interface XeroTokenSet {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresInSeconds: number;
  readonly scope: typeof XERO_SCOPE;
  /** The validated OpenID subject. It is present on the initial grant and is
      obtained only from openid-client's verified claims helper. */
  readonly subject?: string;
  /** Present for the initial OIDC grant. It is opaque here: openid-client has
      already validated its signature, issuer, audience and nonce. */
  readonly idToken?: string;
}

export interface XeroInitialTokenSet extends XeroTokenSet {
  readonly subject: string;
  readonly idToken: string;
}

declare const xeroConnectionIdBrand: unique symbol;
export type XeroConnectionId = string & {
  readonly [xeroConnectionIdBrand]: true;
};

export interface XeroConnection {
  readonly connectionId: XeroConnectionId;
  readonly authEventId: string | null;
  readonly tenantId: string;
  readonly tenantType: string;
  readonly tenantName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface XeroOrganisation {
  readonly organisationId: string;
  readonly name: string;
  readonly countryCode: string;
  readonly baseCurrency: string;
  readonly isDemoCompany: boolean;
  readonly status: string;
}

export interface XeroOidcClient {
  beginAuthorization(): Promise<XeroAuthorizationRequest>;
  completeAuthorization(
    callback: XeroAuthorizationCallback,
  ): Promise<XeroInitialTokenSet>;
  refresh(refreshToken: string): Promise<XeroTokenSet>;
  revoke(refreshToken: string): Promise<void>;
  listConnections(accessToken: string): Promise<readonly XeroConnection[]>;
  getOrganisation(
    accessToken: string,
    tenantId: string,
  ): Promise<XeroOrganisation>;
  disconnectConnection(
    accessToken: string,
    connection: Pick<XeroConnection, "connectionId">,
  ): Promise<void>;
}

export type XeroOidcErrorCode =
  | "invalid_configuration"
  | "invalid_oauth_transaction"
  | "invalid_callback_url"
  | "invalid_token_response"
  | "invalid_resource_identifier"
  | "invalid_grant"
  | "xero_request_failed"
  | "xero_request_timed_out"
  | "invalid_xero_response"
  | "xero_response_too_large";

export class XeroOidcError extends Error {
  constructor(
    public readonly code: XeroOidcErrorCode,
    message: string,
    public readonly providerStatus?: number,
  ) {
    super(message);
    this.name = "XeroOidcError";
  }
}

export interface CreateXeroOidcClientOptions {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly callbackUri: string;
  readonly requestTimeoutMs?: number;
}

export interface XeroOidcDependencies {
  readonly openid?: XeroOpenIdRuntime;
  readonly fetch?: Fetch;
}

export async function createXeroOidcClient(
  options: CreateXeroOidcClientOptions,
  dependencies: XeroOidcDependencies = {},
): Promise<XeroOidcClient> {
  const clientId = boundedSecret(
    options.clientId,
    "client ID",
    1,
    512,
    "invalid_configuration",
  );
  const clientSecret = boundedSecret(
    options.clientSecret,
    "client secret",
    1,
    4_096,
    "invalid_configuration",
  );
  const callbackUri = checkedConfiguredCallbackUri(options.callbackUri);
  const requestTimeoutMs = checkedRequestTimeoutMs(options.requestTimeoutMs);

  const runtime = dependencies.openid ?? PANVA_OPENID_RUNTIME;
  const configuration = await runtime.discover(
    clientId,
    clientSecret,
    OIDC_TIMEOUT_SECONDS,
  );
  return new PanvaXeroOidcClient(
    configuration,
    runtime,
    dependencies.fetch ?? globalThis.fetch,
    callbackUri,
    requestTimeoutMs,
  );
}

export class PanvaXeroOidcClient implements XeroOidcClient {
  private readonly callbackUri: string;
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly configuration: openidClient.Configuration,
    private readonly openid: XeroOpenIdRuntime,
    private readonly fetch: Fetch,
    callbackUri: string,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  ) {
    if (typeof fetch !== "function") {
      throw new XeroOidcError(
        "invalid_configuration",
        "A Fetch implementation is required for Xero resource requests",
      );
    }
    this.callbackUri = checkedConfiguredCallbackUri(callbackUri);
    this.requestTimeoutMs = checkedRequestTimeoutMs(requestTimeoutMs);
  }

  async beginAuthorization(): Promise<XeroAuthorizationRequest> {
    const codeVerifier = checkedOAuthValue(
      this.openid.randomCodeVerifier(),
      "PKCE code verifier",
      43,
      128,
    );
    const state = checkedOAuthValue(
      this.openid.randomState(),
      "OAuth state",
      32,
      256,
    );
    const nonce = checkedOAuthValue(
      this.openid.randomNonce(),
      "OpenID nonce",
      32,
      256,
    );
    const codeChallenge = checkedOAuthValue(
      await this.openid.calculateCodeChallenge(codeVerifier),
      "PKCE code challenge",
      43,
      128,
    );

    const url = this.openid.buildAuthorizationUrl(this.configuration, {
      redirect_uri: this.callbackUri,
      scope: XERO_SCOPE,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      nonce,
    });
    assertAuthorizationUrl(url, this.callbackUri, {
      codeChallenge,
      state,
      nonce,
    });

    return {
      authorizationUrl: url.href,
      codeVerifier,
      state,
      nonce,
    };
  }

  async completeAuthorization(
    callback: XeroAuthorizationCallback,
  ): Promise<XeroInitialTokenSet> {
    const callbackUrl = checkedCallbackUrl(
      callback.callbackUrl,
      this.callbackUri,
    );
    const codeVerifier = checkedOAuthValue(
      callback.codeVerifier,
      "PKCE code verifier",
      43,
      128,
    );
    const expectedState = checkedOAuthValue(
      callback.expectedState,
      "expected OAuth state",
      32,
      256,
    );
    const expectedNonce = checkedOAuthValue(
      callback.expectedNonce,
      "expected OpenID nonce",
      32,
      256,
    );

    const response = await this.openid.authorizationCodeGrant(
      this.configuration,
      callbackUrl,
      {
        pkceCodeVerifier: codeVerifier,
        expectedState,
        expectedNonce,
        idTokenExpected: true,
      },
    );
    return parseInitialTokenResponse(response);
  }

  async refresh(refreshToken: string): Promise<XeroTokenSet> {
    const currentRefreshToken = boundedToken(refreshToken, "refresh token");
    let response: OidcTokenResponse;
    try {
      response = await this.openid.refreshTokenGrant(
        this.configuration,
        currentRefreshToken,
      );
    } catch (error) {
      if (
        error instanceof openidClient.ResponseBodyError &&
        error.error === "invalid_grant"
      ) {
        throw new XeroOidcError(
          "invalid_grant",
          "Xero refresh grant is no longer valid; reauthorisation is required",
        );
      }
      throw error;
    }
    return parseTokenResponse(response, {
      fallbackRefreshToken: currentRefreshToken,
      requireIdToken: false,
      requireScope: false,
      requireSubject: false,
    });
  }

  revoke(refreshToken: string): Promise<void> {
    return this.openid.tokenRevocation(
      this.configuration,
      boundedToken(refreshToken, "refresh token"),
      { token_type_hint: "refresh_token" },
    );
  }

  async listConnections(
    accessToken: string,
  ): Promise<readonly XeroConnection[]> {
    return this.resourceRequest(
      CONNECTIONS_URL,
      boundedToken(accessToken, "access token"),
      { method: "GET" },
      async (response) => {
        const body = await parseJsonResponse(
          response,
          MAX_CONNECTIONS_RESPONSE_BYTES,
        );
        if (!Array.isArray(body) || body.length > MAX_CONNECTIONS) {
          throw invalidXeroResponse(
            "Xero connections response must be a bounded array",
          );
        }
        return body.map((value, index) => parseConnection(value, index));
      },
    );
  }

  async getOrganisation(
    accessToken: string,
    tenantId: string,
  ): Promise<XeroOrganisation> {
    const checkedTenantId = checkedUuid(tenantId, "tenant ID");
    return this.resourceRequest(
      ORGANISATION_URL,
      boundedToken(accessToken, "access token"),
      {
        method: "GET",
        headers: { "xero-tenant-id": checkedTenantId },
      },
      async (response) => {
        const body = await parseJsonResponse(
          response,
          MAX_ORGANISATION_RESPONSE_BYTES,
        );
        return parseOrganisation(body, checkedTenantId);
      },
    );
  }

  async disconnectConnection(
    accessToken: string,
    connection: Pick<XeroConnection, "connectionId">,
  ): Promise<void> {
    if (!isRecord(connection)) {
      throw new XeroOidcError(
        "invalid_resource_identifier",
        "A server-returned Xero connection is required",
      );
    }
    const connectionId = checkedUuid(
      connection.connectionId,
      "connection ID",
    );
    await this.resourceRequest(
      `${CONNECTIONS_URL}/${connectionId}`,
      boundedToken(accessToken, "access token"),
      { method: "DELETE" },
      async (response) => {
        const body = await readBoundedText(response, 1_024);
        if (body.trim() !== "") {
          throw invalidXeroResponse(
            "Xero disconnect response must have an empty body",
          );
        }
      },
    );
  }

  private async resourceRequest<Result>(
    url: string,
    accessToken: string,
    init: Pick<RequestInit, "method" | "headers">,
    consume: (response: Response) => Promise<Result>,
  ): Promise<Result> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const headers = new Headers(init.headers);
      headers.set("Accept", "application/json");
      headers.set("Authorization", `Bearer ${accessToken}`);
      const response = await this.fetch(url, {
        method: init.method,
        headers,
        redirect: "error",
        signal: controller.signal,
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new XeroOidcError(
          "xero_request_failed",
          `Xero request failed with HTTP ${response.status}`,
          response.status,
        );
      }
      return await consume(response);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new XeroOidcError(
          "xero_request_timed_out",
          "Xero request timed out",
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function assertAuthorizationUrl(
  url: URL,
  callbackUri: string,
  expected: { codeChallenge: string; state: string; nonce: string },
): void {
  const expectedEndpoint = new URL(AUTHORIZATION_URL);
  if (
    !(url instanceof URL) ||
    url.origin !== expectedEndpoint.origin ||
    url.pathname !== expectedEndpoint.pathname ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== ""
  ) {
    throw new XeroOidcError(
      "invalid_oauth_transaction",
      "Xero authorization endpoint is not the fixed Xero login door",
    );
  }
  const required = {
    response_type: "code",
    redirect_uri: callbackUri,
    scope: XERO_SCOPE,
    code_challenge: expected.codeChallenge,
    code_challenge_method: "S256",
    state: expected.state,
    nonce: expected.nonce,
  };
  for (const [name, value] of Object.entries(required)) {
    if (
      url.searchParams.get(name) !== value ||
      url.searchParams.getAll(name).length !== 1
    ) {
      throw new XeroOidcError(
        "invalid_oauth_transaction",
        `Xero authorization URL has an invalid ${name} parameter`,
      );
    }
  }
}

function checkedConfiguredCallbackUri(input: unknown): string {
  if (typeof input !== "string" || input.length < 1 || input.length > 2_048) {
    throw new XeroOidcError(
      "invalid_configuration",
      "Xero callback URI is invalid",
    );
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new XeroOidcError(
      "invalid_configuration",
      "Xero callback URI is invalid",
    );
  }
  const localDevelopment =
    url.protocol === "http:" && url.hostname === "localhost";
  if (
    (url.protocol !== "https:" && !localDevelopment) ||
    url.pathname !== "/v1/accounting/oauth/xero/callback" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new XeroOidcError(
      "invalid_configuration",
      "Xero callback URI must be HTTPS (or localhost) and use the accounting callback path",
    );
  }
  return url.href;
}

function checkedRequestTimeoutMs(input: unknown): number {
  const value = input ?? DEFAULT_REQUEST_TIMEOUT_MS;
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < 1 ||
    (value as number) > 30_000
  ) {
    throw new XeroOidcError(
      "invalid_configuration",
      "Xero request timeout must be an integer from 1 to 30000 milliseconds",
    );
  }
  return value as number;
}

function checkedCallbackUrl(
  input: string | URL,
  configuredCallbackUri: string,
): URL {
  let url: URL;
  try {
    url = new URL(input instanceof URL ? input.href : input);
  } catch {
    throw new XeroOidcError(
      "invalid_callback_url",
      "Xero callback URL is not valid",
    );
  }
  const registered = new URL(configuredCallbackUri);
  if (
    url.protocol !== registered.protocol ||
    url.host !== registered.host ||
    url.pathname !== registered.pathname ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== ""
  ) {
    throw new XeroOidcError(
      "invalid_callback_url",
      "Xero callback URL does not match the registered callback",
    );
  }
  for (const name of ["code", "state", "error", "error_description"]) {
    if (url.searchParams.getAll(name).length > 1) {
      throw new XeroOidcError(
        "invalid_callback_url",
        `Xero callback contains repeated ${name} parameters`,
      );
    }
  }
  return url;
}

function parseTokenResponse(
  value: OidcTokenResponse,
  options: {
    fallbackRefreshToken?: string;
    requireIdToken: boolean;
    requireScope: boolean;
    requireSubject: boolean;
  },
): XeroTokenSet {
  if (!isRecord(value)) {
    throw invalidTokenResponse("Xero token response must be an object");
  }
  const accessToken = responseToken(value.access_token, "access token");
  const refreshToken =
    value.refresh_token === undefined
      ? options.fallbackRefreshToken
      : responseToken(value.refresh_token, "refresh token");
  if (!refreshToken) {
    throw invalidTokenResponse("Xero token response has no refresh token");
  }
  if (
    typeof value.token_type !== "string" ||
    value.token_type.toLowerCase() !== "bearer"
  ) {
    throw invalidTokenResponse("Xero token type must be bearer");
  }
  if (
    !Number.isSafeInteger(value.expires_in) ||
    (value.expires_in as number) < 1 ||
    (value.expires_in as number) > 86_400
  ) {
    throw invalidTokenResponse("Xero token lifetime is invalid");
  }
  if (value.scope === undefined && options.requireScope) {
    throw invalidTokenResponse("Xero token response has no granted scope");
  }
  if (value.scope !== undefined) assertExactScope(value.scope);

  let idToken: string | undefined;
  if (value.id_token !== undefined) {
    idToken = responseToken(value.id_token, "ID token", 65_536);
  } else if (options.requireIdToken) {
    throw invalidTokenResponse("Xero OIDC response has no ID token");
  }

  let subject: string | undefined;
  if (typeof value.claims !== "function") {
    throw invalidTokenResponse(
      "Xero token response is missing openid-client claim helpers",
    );
  }
  const claims = value.claims();
  if (claims?.sub !== undefined) {
    subject = boundedResponseString(
      claims.sub,
      "OpenID subject",
      1,
      512,
    );
  } else if (options.requireSubject) {
    throw invalidTokenResponse("Xero OIDC response has no validated subject");
  }
  return {
    accessToken,
    refreshToken,
    expiresInSeconds: value.expires_in as number,
    scope: XERO_SCOPE,
    ...(idToken ? { idToken } : {}),
    ...(subject ? { subject } : {}),
  };
}

function parseInitialTokenResponse(
  value: OidcTokenResponse,
): XeroInitialTokenSet {
  const tokens = parseTokenResponse(value, {
    requireIdToken: true,
    requireScope: true,
    requireSubject: true,
  });
  if (!tokens.idToken || !tokens.subject) {
    // The shared parser enforces both. Keep the narrowing local so callers of
    // the initial grant receive a type that reflects that stronger contract.
    throw invalidTokenResponse(
      "Xero initial token response is missing its OpenID identity",
    );
  }
  return { ...tokens, idToken: tokens.idToken, subject: tokens.subject };
}

function assertExactScope(value: unknown): void {
  if (typeof value !== "string" || value.length > 256) {
    throw invalidTokenResponse("Xero granted scope is invalid");
  }
  const parts = value.split(" ");
  const expected = XERO_SCOPE.split(" ");
  if (
    parts.length !== expected.length ||
    new Set(parts).size !== expected.length ||
    expected.some((scope) => !parts.includes(scope))
  ) {
    throw invalidTokenResponse("Xero granted scopes exceed or omit the requested scopes");
  }
}

async function parseJsonResponse(
  response: Response,
  maximumBytes: number,
): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/iu.test(contentType)) {
    throw invalidXeroResponse("Xero response content type must be application/json");
  }
  const text = await readBoundedText(response, maximumBytes);
  try {
    assertNoDuplicateJsonKeys(text);
    return JSON.parse(text) as unknown;
  } catch {
    throw invalidXeroResponse("Xero returned malformed or ambiguous JSON");
  }
}

async function readBoundedText(
  response: Response,
  maximumBytes: number,
): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > maximumBytes) {
      throw new XeroOidcError(
        "xero_response_too_large",
        "Xero response exceeds the allowed size",
      );
    }
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel().catch(() => undefined);
      throw new XeroOidcError(
        "xero_response_too_large",
        "Xero response exceeds the allowed size",
      );
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw invalidXeroResponse("Xero response is not valid UTF-8");
  }
}

function parseConnection(value: unknown, index: number): XeroConnection {
  if (!isRecord(value)) {
    throw invalidXeroResponse(`Xero connection ${index} must be an object`);
  }
  return {
    connectionId: checkedResponseUuid(value.id, `connection ${index} ID`) as XeroConnectionId,
    authEventId:
      value.authEventId === undefined
        ? null
        : checkedResponseUuid(
            value.authEventId,
            `connection ${index} auth event ID`,
          ),
    tenantId: checkedResponseUuid(value.tenantId, `connection ${index} tenant ID`),
    tenantType: boundedResponseString(
      value.tenantType,
      `connection ${index} tenant type`,
      1,
      64,
      /^[A-Z][A-Z0-9_]*$/u,
    ),
    tenantName: boundedResponseString(
      value.tenantName,
      `connection ${index} tenant name`,
      1,
      512,
    ),
    createdAt: checkedTimestamp(value.createdDateUtc, `connection ${index} creation time`),
    updatedAt: checkedTimestamp(value.updatedDateUtc, `connection ${index} update time`),
  };
}

function parseOrganisation(value: unknown, tenantId: string): XeroOrganisation {
  if (!isRecord(value) || !Array.isArray(value.Organisations)) {
    throw invalidXeroResponse("Xero organisation response has an invalid envelope");
  }
  if (value.Organisations.length !== 1) {
    throw invalidXeroResponse("Xero organisation response must contain exactly one organisation");
  }
  const organisation = value.Organisations[0];
  if (!isRecord(organisation)) {
    throw invalidXeroResponse("Xero organisation must be an object");
  }
  const organisationId = checkedResponseUuid(
    organisation.OrganisationID,
    "organisation ID",
  );
  if (organisationId.toLowerCase() !== tenantId.toLowerCase()) {
    throw invalidXeroResponse("Xero organisation does not match the requested tenant");
  }
  if (typeof organisation.IsDemoCompany !== "boolean") {
    throw invalidXeroResponse("Xero organisation demo flag is invalid");
  }
  return {
    organisationId,
    name: boundedResponseString(organisation.Name, "organisation name", 1, 512),
    countryCode: boundedResponseString(
      organisation.CountryCode,
      "organisation country code",
      2,
      2,
      /^[A-Z]{2}$/u,
    ),
    baseCurrency: boundedResponseString(
      organisation.BaseCurrency,
      "organisation base currency",
      3,
      3,
      /^[A-Z]{3}$/u,
    ),
    isDemoCompany: organisation.IsDemoCompany,
    status: boundedResponseString(
      organisation.OrganisationStatus,
      "organisation status",
      1,
      32,
      /^[A-Z][A-Z0-9_-]*$/u,
    ),
  };
}

function boundedSecret(
  value: unknown,
  name: string,
  minimum: number,
  maximum: number,
  code: XeroOidcErrorCode,
): string {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    value.length > maximum ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new XeroOidcError(code, `Xero ${name} is invalid`);
  }
  return value;
}

function boundedToken(value: unknown, name: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 65_536 ||
    /[\u0000-\u0020\u007f]/u.test(value)
  ) {
    throw new XeroOidcError(
      "invalid_resource_identifier",
      `Xero ${name} is invalid`,
    );
  }
  return value;
}

function responseToken(value: unknown, name: string, maximum = 65_536): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximum ||
    /[\u0000-\u0020\u007f]/u.test(value)
  ) {
    throw invalidTokenResponse(`Xero ${name} is invalid`);
  }
  return value;
}

function checkedOAuthValue(
  value: unknown,
  name: string,
  minimum: number,
  maximum: number,
): string {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    value.length > maximum ||
    !OAUTH_VALUE.test(value)
  ) {
    throw new XeroOidcError(
      "invalid_oauth_transaction",
      `Xero ${name} is invalid`,
    );
  }
  return value;
}

function checkedUuid(value: unknown, name: string): string {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new XeroOidcError(
      "invalid_resource_identifier",
      `Xero ${name} is invalid`,
    );
  }
  return value.toLowerCase();
}

function checkedResponseUuid(value: unknown, name: string): string {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw invalidXeroResponse(`Xero ${name} is invalid`);
  }
  return value.toLowerCase();
}

function boundedResponseString(
  value: unknown,
  name: string,
  minimum: number,
  maximum: number,
  pattern?: RegExp,
): string {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    value.length > maximum ||
    /[\u0000-\u001f\u007f]/u.test(value) ||
    (pattern && !pattern.test(value))
  ) {
    throw invalidXeroResponse(`Xero ${name} is invalid`);
  }
  return value;
}

function checkedTimestamp(value: unknown, name: string): string {
  const timestamp = boundedResponseString(value, name, 19, 40);
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-](\d{2}):(\d{2}))?$/u.exec(
      timestamp,
    );
  if (!match) {
    throw invalidXeroResponse(`Xero ${name} is invalid`);
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText,
    offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];
  if (
    year < 1 ||
    !daysInMonth ||
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    throw invalidXeroResponse(`Xero ${name} is invalid`);
  }
  return timestamp;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalidTokenResponse(message: string): XeroOidcError {
  return new XeroOidcError("invalid_token_response", message);
}

function invalidXeroResponse(message: string): XeroOidcError {
  return new XeroOidcError("invalid_xero_response", message);
}
