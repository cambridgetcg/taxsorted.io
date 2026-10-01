// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TrustPage from "../page";

describe("Trust page", () => {
  it("puts local storage, filing and confidential-intake boundaries in one place", () => {
    render(<TrustPage />);
    expect(screen.getByRole("heading", { name: /boundary should be as visible as the feature/i })).toBeInTheDocument();
    expect(screen.getByText(/browser’s IndexedDB/i)).toBeInTheDocument();
    expect(screen.getByText(/production VAT or MTD Income Tax filing/i)).toBeInTheDocument();
    expect(screen.getByText(/does not accept live dispute files/i)).toBeInTheDocument();
    expect(screen.getByText(/provider sign-in connections are not live yet/i)).toBeInTheDocument();
  });

  it("does not claim unearned accessibility, security or HMRC status", () => {
    render(<TrustPage />);
    expect(screen.getByText(/no accessibility certification or independent security certification/i)).toBeInTheDocument();
    expect(screen.getByText(/no HMRC endorsement/i)).toBeInTheDocument();
    expect(screen.getByText(/confidential support and correction channel is not live/i)).toBeInTheDocument();
    expect(screen.getByText(/The development repository is private/)).toHaveTextContent(/requires repository access/);
    expect(screen.getByRole("link", { name: /source availability and developer setup/i })).toHaveAttribute("href", "/download#source");
    expect(screen.getByRole("link", { name: /feedback access and limits/i })).toHaveAttribute("href", "/feedback");
  });
});
