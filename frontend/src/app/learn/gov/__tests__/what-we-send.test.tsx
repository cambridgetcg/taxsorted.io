// @vitest-environment jsdom

// Fact source for every assertion below: regs/research/fraud-headers.md.
// The live preview calls the SAME collectFraudPreventionHeaders() the api
// client (frontend/src/lib/api.ts) piggybacks onto real requests — its
// device-id lookup touches localStorage even though Device-ID is never
// shown as a preview value here. Node 22's built-in global `localStorage`
// stub throws ("getItem is not a function") in this jsdom + Vitest setup
// (see frontend/src/lib/__tests__/api.test.ts) — a tiny in-memory stand-in
// sidesteps the environment quirk.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import WhatWeSendHmrc from "../what-we-send-hmrc/page";

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
});

describe("what we send to HMRC", () => {
  it("has the h1", () => {
    render(<WhatWeSendHmrc />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/what we send/i);
  });

  it("renders exactly 16 header rows, each with a data-header attribute", () => {
    const { container } = render(<WhatWeSendHmrc />);
    const rows = container.querySelectorAll("[data-header]");
    expect(rows.length).toBe(16);
    const names = Array.from(rows).map((r) => r.getAttribute("data-header"));
    expect(new Set(names).size).toBe(16); // no duplicates
    expect(names).toEqual(
      expect.arrayContaining([
        "Gov-Client-Connection-Method",
        "Gov-Client-Browser-JS-User-Agent",
        "Gov-Client-Device-ID",
        "Gov-Client-Multi-Factor",
        "Gov-Client-Public-IP",
        "Gov-Client-Public-IP-Timestamp",
        "Gov-Client-Public-Port",
        "Gov-Client-Screens",
        "Gov-Client-Timezone",
        "Gov-Client-User-IDs",
        "Gov-Client-Window-Size",
        "Gov-Vendor-Forwarded",
        "Gov-Vendor-License-IDs",
        "Gov-Vendor-Product-Name",
        "Gov-Vendor-Public-IP",
        "Gov-Vendor-Version",
      ])
    );
  });

  it("every row carries a click-to-reveal source citation (the Cited component)", () => {
    const { container } = render(<WhatWeSendHmrc />);
    const rows = container.querySelectorAll("[data-header]");
    rows.forEach((row) => {
      const citeButton = row.querySelector('button[aria-label="Show source for this figure"]');
      expect(citeButton).not.toBeNull();
    });
  });

  it("cites SI 2019/360 with a working legislation.gov.uk link", () => {
    render(<WhatWeSendHmrc />);
    const links = screen.getAllByRole("link", { name: /SI 2019\/360/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", "https://www.legislation.gov.uk/uksi/2019/360/made");
  });

  it("states the legal duty and the £3,000 penalty", () => {
    render(<WhatWeSendHmrc />);
    expect(screen.getByText(/£3,000/)).toBeInTheDocument();
  });

  it("lists the cannot-collect trio honestly, in a dedicated section", () => {
    const { container } = render(<WhatWeSendHmrc />);
    const section = container.querySelector('[data-section="cannot-collect"]');
    expect(section).not.toBeNull();
    const text = section!.textContent ?? "";
    expect(text).toMatch(/Gov-Client-Multi-Factor/);
    expect(text).toMatch(/Gov-Vendor-License-IDs/);
    expect(text).toMatch(/Gov-Client-Public-Port/);
  });

  it("never fabricates — states the missing-data policy plainly", () => {
    render(<WhatWeSendHmrc />);
    expect(
      screen.getByText(/never send a placeholder|never invent|never fabricate/i)
    ).toBeInTheDocument();
  });

  it("cites HMRC's TxM DPIA for retention and sharing", () => {
    render(<WhatWeSendHmrc />);
    expect(screen.getByText(/6 years/i)).toBeInTheDocument();
    expect(screen.getByText(/National Cyber Security Centre/i)).toBeInTheDocument();
  });

  it("states our own Article 6(1)(c) legal-obligation basis and what it removes", () => {
    render(<WhatWeSendHmrc />);
    expect(screen.getByText(/6\(1\)\(c\)/)).toBeInTheDocument();
    expect(screen.getByText(/right to erasure/i)).toBeInTheDocument();
  });

  it("carries the reg 3(4) user-blocking note with the honest scrutiny caveat", () => {
    render(<WhatWeSendHmrc />);
    expect(screen.getByText(/blocked the collection/i)).toBeInTheDocument();
    expect(screen.getByText(/less to go on|scrutinise/i)).toBeInTheDocument();
  });

  it("renders the live preview post-mount with real screen/timezone values, scoped so it can't collide with the descriptive table text", () => {
    render(<WhatWeSendHmrc />);
    const preview = screen.getByTestId("hmrc-header-live-preview");
    expect(within(preview).getByText(/^UTC[+-]\d{2}:\d{2}$/)).toBeInTheDocument();
    expect(within(preview).getByText(/^width=\d+&height=\d+&scaling-factor=/)).toBeInTheDocument();
    expect(within(preview).getByText(/^width=\d+&height=\d+$/)).toBeInTheDocument();
  });

  it("never shows a fabricated value for the server-added headers in the preview", () => {
    render(<WhatWeSendHmrc />);
    const preview = screen.getByTestId("hmrc-header-live-preview");
    // Device-ID/session/IP arrive server-side — the preview must describe
    // them, never assert a made-up value under those header names.
    expect(within(preview).queryByText(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)).toBeNull();
    expect(within(preview).getByText(/added by our server|arrives? (from|via) our server|server adds/i)).toBeInTheDocument();
  });
});
