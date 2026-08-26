// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SyntheticAccountingDemoClient from "../synthetic-accounting-demo-client";

const { mockApi, mockRun, mockDemoState, mockClearDemo } = vi.hoisted(() => ({
  mockApi: {
    getAccount: vi.fn(),
    listEntities: vi.fn(),
    createEntity: vi.fn(),
  },
  mockRun: vi.fn(),
  mockDemoState: vi.fn(),
  mockClearDemo: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: mockApi }));
vi.mock("@/lib/synthetic-accounting-demo", () => ({
  runSyntheticAccountingDemo: mockRun,
}));
vi.mock("@/lib/records", () => ({
  createSyntheticDemoRecordsStore: () => ({ state: mockDemoState }),
  clearSyntheticDemoRecords: mockClearDemo,
}));

const ENTITY = {
  id: "entity-1",
  name: "Mina",
  kind: "person" as const,
  vrn: null,
  nino: null,
  created_at: "2026-08-01T12:00:00.000Z",
  connected: false,
  connections: { vat: false, itsa: false },
};

const RESULT = {
  sourceConnection: {
    id: "source-1",
    authorisationId: "authorisation-1",
    entityId: ENTITY.id,
    provider: "synthetic",
    environment: "sandbox",
    organisation: {
      id: "synthetic-uk-sole-trader",
      name: "Mina's Card Studio (made-up)",
      countryCode: "GB",
      baseCurrency: "GBP",
    },
    status: "active",
    dirtyGeneration: "0",
    createdAt: "2026-08-01T12:00:00.000Z",
  },
  organisation: {
    id: "synthetic-uk-sole-trader",
    name: "Mina's Card Studio (made-up)",
    countryCode: "GB",
    baseCurrency: "GBP",
    datasets: ["bank-transactions"],
    synthetic: true,
  },
  replica: {
    id: "replica-1",
    sourceConnectionId: "source-1",
    localReplicaId: "local-1",
    status: "active",
    createdAt: "2026-08-01T12:00:00.000Z",
  },
  ledgerId: "ledger:self-employment:primary",
  kind: "initial",
  checkpoint: {},
  needsAnotherSync: false,
  pageCount: 2,
  added: 3,
  duplicates: 0,
  conflicts: 0,
};

describe("made-up connector screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getAccount.mockResolvedValue({
      signedIn: true,
      mfa: true,
      account: { id: "account-1", name: "Mina" },
      passkeys: [],
      recoveryCodesLeft: 8,
      claimableEntities: 0,
    });
    mockApi.listEntities.mockResolvedValue({ entities: [ENTITY] });
    mockDemoState.mockResolvedValue({ providerBindings: [], ledgers: [] });
    mockClearDemo.mockResolvedValue(undefined);
    mockRun.mockResolvedValue(RESULT);
  });

  it("keeps a signed-out visitor outside the connector", async () => {
    mockApi.getAccount.mockResolvedValue({ signedIn: false });
    render(<SyntheticAccountingDemoClient />);

    expect(await screen.findByRole("heading", { name: /sign in before opening a source/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open my account/i })).toHaveAttribute(
      "href",
      "/account"
    );
    expect(mockApi.listEntities).not.toHaveBeenCalled();
  });

  it("requires an explicit entity and consent, then shows the completed local proof", async () => {
    render(<SyntheticAccountingDemoClient />);

    const runButton = await screen.findByRole("button", { name: /run the connector proof/i });
    expect(runButton).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: /taxsorted person or organisation/i }), {
      target: { value: ENTITY.id },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(runButton).toBeEnabled();
    fireEvent.click(runButton);

    await waitFor(() =>
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: { id: ENTITY.id, name: ENTITY.name },
          activity: "self-employment",
          signal: expect.any(AbortSignal),
        })
      )
    );
    expect(await screen.findByText(/local and server checkpoints agree/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/does not appear in To check in your ordinary Books/i))
      .toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /taxsorted person or organisation/i })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /self-employment/i })).toBeDisabled();
  });

  it("offers a real off-switch and reports its checkpoint boundary", async () => {
    mockRun.mockImplementation(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Accounting sync stopped.", "AbortError"))
          );
        })
    );
    render(<SyntheticAccountingDemoClient />);
    fireEvent.change(
      await screen.findByRole("combobox", { name: /taxsorted person or organisation/i }),
      { target: { value: ENTITY.id } }
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /run the connector proof/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /stop at next safe boundary/i })
    );

    expect(
      await screen.findByText(/no incomplete run became the checkpoint/i)
    ).toBeInTheDocument();
  });

  it("blocks ambiguous browser profiles and sends the user to the adoption door", async () => {
    mockApi.getAccount.mockResolvedValue({
      signedIn: true,
      mfa: true,
      account: { id: "account-1", name: "Mina" },
      passkeys: [],
      recoveryCodesLeft: 8,
      claimableEntities: 2,
    });
    render(<SyntheticAccountingDemoClient />);

    expect(await screen.findByRole("heading", { name: /finish adopting/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /finish in my account/i })).toHaveAttribute(
      "href",
      "/account"
    );
    expect(mockApi.listEntities).not.toHaveBeenCalled();
  });

  it("allows only one run even when the start button is activated twice", async () => {
    let finish!: (value: typeof RESULT) => void;
    mockRun.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<SyntheticAccountingDemoClient />);
    fireEvent.change(
      await screen.findByRole("combobox", { name: /taxsorted person or organisation/i }),
      { target: { value: ENTITY.id } }
    );
    fireEvent.click(screen.getByRole("checkbox"));
    const button = screen.getByRole("button", { name: /run the connector proof/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mockRun).toHaveBeenCalledTimes(1);
    finish(RESULT);
    expect(await screen.findByText(/local and server checkpoints agree/i)).toBeInTheDocument();
  });

  it("clears only the isolated made-up browser store and unlocks the binding", async () => {
    mockDemoState.mockResolvedValue({
      providerBindings: [
        {
          sourceConnectionId: "source-1",
          entityId: ENTITY.id,
          provider: "synthetic",
          environment: "sandbox",
          state: "active",
          ledgerId: "ledger:self-employment:primary",
        },
      ],
      ledgers: [
        { id: "ledger:self-employment:primary", activity: "self-employment" },
      ],
    });
    render(<SyntheticAccountingDemoClient />);
    const selector = await screen.findByRole("combobox", {
      name: /taxsorted person or organisation/i,
    });
    expect(selector).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /clear made-up browser data/i }));
    await waitFor(() => expect(mockClearDemo).toHaveBeenCalledTimes(1));
    expect(selector).toBeEnabled();
    expect(screen.getByText(/fresh browser identity cannot inherit/i)).toBeInTheDocument();
  });
});
