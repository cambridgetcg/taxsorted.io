// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CockpitClient from "../cockpit-client";

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
    render(<CockpitClient />);

    expect(screen.getByRole("heading", { name: "VAT sandbox workspace" })).toBeInTheDocument();
    expect(screen.getByText(/production filing is not available yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tax Checkup/i })).toHaveAttribute(
      "href",
      "/checkup",
    );
    expect(await screen.findByText(/HMRC's test environment/i)).toBeInTheDocument();
  });
});
