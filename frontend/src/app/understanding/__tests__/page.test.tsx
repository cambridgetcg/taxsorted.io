// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import understandingMapJson from "../../../../public/understanding/castle.json";
import UnderstandingPage from "../page";

describe("understanding page", () => {
  it("publishes the same bounded method for people and machines", () => {
    render(<UnderstandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /how taxsorted builds understanding/i,
      }),
    ).toBeInTheDocument();
    expect(understandingMapJson.schema).toBe("taxsorted.understanding-map/1");
    expect(understandingMapJson.status).toBe("public-method");
    expect(understandingMapJson.origin.contentImported).toBe(false);
    expect(understandingMapJson.origin.reviewedSource).toContain(
      understandingMapJson.origin.reviewedCommit,
    );
    expect(understandingMapJson.contentLicence).toEqual(
      expect.objectContaining({
        id: "CC-BY-SA-4.0",
        attribution: "TaxSorted (taxsorted.io)",
      }),
    );
    expect(
      understandingMapJson.parts.find((part) => part.id === "open-door")?.lineage,
    ).toBe("castle");
    expect(understandingMapJson.parts.find((part) => part.id === "window")?.lineage).toBe(
      "taxsorted",
    );
    expect(
      screen.getAllByRole("link", { name: /read the same map as json|machine-readable twin/i }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("link", { name: /json|machine-readable twin/i })[0],
    ).toHaveAttribute("href", "/understanding/castle.json");
  });

  it("keeps every building piece and useful door visible", () => {
    render(<UnderstandingPage />);

    for (const part of understandingMapJson.parts) {
      expect(screen.getByRole("heading", { level: 3, name: part.name })).toBeInTheDocument();
    }
    for (const layer of understandingMapJson.stack) {
      expect(screen.getByRole("heading", { level: 3, name: layer.name })).toBeInTheDocument();
    }

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    for (const door of understandingMapJson.doors) {
      const renderedHref = door.external ? door.href : door.href.replace(/\/$/, "");
      expect(hrefs).toContain(renderedHref);
    }
  });

  it("states the provenance, tax-evidence boundary and quiet data behaviour", () => {
    const { container } = render(<UnderstandingPage />);
    const text = container.textContent ?? "";

    expect(
      screen.getByRole("link", { name: "Castle of Understanding" }),
    ).toHaveAttribute("href", understandingMapJson.origin.publicGate);
    expect(screen.getByRole("link", { name: /public gate source/i })).toHaveAttribute(
      "href",
      understandingMapJson.origin.reviewedSource,
    );
    expect(text).toMatch(/imports no Castle rooms/i);
    expect(text).toMatch(/not tax evidence or tax advice/i);
    expect(text).toMatch(/adds no tax-data storage, telemetry or live Castle request/i);
    expect(text).toMatch(/shared shell may remember only your chosen language/i);
    expect(text).toContain(understandingMapJson.reviewedOn);
    expect(text).toContain(understandingMapJson.origin.reviewedCommit.slice(0, 7));
    expect(text).toContain(understandingMapJson.contentLicence.id);
  });

  it("keeps private paths, raw Castle payloads and non-canonical internal URLs out", () => {
    const serialized = JSON.stringify(understandingMapJson);
    const keys: string[] = [];
    JSON.parse(serialized, (key, value) => {
      if (key) keys.push(key);
      return value;
    });

    expect(keys).not.toContain("rooms");
    expect(keys).not.toContain("bodyHtml");
    expect(serialized).not.toMatch(/\/Users\/|~\/castle|castle-of-words/i);
    for (const door of understandingMapJson.doors.filter((candidate) => !candidate.external)) {
      expect(door.href).toMatch(/^\/.*\/$/);
    }
  });
});
