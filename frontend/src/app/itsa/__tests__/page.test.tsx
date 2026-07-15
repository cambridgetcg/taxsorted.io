// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ItsaHubPage from "../page";

describe("MTD and records hub", () => {
  it("keeps the ITSA cockpit discoverable without implying an automatic sandbox setup", () => {
    render(<ItsaHubPage />);

    expect(screen.getByRole("link", { name: /your ITSA cockpit/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByText(/sandbox setup starts only when you choose it/i)).toBeInTheDocument();
  });
});
