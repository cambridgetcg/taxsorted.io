// @vitest-environment jsdom

// The api client is mocked wholesale — no real network in these tests. The
// three states below are the ones the plan names explicitly: unreachable,
// reachable-not-connected, and connected. No sample/fake data ever stands in
// for a real response — every mock here is what the real api would actually
// send back for that scenario.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HmrcPanel } from "../hmrc-panel";

const { mockApi, MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
      public detail?: unknown
    ) {
      super(message);
    }
  }
  return {
    MockApiError,
    mockApi: {
      listEntities: vi.fn(),
      createEntity: vi.fn(),
      setNino: vi.fn(),
      itsaStatus: vi.fn(),
      itsaObligations: vi.fn(),
      disconnect: vi.fn(),
      connectUrl: vi.fn((id: string, rail?: string) =>
        rail === "itsa"
          ? `https://api.taxsorted.io/v1/hmrc/start/${id}?rail=itsa`
          : `https://api.taxsorted.io/v1/hmrc/start/${id}`
      ),
      // Untyped like every other mock here — the default resolved value
      // (anonymous, the common case in every state test below) is set in
      // beforeEach so `vi.clearAllMocks()` never has to fight the initial
      // implementation's inferred type. A rejection here must never fail
      // the panel — it's a secondary, non-blocking signal.
      getAccount: vi.fn(),
    },
  };
});

vi.mock("@/lib/api", () => ({
  api: mockApi,
  ApiError: MockApiError,
}));

/** The one connected sandbox entity most tests share. */
function connectedEntity() {
  return {
    id: "e1",
    name: "Self Assessment",
    kind: "person",
    vrn: null,
    nino: "AA123456A",
    created_at: "2026-01-01T00:00:00.000Z",
    connected: true,
    connections: { vat: false, itsa: true },
    hmrc_env: "sandbox",
  };
}

