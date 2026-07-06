// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { configFor } from "@taxsorted/engine/uk/itsa";
import { HomeClient } from "../home-client";
import { I18nProvider } from "@/i18n/I18nProvider";
import { gbpCompact, formatUkDate } from "@/lib/format";

describe("homepage MTD Income Tax door", () => {
  it("puts the am-i-in check and the de-panic guide front and centre", () => {
    render(
      <I18nProvider>
        <HomeClient />
      </I18nProvider>,
    );

    const amIIn = screen.getByRole("link", { name: /am i in.*60.second check/i });
    expect(amIIn).toHaveAttribute("href", "/itsa/am-i-in");

    const dePanic = screen.getByRole("link", { name: /don.t panic/i });
    expect(dePanic).toHaveAttribute("href", "/learn/mtd-income-tax");

    const toolkit = screen.getByRole("link", { name: /toolkit/i });
    expect(toolkit).toHaveAttribute("href", "/itsa");

    // Pinned against the engine's own config, not a literal — the headline
    // can never silently drift out of sync with the source of truth.
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const [firstPhase] = configFor("2026-27").mtdThresholds.value;
    const mandatedFrom = escapeRegex(formatUkDate(firstPhase.mandatedFrom));
    const qualifyingIncomeOver = escapeRegex(gbpCompact(firstPhase.qualifyingIncomeOver));
    expect(
      screen.getByText(new RegExp(`mandatory since ${mandatedFrom}.*${qualifyingIncomeOver}`, "i")),
    ).toBeInTheDocument();
    expect(screen.getByText(/no account — your records stay in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/AGPL/i)).toBeInTheDocument();
  });
});
