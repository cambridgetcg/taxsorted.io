// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeClient } from "../home-client";
import { I18nProvider } from "@/i18n/I18nProvider";

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

    expect(screen.getByText(/6 april 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/no account — your records stay in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/AGPL/i)).toBeInTheDocument();
  });
});
