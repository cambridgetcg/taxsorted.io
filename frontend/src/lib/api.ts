// The typed client for the taxsorted api — the same surface an agent would call.

import { collectFraudPreventionHeaders, headersToRecord } from "@taxsorted/engine/uk/hmrc";
import type { VATObligationsResponse, VATReturnData } from "@taxsorted/engine/uk/vat";

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
  created_at: string;
  connected: boolean;
  hmrc_env?: string | null;
}

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

async function call<T>(path: string, init?: RequestInit & { fraud?: boolean }): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers as Record<string, string>),
  };
  // The browser tells the api what only it can see; the api asserts the rest.
  if (init?.fraud) {
    const collected = headersToRecord(collectFraudPreventionHeaders());
    for (const [k, v] of Object.entries(collected)) {
      if (k.startsWith("Gov-Client-Browser") || k === "Gov-Client-Timezone" ||
          k === "Gov-Client-Screens" || k === "Gov-Client-Window-Size") {
        headers[k] = v;
      }
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
    throw new ApiError(res.status, b.error || `http_${res.status}`, b.message || `Request failed (${res.status})`, b.detail);
  }
  return body as T;
}

export const api = {
  health: () => call<{ ok: boolean; hmrc: RailStatus }>("/v1/health"),
  railStatus: () => call<RailStatus>("/v1/hmrc/status"),

  listEntities: () => call<{ entities: ApiEntity[] }>("/v1/entities"),
  getEntity: (id: string) => call<{ entity: ApiEntity }>(`/v1/entities/${id}`),
  createEntity: (input: { name: string; kind: ApiEntity["kind"]; vrn?: string }) =>
    call<{ entity: ApiEntity }>("/v1/entities", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  setVrn: (id: string, vrn: string) =>
    call<{ entity: ApiEntity }>(`/v1/entities/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ vrn }),
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

  fileReturn: (id: string, data: VATReturnData) =>
    call<{ filed: true; submission: ApiSubmission }>(`/v1/entities/${id}/returns`, {
      method: "POST",
      body: JSON.stringify(data),
      fraud: true,
    }),

  /** Full-page redirect into the HMRC OAuth dance. */
  connectUrl: (id: string) => `${apiBase()}/v1/hmrc/start/${id}`,
};
