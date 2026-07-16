// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VatCockpitPage from "../page";

const apiMocks = vi.hoisted(() => ({
  railStatus: vi.fn(),
  listEntities: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  api: apiMocks,
  ApiError: class ApiError extends Error {},
}));

describe("VAT cockpit boundary", () => {
  beforeEach(() => {
    apiMocks.railStatus.mockReset();
    apiMocks.listEntities.mockReset();
    apiMocks.railStatus.mockResolvedValue({ configured: true, env: "sandbox" });
    apiMocks.listEntities.mockResolvedValue({ entities: [] });
  });

  it("labels the workspace and receipts as practice before recognition", async () => {
    // The heading and the practice disclaimer live in the server-rendered
    // shell (page.tsx) so they exist before JavaScript loads.
    render(<VatCockpitPage />);

    expect(
      screen.getByRole("heading", { name: /VAT — your records, your return/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/production filing is not available yet/i)).toBeInTheDocument();
    expect(screen.getByText(/HMRC's practice\s+system/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tax Checkup/i })).toHaveAttribute(
      "href",
      "/checkup",
    );
    expect(await screen.findByText(/HMRC's test system/i)).toBeInTheDocument();
  });
});
