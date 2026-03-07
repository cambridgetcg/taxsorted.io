// HMRC Fraud Prevention Headers
// Required by law for MTD VAT API calls

import { getHMRCConfig } from "./config";
import type { FraudPreventionHeaders } from "@/types/vat";

// Connection methods
export type ConnectionMethod =
  | "WEB_APP_VIA_SERVER"
  | "DESKTOP_APP_DIRECT"
  | "MOBILE_APP_DIRECT"
  | "BATCH_PROCESS_DIRECT";

// Device ID storage key
const DEVICE_ID_KEY = "taxsorted_device_id";

/**
 * Get or create a persistent device ID
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") {
    return "server-generated";
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get browser plugins list
 */
function getBrowserPlugins(): string {
  if (typeof navigator === "undefined" || !navigator.plugins) {
    return "";
  }

  const plugins: string[] = [];
  for (let i = 0; i < navigator.plugins.length && i < 10; i++) {
    plugins.push(navigator.plugins[i].name);
  }
  return plugins.join(",");
}

/**
 * Get screen information
 */
function getScreenInfo(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return [
    `width=${screen.width}`,
    `height=${screen.height}`,
    `scaling-factor=${window.devicePixelRatio}`,
    `colour-depth=${screen.colorDepth}`,
  ].join("&");
}

/**
 * Get window size
 */
function getWindowSize(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return `width=${window.innerWidth}&height=${window.innerHeight}`;
}

/**
 * Get timezone in HMRC format
 */
function getTimezone(): string {
  const offset = new Date().getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset <= 0 ? "+" : "-";

  return `UTC${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Get Do Not Track setting
 */
function getDoNotTrack(): string {
  if (typeof navigator === "undefined") {
    return "false";
  }

  return navigator.doNotTrack === "1" ? "true" : "false";
}

/**
 * Collect fraud prevention headers for browser-based requests
 */
export function collectFraudPreventionHeaders(
  userId?: string,
  connectionMethod: ConnectionMethod = "WEB_APP_VIA_SERVER"
): FraudPreventionHeaders {
  const config = getHMRCConfig();

  const headers: FraudPreventionHeaders = {
    "Gov-Client-Connection-Method": connectionMethod,
    "Gov-Client-Device-ID": getDeviceId(),
    "Gov-Client-User-IDs": userId ? `taxsorted=${encodeURIComponent(userId)}` : "",
    "Gov-Client-Timezone": getTimezone(),
    "Gov-Vendor-Version": `${config.vendor.name}=${config.vendor.version}`,
    "Gov-Vendor-Product-Name": config.vendor.name,
  };

  // Browser-specific headers (only available in browser environment)
  if (typeof window !== "undefined") {
    headers["Gov-Client-Screens"] = getScreenInfo();
    headers["Gov-Client-Window-Size"] = getWindowSize();
    headers["Gov-Client-Browser-JS-User-Agent"] = encodeURIComponent(navigator.userAgent);
    headers["Gov-Client-Browser-Plugins"] = encodeURIComponent(getBrowserPlugins());
    headers["Gov-Client-Browser-Do-Not-Track"] = getDoNotTrack();
  }

  return headers;
}

/**
 * Convert headers object to HTTP headers format
 */
export function headersToRecord(headers: FraudPreventionHeaders): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Validate fraud prevention headers
 * Returns list of missing required headers
 */
export function validateFraudHeaders(headers: Partial<FraudPreventionHeaders>): string[] {
  const required = [
    "Gov-Client-Connection-Method",
    "Gov-Client-Device-ID",
    "Gov-Client-Timezone",
    "Gov-Vendor-Version",
    "Gov-Vendor-Product-Name",
  ];

  return required.filter((key) => !headers[key as keyof FraudPreventionHeaders]);
}
