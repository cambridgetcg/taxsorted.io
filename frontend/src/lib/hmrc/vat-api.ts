// HMRC VAT MTD API Service
// Handles all VAT-related API calls to HMRC

import { buildVATUrl, getHMRCConfig } from "./config";
import { collectFraudPreventionHeaders, headersToRecord } from "./fraud-headers";
import type {
  VATObligationsResponse,
  VATReturnData,
  VATReturnResponse,
  VATLiabilitiesResponse,
  VATPaymentsResponse,
  VATPenaltySummary,
  HMRCAPIError,
} from "@/types/vat";

// ============================================================================
// Types
// ============================================================================

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: HMRCAPIError;
}

interface VATAPIOptions {
  accessToken: string;
  userId?: string;
  testScenario?: string; // For sandbox testing
}

// ============================================================================
// Base API Client
// ============================================================================

async function hmrcRequest<T>(
  url: string,
  options: VATAPIOptions,
  init?: RequestInit
): Promise<APIResponse<T>> {
  const config = getHMRCConfig();
  const fraudHeaders = collectFraudPreventionHeaders(options.userId);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.accessToken}`,
    Accept: "application/vnd.hmrc.1.0+json",
    "Content-Type": "application/json",
    ...headersToRecord(fraudHeaders),
    ...(init?.headers as Record<string, string>),
  };

  // Add test scenario header for sandbox
  if (!config.isProduction && options.testScenario) {
    headers["Gov-Test-Scenario"] = options.testScenario;
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: errorData.code || `HTTP_${response.status}`,
          message: errorData.message || response.statusText,
        },
      };
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Network request failed",
      },
    };
  }
}

// ============================================================================
// VAT Obligations
// ============================================================================

export interface GetObligationsParams {
  vrn: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  status?: "O" | "F"; // Open or Fulfilled
}

export async function getVATObligations(
  params: GetObligationsParams,
  options: VATAPIOptions
): Promise<APIResponse<VATObligationsResponse>> {
  const url = new URL(buildVATUrl("obligations", { vrn: params.vrn }));
  url.searchParams.set("from", params.from);
  url.searchParams.set("to", params.to);
  if (params.status) {
    url.searchParams.set("status", params.status);
  }

  return hmrcRequest<VATObligationsResponse>(url.toString(), options);
}

// ============================================================================
// Submit VAT Return
// ============================================================================

export async function submitVATReturn(
  vrn: string,
  returnData: VATReturnData,
  options: VATAPIOptions
): Promise<APIResponse<VATReturnResponse>> {
  const url = buildVATUrl("submitReturn", { vrn });

  return hmrcRequest<VATReturnResponse>(url, options, {
    method: "POST",
    body: JSON.stringify(returnData),
  });
}

// ============================================================================
// View VAT Return
// ============================================================================

export async function getVATReturn(
  vrn: string,
  periodKey: string,
  options: VATAPIOptions
): Promise<APIResponse<VATReturnData>> {
  const url = buildVATUrl("viewReturn", { vrn, periodKey });
  return hmrcRequest<VATReturnData>(url, options);
}

// ============================================================================
// VAT Liabilities
// ============================================================================

export interface GetLiabilitiesParams {
  vrn: string;
  from: string;
  to: string;
}

export async function getVATLiabilities(
  params: GetLiabilitiesParams,
  options: VATAPIOptions
): Promise<APIResponse<VATLiabilitiesResponse>> {
  const url = new URL(buildVATUrl("liabilities", { vrn: params.vrn }));
  url.searchParams.set("from", params.from);
  url.searchParams.set("to", params.to);

  return hmrcRequest<VATLiabilitiesResponse>(url.toString(), options);
}

// ============================================================================
// VAT Payments
// ============================================================================

export interface GetPaymentsParams {
  vrn: string;
  from: string;
  to: string;
}

export async function getVATPayments(
  params: GetPaymentsParams,
  options: VATAPIOptions
): Promise<APIResponse<VATPaymentsResponse>> {
  const url = new URL(buildVATUrl("payments", { vrn: params.vrn }));
  url.searchParams.set("from", params.from);
  url.searchParams.set("to", params.to);

  return hmrcRequest<VATPaymentsResponse>(url.toString(), options);
}

// ============================================================================
// VAT Penalties
// ============================================================================

export async function getVATPenalties(
  vrn: string,
  options: VATAPIOptions
): Promise<APIResponse<VATPenaltySummary>> {
  const url = buildVATUrl("penalties", { vrn });
  return hmrcRequest<VATPenaltySummary>(url, options);
}

// ============================================================================
// Utility: Calculate VAT Return Totals
// ============================================================================

export function calculateVATReturnTotals(data: Partial<VATReturnData>): {
  totalVatDue: number;
  netVatDue: number;
} {
  const vatDueSales = data.vatDueSales || 0;
  const vatDueAcquisitions = data.vatDueAcquisitions || 0;
  const vatReclaimedCurrPeriod = data.vatReclaimedCurrPeriod || 0;

  const totalVatDue = vatDueSales + vatDueAcquisitions;
  const netVatDue = Math.abs(totalVatDue - vatReclaimedCurrPeriod);

  return { totalVatDue, netVatDue };
}

// ============================================================================
// Utility: Validate VAT Return Data
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}

export function validateVATReturnData(data: VATReturnData): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  // Check required fields
  if (!data.periodKey) {
    errors.push({ field: "periodKey", message: "Period key is required" });
  }

  // Validate monetary amounts (max 2 decimal places, positive)
  const monetaryFields: Array<keyof VATReturnData> = [
    "vatDueSales",
    "vatDueAcquisitions",
    "vatReclaimedCurrPeriod",
  ];

  for (const field of monetaryFields) {
    const value = data[field] as number;
    if (typeof value !== "number" || isNaN(value)) {
      errors.push({ field, message: `${field} must be a valid number` });
    } else if (value < 0) {
      errors.push({ field, message: `${field} cannot be negative` });
    } else if (!Number.isFinite(value)) {
      errors.push({ field, message: `${field} must be a finite number` });
    }
  }

  // Validate whole number fields (Boxes 6-9)
  const wholeNumberFields: Array<keyof VATReturnData> = [
    "totalValueSalesExVAT",
    "totalValuePurchasesExVAT",
    "totalValueGoodsSuppliedExVAT",
    "totalAcquisitionsExVAT",
  ];

  for (const field of wholeNumberFields) {
    const value = data[field] as number;
    if (typeof value !== "number" || isNaN(value)) {
      errors.push({ field, message: `${field} must be a valid number` });
    } else if (!Number.isInteger(value)) {
      errors.push({ field, message: `${field} must be a whole number` });
    } else if (value < 0) {
      errors.push({ field, message: `${field} cannot be negative` });
    }
  }

  // Validate calculation (Box 3 = Box 1 + Box 2)
  const expectedTotalVatDue = (data.vatDueSales || 0) + (data.vatDueAcquisitions || 0);
  if (Math.abs(data.totalVatDue - expectedTotalVatDue) > 0.01) {
    errors.push({
      field: "totalVatDue",
      message: "Total VAT due must equal VAT on sales plus VAT on acquisitions",
    });
  }

  // Validate netVatDue (Box 5 = |Box 3 - Box 4|)
  const expectedNetVatDue = Math.abs(data.totalVatDue - (data.vatReclaimedCurrPeriod || 0));
  if (Math.abs(data.netVatDue - expectedNetVatDue) > 0.01) {
    errors.push({
      field: "netVatDue",
      message: "Net VAT must equal the absolute difference between total VAT and VAT reclaimed",
    });
  }

  // Finalised must be true for submission
  if (!data.finalised) {
    errors.push({
      field: "finalised",
      message: "You must confirm the return is finalised before submission",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
