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
    expect(screen.getByText(/An earlier preview passed automated checks/)).toHaveTextContent(/Consumer installation and recovery checks and trusted release signing are still pending/);
    expect(screen.getByText(/revision/)).toHaveTextContent(/A public release needs checks on the exact installer files being offered/);
  });

  it("distinguishes protected workspace backups from live storage and explains deliberate migration", () => {
    render(<DownloadPage />);
    expect(screen.getByText(/Existing website data is not moved into the app automatically/)).toBeInTheDocument();
    expect(screen.getByText(/Workspace backups are password-protected/)).toHaveTextContent(/does not encrypt the live app profile/);
    expect(screen.getByText(/Keep its password separately/)).toHaveTextContent(/cannot reset it/);
    expect(screen.getByText(/Ordinary Passport exports and preparation summaries/)).toHaveTextContent(/unencrypted handovers/);
    expect(screen.getByText(/All included areas are replaced together/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open money records/i })).toHaveAttribute("href", "/books/workspace");
    expect(screen.getByRole("link", { name: /back up or restore saved work/i })).toHaveAttribute("href", "/backups");
    expect(screen.getByRole("link", { name: /Books-only backups/i })).toHaveAttribute("href", "/books/workspace/backups");
    expect(screen.getByRole("link", { name: /open tax summary and handover/i })).toHaveAttribute("href", "/passport");
  });

  it("keeps the offline and submission boundary explicit", () => {
    render(<DownloadPage />);
    expect(screen.getByText(/Preparing figures does not file a return/)).toBeInTheDocument();
    expect(screen.getByText(/Guides and rules are the versions bundled with the app/)).toBeInTheDocument();
    expect(screen.getByText(/npm run desktop:build/)).toBeInTheDocument();
    expect(screen.getByText(/npm run desktop:build/).textContent).toContain("\nnpm ci\n");
  });
});