describe("HmrcPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getAccount.mockResolvedValue({ signedIn: false });
  });

  afterEach(() => {
    // Some tests set ?hmrc= on the jsdom URL — never leak it across tests.
    window.history.replaceState(null, "", "/");
  });

  it("state (a): renders a quiet retry card when the api is unreachable", async () => {
    mockApi.listEntities.mockRejectedValue(new Error("network down"));

    render(<HmrcPanel taxYear="2026-27" />);

    expect(await screen.findByText(/our server may be asleep/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    // Never a fake connected/obligations view on this path.
    expect(screen.queryByText(/sandbox source/i)).toBeNull();
  });

  it("establishes the browser session before checking account status", async () => {
    let resolveEntities!: (value: { entities: never[] }) => void;
    mockApi.listEntities.mockImplementation(
      () => new Promise((resolve) => {
        resolveEntities = resolve;
      })
    );

    render(<HmrcPanel taxYear="2026-27" />);

    expect(mockApi.getAccount).not.toHaveBeenCalled();
    resolveEntities({ entities: [] });

    await screen.findByRole("button", { name: /start hmrc sandbox setup/i });
    expect(mockApi.getAccount).toHaveBeenCalledTimes(1);
  });

  it("creates no server-side workspace until the reader explicitly starts the sandbox", async () => {
    mockApi.listEntities.mockResolvedValue({ entities: [] });
    mockApi.createEntity.mockResolvedValue({
      entity: {
        id: "e-new",
        name: "Self Assessment",
        kind: "person",
        vrn: null,
        nino: null,
        created_at: "2026-07-15T00:00:00.000Z",
        connected: false,
        connections: { vat: false, itsa: false },
      },
    });

    render(<HmrcPanel taxYear="2026-27" />);

    const start = await screen.findByRole("button", { name: /start hmrc sandbox setup/i });
    expect(mockApi.createEntity).not.toHaveBeenCalled();
    expect(screen.getByText(/no self assessment workspace has been created yet/i)).toBeInTheDocument();

    fireEvent.click(start);
    fireEvent.click(start);

    await waitFor(() => {
      expect(mockApi.createEntity).toHaveBeenCalledWith({
        name: "Self Assessment",
        kind: "person",
      });
    });
    expect(mockApi.createEntity).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText(/national insurance number/i)).toBeInTheDocument();
  });

  it("state (b): renders the connect button, permanent SANDBOX badge and recognition line when reachable but not connected", async () => {
    mockApi.listEntities.mockResolvedValue({
      entities: [
        {
          id: "e1",
          name: "Self Assessment",
          kind: "person",
          vrn: null,
          nino: "AA123456A",
          created_at: "2026-01-01T00:00:00.000Z",
          connected: false,
          connections: { vat: false, itsa: false },
        },
      ],
    });

    render(<HmrcPanel taxYear="2026-27" />);

    const link = await screen.findByRole("link", { name: /connect to hmrc/i });
    expect(link).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/hmrc/start/e1?rail=itsa"
    );
    expect(screen.getAllByText(/sandbox/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/real filing switches on once hmrc approves us/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mtd for income tax|read more/i })).toHaveAttribute(
      "href",
      "/learn/mtd-income-tax"
    );
  });

  it("collision regression: a VAT-only connection on this entity reads as NOT connected here", async () => {
    // Legacy `connected` is true (some rail is connected — VAT), but
    // `connections.itsa` is false. Before the per-rail fix, this panel read
    // the legacy `connected` flag and would have wrongly shown "Connected to
    // HMRC" for a rail that never actually completed its own OAuth dance.
    mockApi.listEntities.mockResolvedValue({
      entities: [
        {
          id: "e1",
          name: "Self Assessment",
          kind: "person",
          vrn: "123456789",
          nino: "AA123456A",
          created_at: "2026-01-01T00:00:00.000Z",
          connected: true,
          connections: { vat: true, itsa: false },
          hmrc_env: "sandbox",
        },
      ],
    });

    render(<HmrcPanel taxYear="2026-27" />);

    const link = await screen.findByRole("link", { name: /connect to hmrc/i });
    expect(link).toHaveAttribute(
      "href",
      "https://api.taxsorted.io/v1/hmrc/start/e1?rail=itsa"
    );
    // Never the connected view's content for a rail that isn't connected.
    expect(screen.queryByText(/sandbox source/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /disconnect/i })).toBeNull();
    expect(mockApi.itsaStatus).not.toHaveBeenCalled();
    expect(mockApi.itsaObligations).not.toHaveBeenCalled();
  });

  it("state (c): renders the ITSA status chip and at least one obligation row when connected", async () => {
    mockApi.listEntities.mockResolvedValue({
      entities: [
        {
          id: "e1",
          name: "Self Assessment",
          kind: "person",
          vrn: null,
          nino: "AA123456A",
          created_at: "2026-01-01T00:00:00.000Z",
          connected: true,
          connections: { vat: false, itsa: true },
          hmrc_env: "sandbox",
        },
      ],
    });
    mockApi.itsaStatus.mockResolvedValue({
      taxYear: "2026-27",
      status: "MTD Mandated",
      source: "hmrc-sandbox",
    });
    mockApi.itsaObligations.mockResolvedValue({
      obligations: [
        {
          periodStart: "2026-04-06",
          periodEnd: "2026-07-05",
          dueDate: "2026-08-07",
          status: "open",
        },
      ],
      source: "hmrc-sandbox",
    });

    render(<HmrcPanel taxYear="2026-27" />);

    expect(await screen.findByText(/mtd mandated/i)).toBeInTheDocument();
    expect(screen.getByText(/7 August 2026/)).toBeInTheDocument();
    expect(screen.getAllByText(/sandbox/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("connected but HMRC's obligations call fails: shows the honest error, never a fake empty table", async () => {
    mockApi.listEntities.mockResolvedValue({
      entities: [
        {
          id: "e1",
          name: "Self Assessment",
          kind: "person",
          vrn: null,
          nino: "AA123456A",
          created_at: "2026-01-01T00:00:00.000Z",
          connected: true,
          connections: { vat: false, itsa: true },
          hmrc_env: "sandbox",
        },
      ],
    });
    mockApi.itsaStatus.mockResolvedValue({
      taxYear: "2026-27",
      status: "MTD Mandated",
      source: "hmrc-sandbox",
    });
    mockApi.itsaObligations.mockRejectedValue(
      new MockApiError(428, "hmrc", "not connected to HMRC")
    );

    render(<HmrcPanel taxYear="2026-27" />);

    expect(await screen.findByText(/not connected to hmrc/i)).toBeInTheDocument();
    // Never claim "nothing to send" when HMRC simply didn't answer.
    expect(screen.queryByText(/lists nothing for you to send/i)).toBeNull();
  });

  it("reuses an existing bare 'Self Assessment' person entity instead of minting another", async () => {
    mockApi.listEntities.mockResolvedValue({
      entities: [
        {
          id: "e1",
          name: "Self Assessment",
          kind: "person",
          vrn: null,
          nino: null,
          created_at: "2026-01-01T00:00:00.000Z",
          connected: false,
          connections: { vat: false, itsa: false },
        },
      ],
    });

    render(<HmrcPanel taxYear="2026-27" />);

    // The reused entity's NINO capture renders…
    expect(await screen.findByLabelText(/national insurance number/i)).toBeInTheDocument();
    // …and no duplicate entity was created for it.
    expect(mockApi.createEntity).not.toHaveBeenCalled();
  });

  it("surfaces ?hmrc=connected from the OAuth callback and cleans the URL", async () => {
    window.history.replaceState(null, "", "/dashboard?hmrc=connected");
    mockApi.listEntities.mockResolvedValue({ entities: [connectedEntity()] });
    mockApi.itsaStatus.mockResolvedValue({
      taxYear: "2026-27",
      status: "MTD Mandated",
      source: "hmrc-sandbox",
    });
    mockApi.itsaObligations.mockResolvedValue({ obligations: [], source: "hmrc-sandbox" });

    render(<HmrcPanel taxYear="2026-27" />);

    expect(await screen.findByText(/hmrc confirmed the connection/i)).toBeInTheDocument();
    // The one-shot outcome never sticks to the address bar.
    await waitFor(() => expect(window.location.search).not.toContain("hmrc="));
  });

  it("surfaces ?hmrc=denied honestly — no success theatre", async () => {
    window.history.replaceState(null, "", "/dashboard?hmrc=denied");
    mockApi.listEntities.mockResolvedValue({
      entities: [
        { ...connectedEntity(), connected: false, connections: { vat: false, itsa: false } },
      ],
    });

    render(<HmrcPanel taxYear="2026-27" />);

    expect(await screen.findByText(/you said no on hmrc's side/i)).toBeInTheDocument();
    expect(screen.queryByText(/hmrc confirmed the connection/i)).toBeNull();
    await waitFor(() => expect(window.location.search).not.toContain("hmrc="));
  });

  it("disconnect failure: shows an inline error and re-checks true server state", async () => {
    mockApi.listEntities.mockResolvedValue({ entities: [connectedEntity()] });
    mockApi.itsaStatus.mockResolvedValue({
      taxYear: "2026-27",
      status: "MTD Mandated",
      source: "hmrc-sandbox",
    });
    mockApi.itsaObligations.mockResolvedValue({ obligations: [], source: "hmrc-sandbox" });
    mockApi.disconnect.mockRejectedValue(new MockApiError(502, "hmrc", "HMRC revoke failed"));

    render(<HmrcPanel taxYear="2026-27" />);
    fireEvent.click(await screen.findByRole("button", { name: /disconnect/i }));

    // The panel re-checked the server instead of trusting its local guess…
    await waitFor(() => expect(mockApi.listEntities).toHaveBeenCalledTimes(2));
    // …the failure is said out loud (and survives the re-check)…
    expect(await screen.findByText(/hmrc revoke failed/i)).toBeInTheDocument();
    // …and the truth is still "connected", so disconnect stays offered.
    expect(await screen.findByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("account truth (anonymous): tells the reader this entity is tied to this browser, with a door to /account", async () => {
    // getAccount defaults to signedIn:false above — no override needed.
    mockApi.listEntities.mockResolvedValue({
      entities: [
        {
          id: "e1",
          name: "Self Assessment",
          kind: "person",
          vrn: null,
          nino: "AA123456A",
          created_at: "2026-01-01T00:00:00.000Z",
          connected: false,
          connections: { vat: false, itsa: false },
        },
      ],
    });

    render(<HmrcPanel taxYear="2026-27" />);

    await screen.findByRole("link", { name: /connect to hmrc/i });
    expect(screen.getByText(/tied to this browser/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute(
      "href",
      "/account"
    );
    // Never the claim door when there's no account at all yet.
    expect(screen.queryByText(/keep this browser's businesses/i)).toBeNull();
  });

  it("account truth (signed in, claimable): surfaces the claim door to /account instead of the tied-to-browser line", async () => {
    mockApi.getAccount.mockResolvedValueOnce({
      signedIn: true,
      account: { id: "u1", name: "Taxpayer" },
      mfa: true,
      passkeys: [],
      recoveryCodesLeft: 10,
      claimableEntities: 2,
    });
    mockApi.listEntities.mockResolvedValue({ entities: [connectedEntity()] });
    mockApi.itsaStatus.mockResolvedValue({
      taxYear: "2026-27",
      status: "MTD Mandated",
      source: "hmrc-sandbox",
    });
    mockApi.itsaObligations.mockResolvedValue({ obligations: [], source: "hmrc-sandbox" });

    render(<HmrcPanel taxYear="2026-27" />);

    await screen.findByText(/mtd mandated/i);
    expect(
      screen.getByText(/keep this browser's businesses in your account/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^account$/i })).toHaveAttribute("href", "/account");
    // Never the anonymous line once signed in.
    expect(screen.queryByText(/tied to this browser/i)).toBeNull();
  });
});
