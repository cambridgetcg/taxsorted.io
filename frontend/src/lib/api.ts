// The typed client for the taxsorted api — the same surface an agent would call.

import { collectFraudPreventionHeaders, headersToRecord } from "@taxsorted/engine/uk/hmrc";
import type { VATObligationsResponse, VATReturnData } from "@taxsorted/engine/uk/vat";
import type { SourceType } from "@taxsorted/engine/uk/itsa";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/browser";

export function apiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:8787";
  }
  return "https://api.taxsorted.io";
}

export interface ApiEntity {
  id: string;
  name: string;
  kind: "person" | "business" | "charity" | "trust";
  vrn: string | null;
  /** National Insurance number — ITSA identifies a taxpayer by NINO, not VRN. */
  nino?: string | null;
  created_at: string;
  /** Legacy: any rail connected. The VAT cockpit still reads this — kept
      byte-identical for it. New readers should use `connections`. */
  connected: boolean;
  /** Per-rail connection state — a VAT-only connection must never read as
      "connected" on the ITSA panel, and vice versa. */
  connections: { vat: boolean; itsa: boolean };
  hmrc_env?: string | null;
}

/** Which HMRC scope a connection asks for — additive to the VAT-only surface. */
export type Rail = "vat" | "itsa";

/** SA Individual Details v2.0, passed through — HMRC's own status vocabulary. */
export interface ItsaStatusResponse {
  taxYear: string;
  status: string | null;
  source: "hmrc-sandbox";
}

export interface ItsaObligation {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: "open" | "fulfilled";
}

export interface ItsaObligationsResponse {
  obligations: ItsaObligation[];
  source: "hmrc-sandbox";
}

/** Business Details API v2.0's list-businesses, mapped by the api. */
export interface ItsaBusiness {
  businessId: string;
  typeOfBusiness: SourceType;
  tradingName?: string;
}

/** The immutable (but resubmittable) record of one cumulative quarterly
    update PUT to HMRC's sandbox — `supersededCount` counts resubmissions of
    the SAME quarter (the MTD correction model), never a new row per send. */
export interface ItsaReceipt {
  id: string;
  taxYear: string;
  quarterIndex: 1 | 2 | 3 | 4;
  periodEnd: string;
  businessId: string;
  typeOfBusiness: SourceType;
  submittedAt: string;
  supersededCount: number;
  hmrcCorrelationId?: string | null;
}

/** `totals` is PENCE, keyed by the same wire category names cumulativeUpdate
    returns — the api converts to HMRC's decimal pounds exactly once, at the
    boundary; this client never does that conversion itself. */
export interface ItsaQuarterlyUpdateInput {
  taxYear: string;
  businessId: string;
  typeOfBusiness: SourceType;
  quarterIndex: 1 | 2 | 3 | 4;
  election: "standard" | "calendar";
  totals: Record<string, number>;
}

/** Individual Calculations v8.0, mapped down to the two figures M2 shows.
    Both money fields are HMRC's own DECIMAL POUNDS — never pence, never
    divide by 100 (see lib/format.ts's gbpFromPounds). A 404 while HMRC is
    still computing is surfaced by the api as `status: 'computing'`, not an
    error — the same honest distinction the api route itself makes. */
export type ItsaCalculation =
  | { status: "computing"; source: "hmrc-sandbox" }
  | {
      status: "complete";
      incomeTaxAndNicsDuePounds: number | null;
      taxableIncomePounds: number | null;
      source: "hmrc-sandbox";
    };

export interface ApiSubmission {
  id: string;
  period_key: string;
  hmrc_env: string;
  receipt: {
    processingDate?: string;
    formBundleNumber?: string;
    paymentIndicator?: string;
    chargeRefNumber?: string;
  };
  submitted_at: string;
}

export interface RailStatus {
  configured: boolean;
  env: "sandbox" | "production";
}

// ---- Account doors (M2) — plan's "## Endpoints", shapes verbatim ---------
// Ceremony option/response JSON (ArrayBuffers already base64url-encoded) come
// from @simplewebauthn/browser's own types, imported above — never
// redeclared here, so a library bump can't silently drift out of sync.

