// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { configFor } from "@taxsorted/engine/uk/itsa";
import { HomeClient } from "../home-client";
import { I18nProvider } from "@/i18n/I18nProvider";
import { gbpCompact, formatUkDate } from "@/lib/format";

describe("homepage front door", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });

  it("starts with position and choice, keeps the six powers close, and keeps MTD time-sensitive", () => {
    render(
      <I18nProvider>
        <HomeClient />
      </I18nProvider>,
    );

    expect(screen.getByRole("link", { name: "Check where I stand" })).toHaveAttribute(
      "href",
      "/checkup",
    );
    expect(screen.getByRole("link", { name: "Compare my choices" })).toHaveAttribute(
      "href",
      "/plan",
    );
    expect(screen.getByText(/sole-trader and landlord books are open now/i)).toBeInTheDocument();

    const amIIn = screen.getByRole("link", { name: /am i in.*60.second check/i });
    expect(amIIn).toHaveAttribute("href", "/itsa/am-i-in");
    expect(screen.getByRole("link", { name: /what is actually true/i })).toHaveAttribute(
      "href",
      "/learn/mtd-income-tax",
    );

    // The date and threshold stay pinned to the engine rather than homepage copy.
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const [firstPhase] = configFor("2026-27").mtdThresholds.value;
    const mandatedFrom = escapeRegex(formatUkDate(firstPhase.mandatedFrom));
    const qualifyingIncomeOver = escapeRegex(gbpCompact(firstPhase.qualifyingIncomeOver));
    expect(
      screen.getByText(new RegExp(`first phase started ${mandatedFrom}.*${qualifyingIncomeOver}`, "i")),
    ).toBeInTheDocument();
    expect(screen.getByText(/check the other entry conditions and exemptions/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open plan/i })).toHaveAttribute("href", "/plan");
    expect(screen.getByRole("link", { name: /open books/i })).toHaveAttribute("href", "/books");
    expect(screen.getByRole("link", { name: /open file and pay/i })).toHaveAttribute("href", "/file");
    expect(screen.getByRole("link", { name: /find the right route/i })).toHaveAttribute("href", "/put-it-right");
  });

  it("keeps the wider system and machine-readable understanding one step away", () => {
    render(
      <I18nProvider>
        <HomeClient />
      </I18nProvider>,
    );

    expect(screen.getByRole("link", { name: /follow public money and power/i })).toHaveAttribute(
      "href",
      "/uk",
    );
    expect(screen.getByRole("link", { name: /reuse the understanding/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/uk/tax-expert",
    );
    expect(screen.getByText(/not yet recognised for production filing/i)).toBeInTheDocument();
  });

  it("marks untranslated fallback copy as English under an Urdu interface", async () => {
    window.localStorage.setItem("taxsorted.locale", "ur");
    render(
      <I18nProvider>
        <HomeClient />
      </I18nProvider>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    await waitFor(() => expect(heading).toHaveAttribute("lang", "ur"));
    expect(heading).toHaveAttribute("dir", "rtl");

    const intro = screen.getByText(/pay what the law requires/i);
    expect(intro).toHaveAttribute("lang", "en");
    expect(intro.closest("div[lang='en']")).toHaveAttribute("dir", "ltr");
  });
});
