// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DownloadPage from "../page";

describe("local app setup and data boundaries", () => {
  it("names each platform without offering unpublished downloads", () => {
    render(<DownloadPage />);
    for (const name of ["macOS", "Windows", "Linux"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Download not published yet")).toHaveLength(3);
    expect(screen.getAllByRole("link").some((link) => /\.(dmg|zip|exe|AppImage)$/i.test(link.getAttribute("href") ?? ""))).toBe(false);
  });

  it("explains separate storage, unencrypted exports and deliberate migration", () => {
    render(<DownloadPage />);
    expect(screen.getByText(/Existing website data is not moved into the app automatically/)).toBeInTheDocument();
    expect(screen.getByText(/TaxSorted does not encrypt this profile or exported files/)).toBeInTheDocument();
    expect(screen.getByText(/Passport import is not available yet/)).toBeInTheDocument();
    expect(screen.getByText(/Restoring replaces the Books already in that app/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open money records/i })).toHaveAttribute("href", "/books/workspace");
    expect(screen.getByRole("link", { name: /open passport/i })).toHaveAttribute("href", "/passport");
  });

  it("keeps the offline and submission boundary explicit", () => {
    render(<DownloadPage />);
    expect(screen.getByText(/Preparing figures does not file a return/)).toBeInTheDocument();
    expect(screen.getByText(/Guides and rules are the versions bundled with the app/)).toBeInTheDocument();
    expect(screen.getByText(/npm run desktop:build/)).toBeInTheDocument();
  });
});
