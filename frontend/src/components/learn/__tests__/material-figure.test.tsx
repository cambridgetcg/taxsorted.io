// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MaterialFigure } from "../material-figure";

const props = {
  id: "material-1",
  src: "/media/example.jpg",
  width: 800,
  height: 600,
  alt: "A useful description of the relevant historical detail.",
  title: "Historical material",
  caption: <p>The caption explains what is visible.</p>,
  creator: "A. Creator",
  sourceLabel: "Archive item",
  sourceUrl: "https://example.com/item",
  creditLine: "Archive credit line.",
  rightsLabel: "Example licence",
  rightsUrl: "https://example.com/licence",
  changeNote: "Rotated; no crop.",
  evidenceBoundary: "It does not prove a national pattern.",
  transcript: <p>One window closed since the previous survey.</p>,
};

describe("MaterialFigure", () => {
  it("keeps the image, attribution, rights, changes and evidence limit visible", () => {
    const { container } = render(<MaterialFigure {...props} />);

    expect(container.querySelector('figure[data-material-id="material-1"]')).not.toBeNull();
    expect(screen.getByRole("img")).toHaveAttribute("alt", props.alt);
    expect(screen.getByRole("img")).toHaveAttribute("width", "800");
    expect(screen.getByRole("img")).toHaveAttribute("height", "600");
    expect(screen.getByText("A. Creator")).toBeVisible();
    expect(screen.getByText("Archive credit line.")).toBeVisible();
    expect(screen.getByText("Rotated; no crop.")).toBeVisible();
    expect(screen.getByText(/does not prove a national pattern/i)).toBeVisible();
  });

  it("links the original and rights statement and exposes a scan transcript", () => {
    render(<MaterialFigure {...props} />);

    expect(screen.getByRole("link", { name: /archive item/i })).toHaveAttribute(
      "href",
      "https://example.com/item",
    );
    expect(screen.getByRole("link", { name: /example licence/i })).toHaveAttribute(
      "href",
      "https://example.com/licence",
    );
    expect(screen.getByText(/one window closed since the previous survey/i)).toBeInTheDocument();
  });

  it("rejects empty alternative text", () => {
    expect(() => render(<MaterialFigure {...props} alt=" " />)).toThrow(
      /needs useful alternative text/i,
    );
  });
});
