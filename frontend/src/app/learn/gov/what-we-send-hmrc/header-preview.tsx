"use client";

// i18n: deferred to M2 — plain English for launch

// The live "preview my values" panel. Built from the SAME collect function
// the real request path uses (frontend/src/lib/api.ts's `call()` piggyback,
// engine/jurisdictions/uk/hmrc/fraud-headers.ts's collectFraudPreventionHeaders())
// — never a re-derived copy. Mounted-gated via useMounted() (the same
// hydration-safe pattern as RoleCard/QuarterCard/EstimateCard) because
// screen/window/timezone/user-agent can only be read client-side; showing
// them during server prerender would either be wrong (Next's static export
// has no real browser) or would mismatch on hydration.
//
// Deliberately shows real values ONLY for the four headers the
// WEB_APP_VIA_SERVER spec names as browser-observable (regs/research/
// fraud-headers.md §1) — the exact CLIENT_PIGGYBACK_KEYS set that
// frontend/src/lib/api.ts actually forwards to our server. Every other
// header (Device-ID, User-IDs, Public-IP, Public-IP-Timestamp, Vendor-*) is
// added by the server from a session cookie, the request's socket, or a Fly
// secret — none of that exists to read from inside this browser-side
// component, so this panel describes those rather than inventing a value
// for them. That split is the whole point of the Global Constraint this
// build follows: an honest omission beats a fabricated number.

import { useMounted } from "@/lib/use-mounted";
import { collectFraudPreventionHeaders, headersToRecord } from "@taxsorted/engine/uk/hmrc";

const PREVIEW_HEADERS = [
  "Gov-Client-Timezone",
  "Gov-Client-Screens",
  "Gov-Client-Window-Size",
  "Gov-Client-Browser-JS-User-Agent",
] as const;

export function HeaderPreview() {
  const mounted = useMounted();
  const collected = mounted ? headersToRecord(collectFraudPreventionHeaders()) : {};

  return (
    <div
      data-testid="hmrc-header-live-preview"
      className="mt-4 overflow-x-auto rounded-2xl border border-line"
    >
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-ink-soft">
          <tr>
            <th scope="col" className="p-3 font-medium">
              Header
            </th>
            <th scope="col" className="p-3 font-medium">
              Your value, right now
            </th>
          </tr>
        </thead>
        <tbody>
          {PREVIEW_HEADERS.map((name) => (
            <tr key={name} data-preview-header={name} className="border-t border-line align-top">
              <td className="p-3 font-mono text-xs text-ink">{name}</td>
              <td className="p-3 font-mono text-xs text-ink-soft break-all">
                {mounted ? collected[name] || "—" : "Reading your browser…"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line bg-accent-soft p-3 text-xs text-ink-soft">
        These four are the only ones your own browser computes — reading straight from{" "}
        <code>window.screen</code>, <code>window.innerWidth/innerHeight</code>,{" "}
        <code>navigator.userAgent</code> and your device&apos;s clock, the same values any
        website could already read. The other twelve headers in the table above are added by
        our server when it actually calls HMRC — a device/session cookie, your IP address as
        our server sees it, and our own vendor details — none of which this page, running in
        your browser, can see or verify. We show you what we can genuinely show you, and
        describe the rest rather than guess at it.
      </p>
    </div>
  );
}
