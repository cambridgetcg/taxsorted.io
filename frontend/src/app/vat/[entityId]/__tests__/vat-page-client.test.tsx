// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VATPortalPage from "../vat-page-client";

describe("legacy VAT workspace", () => {
  it("presents fixed data as fictional and points separately to the real cockpit", () => {
    render(<VATPortalPage entityId="ent_001" />);

    expect(
      screen.getByRole("complementary", { name: "Fictional VAT workspace" }),
    ).toHaveTextContent(/not an account.*no HMRC connection.*cannot save or file/i);
    expect(screen.queryByRole("button", { name: /refresh|connect|disconnect/i })).toBeNull();
    expect(screen.queryByText(/^file a vat return$/i)).toBeNull();
    expect(screen.getByRole("link", { name: /open fictional draft/i })).toHaveAttribute(
      "href",
      "/vat/ent_001/submit?period=26A2",
    );
    expect(screen.getByRole("link", { name: /open the real vat cockpit/i })).toHaveAttribute(
      "href",
      "/vat",
    );
  });
});
