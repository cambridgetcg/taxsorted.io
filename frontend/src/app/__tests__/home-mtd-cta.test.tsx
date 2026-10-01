// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { HomeClient } from "../home-client";
import { I18nProvider } from "@/i18n/I18nProvider";
import { AUDIENCES } from "@/lib/tax-services";

describe("homepage service starting point", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });

  it("prioritises individuals, sole traders and landlords and explains each destination", () => {
    render(<HomeClient />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName("A clearer way to sort your tax.");
    const choices = screen.getByRole("region", { name: "Who are you sorting tax for?" });
    expect(within(choices).getAllByRole("link")).toHaveLength(3);
    for (const id of ["individuals", "sole-traders", "landlords"]) {
      const audience = AUDIENCES.find((entry) => entry.id === id)!;
      const link = within(choices).getByRole("link", { name: audience.shortName });
      expect(link).toHaveAttribute("href", `/services/${id}`);
      expect(link).toHaveAccessibleDescription(audience.description);
    }
    expect(screen.getByRole("link", { name: "For advisers" })).toHaveAttribute("href", "/services/advisers");
    expect(screen.getByRole("link", { name: "For organisations" })).toHaveAttribute("href", "/services/organisations");
  });

  it("connects the start and return journeys to the existing tools", () => {
    render(<HomeClient />);

    expect(screen.getByRole("link", { name: "See my tax year" })).toHaveAttribute("href", "/checkup");
    expect(screen.getByRole("link", { name: "Continue to my records" })).toHaveAttribute("href", "/books/workspace");
    expect(screen.getByRole("link", { name: "Open my tax year" })).toHaveAttribute("href", "/checkup");
    expect(screen.getByRole("link", { name: "Explore money records" })).toHaveAttribute("href", "/books");
    expect(screen.getByRole("link", { name: "See preparation and filing" })).toHaveAttribute("href", "/file");
    expect(screen.getByRole("link", { name: "Find help with a problem" })).toHaveAttribute("href", "/put-it-right");
    expect(screen.getByRole("link", { name: "Explore all services" })).toHaveAttribute("href", "/services");
  });

  it("keeps the MTD quick check and sourced explanation visible", () => {
    render(<HomeClient />);

    const mtd = screen.getByRole("region", { name: "Check if Making Tax Digital applies to you." });
    expect(within(mtd).getByRole("link", { name: "Check MTD requirements" })).toHaveAttribute("href", "/itsa/am-i-in");
    expect(screen.getByRole("link", { name: "Making Tax Digital" })).toHaveAttribute("href", "/learn/mtd-income-tax");
  });

  it("states the local storage and filing limits alongside the tools", () => {
    render(<HomeClient />);

    expect(screen.getByText(/money records stay in this app or browser/i)).toHaveTextContent(/an account does not back them up/i);
    expect(screen.getByText(/HMRC filing journeys are sandbox tests/i)).toHaveTextContent(/production filing is not live/i);
  });

  it("marks new English copy correctly under an Urdu interface", async () => {
    window.localStorage.setItem("taxsorted.locale", "ur");
    render(<I18nProvider><HomeClient /></I18nProvider>);

    await waitFor(() => expect(document.documentElement).toHaveAttribute("lang", "ur"));
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    const english = screen.getByRole("heading", { level: 1 }).closest("[lang]");
    expect(english).toHaveAttribute("lang", "en");
    expect(english).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("link", { name: "Individuals" }).closest("[lang]")).toBe(english);
  });
});
