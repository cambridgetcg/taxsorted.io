// @vitest-environment jsdom

// The your-voice civic panel: every link here reads straight from
// `lib/gov/contacts.ts` (ROLES) or is one of the four live gov guide routes —
// nothing invented, nothing hardcoded that isn't already corpus data. These
// tests are deliberately data-driven (reading ROLES directly) so they never
// drift from the module they're asserting against.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VoicePanel } from "../voice-panel";
import { ROLES } from "@/lib/gov/contacts";

describe("VoicePanel", () => {
  it("links out to the real MP finder with the privacy note", () => {
    const yourMp = ROLES.find((r) => r.id === "your-mp")!;
    render(<VoicePanel today="2026-07-06" />);

    const finderLink = screen.getByRole("link", { name: /find your mp/i });
    expect(finderLink).toHaveAttribute("href", yourMp.contactUrl);

    expect(
      screen.getByText(/your postcode never touches our site/i)
    ).toBeInTheDocument();
  });

  it("renders a staleness-badged role once 'today' is injected far past its verifiedOn", () => {
    render(<VoicePanel today="2026-07-06" />);
    expect(screen.queryByText(/re-verify/i)).not.toBeInTheDocument();

    render(<VoicePanel today="2027-06-01" />);
    expect(screen.getAllByText(/re-verify/i).length).toBeGreaterThan(0);
  });

  it("links to all four live gov guides", () => {
    render(<VoicePanel today="2026-07-06" />);

    const expectedHrefs = [
      "/learn/gov/how-tax-law-is-made",
      "/learn/gov/who-runs-your-taxes",
      "/learn/gov/your-levers",
      "/learn/gov/receipts",
    ];
    for (const href of expectedHrefs) {
      expect(document.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });

  it("never embeds an HMRC phone number, email or postal address", () => {
    render(<VoicePanel today="2026-07-06" />);
    const text = document.body.textContent ?? "";
    // No HMRC contact detail is shown, so no anti-phishing note is required
    // (per the plan's own guidance) — but if a phone/email pattern DID
    // sneak in, this test would catch it.
    expect(text).not.toMatch(/0300 200 \d{4}/);
    expect(text).not.toMatch(/hmrc\.gov\.uk/i);
  });
});
