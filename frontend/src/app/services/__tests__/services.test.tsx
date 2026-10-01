// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServiceDirectory } from "../service-directory";
import ServicesPage from "../page";
import AudiencePage, { generateStaticParams } from "../[audience]/page";
import { AUDIENCES } from "@/lib/tax-services";

describe("service discovery", () => {
  it("offers the three priority audience journeys and a checklist", () => {
    render(<ServicesPage />);
    expect(screen.getByRole("link", { name: /Individuals and families.*Explore services/ })).toHaveAttribute("href", "/services/individuals");
    expect(screen.getByRole("link", { name: /Sole traders and freelancers.*Explore services/ })).toHaveAttribute("href", "/services/sole-traders");
    expect(screen.getByRole("link", { name: /Landlords.*Explore services/ })).toHaveAttribute("href", "/services/landlords");
    expect(screen.getByRole("link", { name: /Help me choose/ })).toHaveAttribute("href", "/checkup");
  });

  it("combines audience and text filters without recommending sole-trader choices to landlords", () => {
    render(<ServiceDirectory />);
    fireEvent.change(screen.getByLabelText("Who is this for?"), { target: { value: "landlords" } });
    expect(screen.queryByRole("link", { name: "Compare sole-trader choices" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("What do you need help with?"), { target: { value: "property records" } });
    expect(screen.getByRole("link", { name: /Open property records/ })).toHaveAttribute("href", "/books/workspace/money?activity=uk-property");
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("recovers from no matches with clear filters", () => {
    render(<ServiceDirectory />);
    fireEvent.change(screen.getByLabelText("What do you need help with?"), { target: { value: "no-such-task" } });
    expect(screen.getByRole("heading", { name: "No services match those filters." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Clear filters/ }));
    expect(screen.getAllByRole("article").length).toBeGreaterThan(1);
    expect(screen.getByLabelText("What do you need help with?")).toHaveValue("");
  });

  it.each(["sole-traders", "landlords"])("finds shared import tools for %s and carries its activity", (audience) => {
    render(<ServiceDirectory />);
    fireEvent.change(screen.getByLabelText("Who is this for?"), { target: { value: audience } });
    fireEvent.change(screen.getByLabelText("What do you need help with?"), { target: { value: "CSV" } });
    expect(screen.getByRole("link", { name: "Import a CSV" })).toHaveAttribute("href", `/books/workspace/money?start=csv${audience === "landlords" ? "&activity=uk-property" : ""}`);
  });

  it.each(AUDIENCES)("generates a static page and checklist for $id", async (audience) => {
    expect(generateStaticParams()).toContainEqual({ audience: audience.id });
    render(await AudiencePage({ params: Promise.resolve({ audience: audience.id }) }));
    const action = ["individuals", "sole-traders", "landlords"].includes(audience.id) ? "Open my tax year" : "Build my checklist";
    expect(screen.getByRole("link", { name: action })).toHaveAttribute("href", `/checkup?for=${audience.id}`);
    expect(screen.getByText(audience.scope)).toBeInTheDocument();
  });
});
