// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SyntheticAccountingDemoPage from "../page";

vi.mock("../synthetic-accounting-demo-client", () => ({
  default: () => <div data-testid="demo-client" />,
}));

describe("made-up connector proof page", () => {
  it("names every real system it does not contact", () => {
    render(<SyntheticAccountingDemoPage />);

    expect(
      screen.getByRole("heading", { name: /real connector boundary without real accounts/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/nothing here connects to xero, quickbooks, freeagent, sage or hmrc/i))
      .toBeInTheDocument();
    expect(screen.getByText(/api switch is impossible to enable in production/i))
      .toBeInTheDocument();
    expect(screen.getByTestId("demo-client")).toBeInTheDocument();
  });
});
