// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VATPortalPage from "../vat-page-client";

describe("legacy VAT workspace", () => {
  it("presents fixed data as a worked example and points separately to the real VAT home", () => {
    const { container } = render(<VATPortalPage entityId="ent_001" />);

    expect(
      screen.getByRole("complementary", { name: "A worked example" }),
    ).toHaveTextContent(/not an account.*no connection to HM Revenue.*cannot save or file/i);
    expect(screen.queryByRole("button", { name: /refresh|connect|disconnect/i })).toBeNull();
    expect(screen.queryByText(/^file a vat return$/i)).toBeNull();
    expect(screen.getByRole("link", { name: /open the example draft/i })).toHaveAttribute(
      "href",
      "/vat/ent_001/submit?period=26A2",
    );
    expect(screen.getByRole("link", { name: /go to your real vat home/i })).toHaveAttribute(
      "href",
      "/vat",
    );
    expect(container.querySelector("dl > div > :not(dt):not(dd)")).toBeNull();
  });
});
