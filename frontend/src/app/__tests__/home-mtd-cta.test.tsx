// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { configFor } from "@taxsorted/engine/uk/itsa";
import { HomeClient } from "../home-client";
import { I18nProvider } from "@/i18n/I18nProvider";
import { gbpCompact, formatUkDate } from "@/lib/format";

describe("homepage MTD Income Tax door", () => {
  it("puts the am-i-in check and the plain-truth guide front and centre", () => {
    render(
      <I18nProvider>
        <HomeClient />
      </I18nProvider>,
    );

    // ONE primary action: the 60-second check.
    const amIIn = screen.getByRole("link", { name: /check if i.m in.*60 seconds/i });
    expect(amIIn).toHaveAttribute("href", "/itsa/am-i-in");

    const truth = screen.getByRole("link", { name: /what.s actually true/i });
    expect(truth).toHaveAttribute("href", "/learn/mtd-income-tax");

    // MTD is spelled out at first use — never a bare abbreviation.
    expect(
      screen.getByRole("heading", { name: /making tax digital \(mtd\)/i }),
    ).toBeInTheDocument();

    // Pinned against the engine's own config, not a literal — the headline
    // can never silently drift out of sync with the source of truth.
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const [firstPhase] = configFor("2026-27").mtdThresholds.value;
    const mandatedFrom = escapeRegex(formatUkDate(firstPhase.mandatedFrom));
    const qualifyingIncomeOver = escapeRegex(gbpCompact(firstPhase.qualifyingIncomeOver));
    expect(
      screen.getByText(new RegExp(`mandatory since ${mandatedFrom}.*${qualifyingIncomeOver}`, "i")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no account — your records stay in your browser/i),
    ).toBeInTheDocument();

    // The honesty hedge stays on the landing page: recognition is a goal,
    // not a claim — losing this line would overstate what the tool is.
    expect(screen.getByText(/working towards hmrc recognition/i)).toBeInTheDocument();
  });

  it("mirrors the four nav doors and teases the playground on its own page", () => {
    render(
      <I18nProvider>
        <HomeClient />
      </I18nProvider>,
    );

    // Doors match the nav — Learn appears as door card AND pillar heading,
    // so pin each door by href.
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    for (const href of ["/learn", "/tools", "/uk/money", "/about"]) {
      expect(hrefs).toContain(href);
    }

    // The playground moved out — one teaser link remains.
    const teaser = screen.getByRole("link", { name: /play with the numbers/i });
    expect(teaser).toHaveAttribute("href", "/uk/personal-tax#playground");

    // The world line and last line survive the diet.
    expect(screen.getByText(/ireland, germany and the us are being drawn/i)).toBeInTheDocument();
    expect(screen.getByText(/first country, not our last/i)).toBeInTheDocument();
  });
});