export interface AccountPasskey {
  id: string;
  nickname: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface AccountSummary {
  id: string;
  name: string;
  createdAt?: string;
}

/** GET /v1/account — anonymous OK. `mfa` is false on a recovery session (an
    account is visible, just not MFA-asserted); `claimableEntities` counts
    only this browser's still-anonymous entities. */
export type GetAccountResponse =
  | { signedIn: false }
  | {
      signedIn: true;
      account: AccountSummary;
      mfa: boolean;
      passkeys: AccountPasskey[];
      recoveryCodesLeft: number;
      claimableEntities: number;
    };

/** POST /passkey/register/finish's three moods, keyed off which fields ride
    along — new-account carries `adoptedEntities` + `recoveryCodes`;
    add-passkey/recovery-upgrade carry `passkey` (recovery-upgrade adds
    `mfa:true`, since the ceremony itself is a fresh UV assertion). */
export type RegisterFinishResponse =
  | { signedIn: true; account: AccountSummary; adoptedEntities: number; recoveryCodes: string[] }
  | { signedIn: true; passkey: { id: string; nickname: string | null } }
  | { signedIn: true; passkey: { id: string; nickname: string | null }; mfa: true };

/** POST /login/finish — never adopts; anonymous entities merely follow the
    rotated session, still claimable via the explicit adopt door. */
export interface LoginFinishResponse {
  signedIn: true;
  account: AccountSummary;
  claimableEntities: number;
}

export interface AdoptResponse {
  adopted: number;
}

/** POST /recover — success always lands a RESTRICTED session: `mfa:false`,
    `addPasskeyNow:true` is the UI's cue to walk straight into a register
    ceremony (the only way back to a full session from here). */
export interface RecoverResponse {
  signedIn: true;
  mfa: false;
  addPasskeyNow: true;
  recoveryCodesLeft: number;
}

export interface LogoutResponse {
  signedOut: "this-browser" | "everywhere";
}

export interface DeletePasskeyResponse {
  ok: true;
  sessionsSignedOut: number;
}

export interface RegenerateCodesResponse {
  recoveryCodes: string[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public detail?: unknown
  ) {
    super(message);
  }
}

/**
 * Thrown instead of the plain ApiError when the api answers 401 `signed_out`
 * — a door that needs a signed-in session was reached (the api IS reachable)
 * but this session isn't signed in. `instanceof SignedOutError` lets a
 * caller tell "not signed in" apart from every other reachable-but-refused
 * answer (still `instanceof ApiError`, so existing generic checks are
 * untouched) and from a raw network/api-unreachable failure (fetch itself
 * throws below and is never wrapped into an ApiError at all). Deliberately
 * NOT wired to any global redirect here — anonymous tools (VAT/ITSA panels,
 * sandbox connect) call doors that never require a session, and must keep
 * working exactly as before; each caller that touches a signed-in-only door
 * decides what "not signed in" means for it.
 */
export class SignedOutError extends ApiError {
  constructor(message: string, detail?: unknown) {
    super(401, "signed_out", message, detail);
  }
}

async function call<T>(path: string, init?: RequestInit & { fraud?: boolean }): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers as Record<string, string>),
  };
  // The browser tells the api what only it can see; the api asserts the
  // rest. Exact set the WEB_APP_VIA_SERVER spec names as browser-observable
  // (regs/research/fraud-headers.md §1) — mirrors api/src/fraud.ts's
  // CLIENT_ALLOWLIST byte-for-byte. Gov-Client-Browser-Plugins and
  // Gov-Client-Browser-Do-Not-Track are never collected upstream (dropped
  // from the required list, research lines 76-82), so an explicit allowlist
  // here — rather than a "Gov-Client-Browser*" prefix match — is the belt to
  // that suspenders: a future browser-collected field can't silently start
  // piggybacking to the api without a deliberate change on both sides.
  const CLIENT_PIGGYBACK_KEYS = [
    "Gov-Client-Timezone",
    "Gov-Client-Screens",
    "Gov-Client-Window-Size",
    "Gov-Client-Browser-JS-User-Agent",
  ] as const;
  if (init?.fraud) {
    const collected = headersToRecord(collectFraudPreventionHeaders());
    for (const k of CLIENT_PIGGYBACK_KEYS) {
      if (collected[k]) headers[k] = collected[k];
    }
  }
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const b = body as { error?: string; message?: string; detail?: unknown };
    const message = b.message || `Request failed (${res.status})`;
    if (b.error === "signed_out") {
      throw new SignedOutError(message, b.detail);
    }
    throw new ApiError(res.status, b.error || `http_${res.status}`, message, b.detail);
  }
  return body as T;
}

