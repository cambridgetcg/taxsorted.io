// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import VatCockpitPage from "../page";

const apiMocks = vi.hoisted(() => ({
  railStatus: vi.fn(),
  listEntities: vi.fn(),
  getEntity: vi.fn(),
  obligations: vi.fn(),
  submissions: vi.fn(),
  disconnect: vi.fn(),
  connectUrl: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({ query: "", push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigationMocks.query),
  useRouter: () => ({ push: navigationMocks.push }),
}));

vi.mock("@/lib/api", () => ({
  api: apiMocks,
  ApiError: class ApiError extends Error {},
}));

describe("VAT cockpit boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationMocks.query = "";
    apiMocks.railStatus.mockResolvedValue({ configured: true, env: "sandbox" });
    apiMocks.listEntities.mockResolvedValue({ entities: [] });
    apiMocks.obligations.mockResolvedValue({ obligations: [] });
    apiMocks.submissions.mockResolvedValue({ submissions: [] });
    apiMocks.disconnect.mockResolvedValue({ disconnected: true, rail: "vat" });
    apiMocks.connectUrl.mockReturnValue("https://api.taxsorted.test/v1/hmrc/connect?entity=e1&rail=vat");
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

  it("offers a VAT connection when only Income Tax is connected", async () => {
    navigationMocks.query = "e=e1";
    apiMocks.getEntity.mockResolvedValue({
      entity: {
        id: "e1",
        name: "Example Ltd",
        kind: "business",
        vrn: "123456789",
        nino: "AA000003D",
        created_at: "2026-01-01T00:00:00.000Z",
        connected: true,
        connections: { vat: false, itsa: true },
        hmrc_env: "sandbox",
      },
    });

    render(<VatCockpitPage />);

    expect(await screen.findByRole("link", { name: /connect at hmrc/i })).toHaveAttribute(
      "href",
      "https://api.taxsorted.test/v1/hmrc/connect?entity=e1&rail=vat",
    );
    expect(apiMocks.obligations).not.toHaveBeenCalled();
    expect(screen.queryByText(/VAT connected/i)).not.toBeInTheDocument();
  });

  it("disconnects VAT without treating the remaining Income Tax rail as VAT", async () => {
    navigationMocks.query = "e=e1";
    apiMocks.getEntity.mockResolvedValueOnce({
      entity: {
        id: "e1",
        name: "Example Ltd",
        kind: "business",
        vrn: "123456789",
        nino: null,
        created_at: "2026-01-01T00:00:00.000Z",
        connected: true,
        connections: { vat: true, itsa: true },
        hmrc_env: "sandbox",
      },
    }).mockResolvedValue({
      entity: {
        id: "e1",
        name: "Example Ltd",
        kind: "business",
        vrn: "123456789",
        nino: "AA000003D",
        created_at: "2026-01-01T00:00:00.000Z",
        connected: true,
        connections: { vat: false, itsa: true },
        hmrc_env: "sandbox",
      },
    });

    render(<VatCockpitPage />);
    fireEvent.click(await screen.findByRole("button", { name: /disconnect from hmrc/i }));

    await waitFor(() => expect(apiMocks.disconnect).toHaveBeenCalledWith("e1", "vat"));
    expect(await screen.findByRole("link", { name: /connect at hmrc/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /disconnect from hmrc/i })).not.toBeInTheDocument();
  });
});