export const api = {
  health: () => call<{ ok: boolean; hmrc: RailStatus }>("/v1/health"),
  railStatus: () => call<RailStatus>("/v1/hmrc/status"),

  listEntities: () => call<{ entities: ApiEntity[] }>("/v1/entities"),
  getEntity: (id: string) => call<{ entity: ApiEntity }>(`/v1/entities/${id}`),
  createEntity: (input: { name: string; kind: ApiEntity["kind"]; vrn?: string; nino?: string }) =>
    call<{ entity: ApiEntity }>("/v1/entities", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  setVrn: (id: string, vrn: string) =>
    call<{ entity: ApiEntity }>(`/v1/entities/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ vrn }),
    }),

  /** Mirrors setVrn — ITSA's precondition for connecting is a NINO, not a VRN. */
  setNino: (id: string, nino: string) =>
    call<{ entity: ApiEntity }>(`/v1/entities/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ nino }),
    }),

  disconnect: (id: string) =>
    call<{ disconnected: true }>(`/v1/hmrc/connection/${id}`, { method: "DELETE" }),

  obligations: (id: string, params?: { from?: string; to?: string; status?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][]
    ).toString();
    return call<VATObligationsResponse>(
      `/v1/entities/${id}/obligations${qs ? `?${qs}` : ""}`,
      { fraud: true }
    );
  },

  submissions: (id: string) => call<{ submissions: ApiSubmission[] }>(`/v1/entities/${id}/submissions`),

  /** SA Individual Details v2.0 — sandbox-only rail. */
  itsaStatus: (id: string, taxYear: string) =>
    call<ItsaStatusResponse>(`/v1/itsa/${id}/status?taxYear=${encodeURIComponent(taxYear)}`, {
      fraud: true,
    }),

  /** Obligations v3.0 income-and-expenditure — sandbox-only rail. */
  itsaObligations: (id: string) =>
    call<ItsaObligationsResponse>(`/v1/itsa/${id}/obligations`, { fraud: true }),

  /** Business Details API v2.0 list-businesses — which self-employment/
      property businesses this NINO can submit quarterly updates for. */
  businesses: (id: string) =>
    call<{ businesses: ItsaBusiness[] }>(`/v1/itsa/${id}/businesses`, { fraud: true }),

  /** The write path: category totals (pence) -> HMRC's cumulative period
      summary PUT -> an immutable-but-resubmittable receipt. */
  submitQuarterlyUpdate: (id: string, input: ItsaQuarterlyUpdateInput) =>
    call<{ receipt: ItsaReceipt }>(`/v1/itsa/${id}/quarterly-update`, {
      method: "POST",
      body: JSON.stringify(input),
      fraud: true,
    }),

  /** Newest first — the receipt list survives a reload (server-side). */
  receipts: (id: string) =>
    call<{ receipts: ItsaReceipt[] }>(`/v1/itsa/${id}/receipts`, { fraud: true }),

  /** Individual Calculations v8.0 trigger — always the in-year type (never a
      final declaration). Returns HMRC's calculationId for getCalc to poll. */
  triggerCalc: (id: string, taxYear: string) =>
    call<{ calculationId: string | null }>(`/v1/itsa/${id}/calculation`, {
      method: "POST",
      body: JSON.stringify({ taxYear }),
      fraud: true,
    }),

  /** Individual Calculations v8.0 retrieve. May answer `{status:'computing'}`
      while HMRC works it out — callers poll, they never treat that as an
      error. */
  getCalc: (id: string, calculationId: string, taxYear: string) =>
    call<ItsaCalculation>(
      `/v1/itsa/${id}/calculation/${calculationId}?taxYear=${encodeURIComponent(taxYear)}`,
      { fraud: true }
    ),

  fileReturn: (id: string, data: VATReturnData) =>
    call<{ filed: true; submission: ApiSubmission }>(`/v1/entities/${id}/returns`, {
      method: "POST",
      body: JSON.stringify(data),
      fraud: true,
    }),

  /**
   * Full-page redirect into the HMRC OAuth dance. Defaults to the VAT rail
   * so every existing caller is byte-identical; pass "itsa" to request
   * read:self-assessment instead (?rail=itsa, additive query param).
   */
  connectUrl: (id: string, rail: Rail = "vat") =>
    rail === "itsa"
      ? `${apiBase()}/v1/hmrc/start/${id}?rail=itsa`
      : `${apiBase()}/v1/hmrc/start/${id}`,

  // ---- Account doors (M2) — the ten doors under /v1/account, in the plan's
  // numbered order. ----

  /** Anonymous OK — the one door that answers strangers instead of turning
      them away. */
  getAccount: () => call<GetAccountResponse>("/v1/account"),

  registerStart: (input?: { name?: string }) =>
    call<PublicKeyCredentialCreationOptionsJSON>("/v1/account/passkey/register/start", {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    }),

  registerFinish: (input: { response: RegistrationResponseJSON; nickname?: string }) =>
    call<RegisterFinishResponse>("/v1/account/passkey/register/finish", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** Usernameless — no credential ids go up; the authenticator's own picker
      decides which resident passkey answers. */
  loginStart: () =>
    call<PublicKeyCredentialRequestOptionsJSON>("/v1/account/login/start", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  loginFinish: (input: { response: AuthenticationResponseJSON }) =>
    call<LoginFinishResponse>("/v1/account/login/finish", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** [passkey]. Claims this browser's still-anonymous entities into the
      account — idempotent, no body. */
  adopt: () => call<AdoptResponse>("/v1/account/adopt", { method: "POST" }),

  /** Redeems one single-use recovery code; normalising (spaces/dashes/case)
      happens server-side, so the raw input travels as typed. */
  recover: (code: string) =>
    call<RecoverResponse>("/v1/account/recover", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  /** [signed-in], recovery included. Idempotent both flavours — a repeat
      call on an already-signed-out session still answers 200. */
  logout: (input?: { everywhere?: boolean }) =>
    call<LogoutResponse>("/v1/account/logout", {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    }),

  /** [passkey]. Same 404 whether the credential is unknown or belongs to
      someone else's account — the api never lets a caller enumerate. */
  deletePasskey: (credentialId: string) =>
    call<DeletePasskeyResponse>(`/v1/account/passkey/${encodeURIComponent(credentialId)}`, {
      method: "DELETE",
    }),

  /** [passkey]. Regenerate: every unused code is discarded, ten fresh ones
      take their place — no body. */
  regenerateCodes: () =>
    call<RegenerateCodesResponse>("/v1/account/recovery-codes", { method: "POST" }),
};
