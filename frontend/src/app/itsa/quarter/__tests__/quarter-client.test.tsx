// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ApiEntity } from "@/lib/api";
import {
  LOCAL_BOOKS_SCHEMA,
  type LocalBooksState,
  type LocalLedger,
} from "@/lib/local-books";
import QuarterClient from "../quarter-client";

const { mockApi, mockStore, mockSubmitFlow } = vi.hoisted(() => ({
  mockApi: {
    listEntities: vi.fn(),
    businesses: vi.fn(),
  },
  mockStore: {
    state: vi.fn(),
    linkLedgerToEntity: vi.fn(),
    subscribe: vi.fn(),
  },
  mockSubmitFlow: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: mockApi }));
vi.mock("@/lib/records", () => ({ createRecordsStore: () => mockStore }));
vi.mock("@/lib/use-mounted", () => ({ useMounted: () => false }));
vi.mock("@/components/ui/breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/prep/education-notice", () => ({ EducationNotice: () => null }));
vi.mock("@/components/prep/quarter-card", () => ({ QuarterCard: () => null }));
vi.mock("@/components/prep/estimate-card", () => ({ EstimateCard: () => null }));
vi.mock("@/components/prep/submit-flow", () => ({
  SubmitFlow: (props: {
    source: string;
    entityId: string | null;
    hmrcBusinessId?: string | null;
    ledgerScopeConfirmed?: boolean;
    storeRevision?: number;
    prepareSubmission?: () => Promise<{
      records: unknown[];
      ledgerScopeConfirmed: boolean;
      storeRevision: number;
    }>;
  }) => {
    mockSubmitFlow(props);
    return (
      <div
        data-testid={`submit-${props.source}`}
        data-entity-id={props.entityId ?? ""}
        data-hmrc-business-id={props.hmrcBusinessId ?? ""}
        data-scope-confirmed={String(props.ledgerScopeConfirmed)}
      />
    );
  },
}));

function entity(id: string, name: string): ApiEntity {
  return {
    id,
    name,
    kind: "person",
    vrn: null,
    nino: `AA00000${id.slice(-1)}A`,
    created_at: "2026-07-01T00:00:00.000Z",
    connected: true,
    connections: { vat: false, itsa: true },
  };
}

function ledger(overrides: Partial<LocalLedger> = {}): LocalLedger {
  return {
    id: "ledger:self-employment:primary",
    name: "My first business",
    activity: "self-employment",
    scopeState: "needs-confirmation",
    ...overrides,
  };
}

function books(localLedger: LocalLedger, storeRevision = 1): LocalBooksState {
  return {
    schema: LOCAL_BOOKS_SCHEMA,
    storeRevision,
    ledgers: [localLedger],
    events: [],
    history: [],
    imports: [],
  };
}

function linkedLedger(
  owner: ApiEntity,
  hmrcBusinessId?: string,
  scopeState: LocalLedger["scopeState"] = "needs-confirmation"
): LocalLedger {
  return ledger({
    ownerEntityId: owner.id,
    ownerEntityName: owner.name,
    entityLinkedAt: "2026-07-15T10:00:00.000Z",
    ...(hmrcBusinessId ? { hmrcBusinessId } : {}),
    scopeState,
    ...(scopeState === "confirmed"
      ? { scopeConfirmedAt: "2026-07-15T10:05:00.000Z" }
      : {}),
  });
}

describe("QuarterClient ledger links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.linkLedgerToEntity.mockResolvedValue(undefined);
    mockStore.subscribe.mockImplementation(() => () => {});
    mockApi.businesses.mockResolvedValue({ businesses: [] });
  });

  it.each([
    ["one", [entity("entity-1", "Only person")]],
    ["more than one", [entity("entity-1", "First person"), entity("entity-2", "Second person")]],
  ])("does not silently choose when there is %s TaxSorted entity", async (_label, entities) => {
    mockStore.state.mockResolvedValue(books(ledger()));
    mockApi.listEntities.mockResolvedValue({ entities });

    render(<QuarterClient />);

    const picker = await screen.findByRole("combobox", { name: /1\. taxsorted person/i });
    expect(picker).toHaveValue("");
    expect(mockStore.linkLedgerToEntity).not.toHaveBeenCalled();
    expect(mockApi.businesses).not.toHaveBeenCalled();
    expect(screen.queryByTestId("submit-self-employment")).toBeNull();
    expect(
      screen.getAllByText(/sending is locked until this local book is explicitly linked/i).length
    ).toBeGreaterThan(0);
  });

  it("requires explicit entity and HMRC business choices, then keeps scope locked", async () => {
    const owner = entity("entity-1", "Yu");
    const afterEntity = books(linkedLedger(owner), 2);
    const afterBusiness = books(linkedLedger(owner, "business-1"), 3);
    mockStore.state
      .mockResolvedValueOnce(books(ledger()))
      .mockResolvedValueOnce(afterEntity)
      .mockResolvedValueOnce(afterBusiness);
    mockApi.listEntities.mockResolvedValue({ entities: [owner] });
    mockApi.businesses.mockResolvedValue({
      businesses: [
        {
          businessId: "business-1",
          typeOfBusiness: "self-employment",
          tradingName: "Gentle Books",
        },
      ],
    });

    render(<QuarterClient />);

    fireEvent.change(
      await screen.findByRole("combobox", { name: /1\. taxsorted person/i }),
      { target: { value: owner.id } }
    );
    await waitFor(() =>
      expect(mockStore.linkLedgerToEntity).toHaveBeenNthCalledWith(1, ledger().id, {
        entityId: owner.id,
        entityName: owner.name,
        hmrcBusinessId: undefined,
      })
    );

    const businessPicker = await screen.findByRole("combobox", { name: /2\. hmrc business/i });
    expect(businessPicker).toHaveValue("");
    expect(screen.queryByTestId("submit-self-employment")).toBeNull();

    fireEvent.change(businessPicker, { target: { value: "business-1" } });
    await waitFor(() =>
      expect(mockStore.linkLedgerToEntity).toHaveBeenNthCalledWith(2, ledger().id, {
        entityId: owner.id,
        entityName: owner.name,
        hmrcBusinessId: "business-1",
      })
    );

    const submit = await screen.findByTestId("submit-self-employment");
    expect(submit).toHaveAttribute("data-entity-id", owner.id);
    expect(submit).toHaveAttribute("data-hmrc-business-id", "business-1");
    expect(submit).toHaveAttribute("data-scope-confirmed", "false");
  });

  it("honours the persisted entity and business rather than the first returned choices", async () => {
    const first = entity("entity-1", "First person");
    const owner = entity("entity-2", "Saved person");
    mockStore.state.mockResolvedValue(
      books(linkedLedger(owner, "business-saved", "confirmed"), 7)
    );
    mockApi.listEntities.mockResolvedValue({ entities: [first, owner] });
    mockApi.businesses.mockResolvedValue({
      businesses: [
        {
          businessId: "business-first",
          typeOfBusiness: "self-employment",
          tradingName: "First business",
        },
        {
          businessId: "business-saved",
          typeOfBusiness: "self-employment",
          tradingName: "Saved business",
        },
      ],
    });

    render(<QuarterClient />);

    expect(
      await screen.findByRole("combobox", { name: /1\. taxsorted person/i })
    ).toHaveValue(owner.id);
    expect(
      await screen.findByRole("combobox", { name: /2\. hmrc business/i })
    ).toHaveValue("business-saved");
    const submit = await screen.findByTestId("submit-self-employment");
    expect(submit).toHaveAttribute("data-entity-id", owner.id);
    expect(submit).toHaveAttribute("data-hmrc-business-id", "business-saved");
    expect(submit).toHaveAttribute("data-scope-confirmed", "true");
    expect(mockApi.businesses).toHaveBeenCalledWith(owner.id);
    expect(mockApi.businesses).not.toHaveBeenCalledWith(first.id);
    expect(mockStore.linkLedgerToEntity).not.toHaveBeenCalled();
  });

  it("rechecks both persisted links and scope immediately before submission", async () => {
    const owner = entity("entity-2", "Saved person");
    const initial = books(linkedLedger(owner, "business-saved", "confirmed"), 7);
    mockStore.state.mockResolvedValue(initial);
    mockApi.listEntities.mockResolvedValue({ entities: [owner] });
    mockApi.businesses.mockResolvedValue({
      businesses: [
        {
          businessId: "business-saved",
          typeOfBusiness: "self-employment",
          tradingName: "Saved business",
        },
      ],
    });

    render(<QuarterClient />);
    await screen.findByTestId("submit-self-employment");
    const props = mockSubmitFlow.mock.calls.at(-1)?.[0] as {
      prepareSubmission: () => Promise<{
        ledgerScopeConfirmed: boolean;
        storeRevision: number;
      }>;
    };

    mockStore.state.mockResolvedValueOnce(
      books(linkedLedger(owner, "different-business", "confirmed"), 8)
    );
    const prepared = await props.prepareSubmission();

    expect(prepared.ledgerScopeConfirmed).toBe(false);
    expect(prepared.storeRevision).toBe(8);
  });

  it("shows an entity lookup failure and keeps submission locked", async () => {
    mockStore.state.mockResolvedValue(books(ledger()));
    mockApi.listEntities.mockRejectedValue(new Error("API unavailable"));

    render(<QuarterClient />);

    expect(
      await screen.findByText(/your taxsorted people are not available just now/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/sending is locked, and your local books are unchanged/i)).toBeInTheDocument();
    expect(screen.queryByTestId("submit-self-employment")).toBeNull();
  });

  it("locks stale figures immediately and reloads when the local store changes", async () => {
    const owner = entity("entity-1", "Yu");
    let notify: (() => void) | undefined;
    mockStore.subscribe.mockImplementation((listener: () => void) => {
      notify = listener;
      return () => {};
    });
    mockStore.state
      .mockResolvedValueOnce(books(linkedLedger(owner, "business-1", "confirmed"), 4))
      .mockResolvedValueOnce(books(ledger(), 5));
    mockApi.listEntities.mockResolvedValue({ entities: [owner] });
    mockApi.businesses.mockResolvedValue({
      businesses: [
        {
          businessId: "business-1",
          typeOfBusiness: "self-employment",
          tradingName: "Gentle Books",
        },
      ],
    });

    render(<QuarterClient />);
    await screen.findByTestId("submit-self-employment");

    act(() => notify?.());
    expect(screen.getByText(/loading your local books/i)).toBeInTheDocument();
    expect(screen.queryByTestId("submit-self-employment")).toBeNull();

    expect(
      await screen.findByRole("combobox", { name: /1\. taxsorted person/i })
    ).toHaveValue("");
    expect(mockStore.state).toHaveBeenCalledTimes(2);
  });

  it("shows local-book and HMRC-business failures instead of an empty or unlocked state", async () => {
    const owner = entity("entity-1", "Yu");
    mockStore.state.mockRejectedValueOnce(new Error("IndexedDB unavailable"));
    mockApi.listEntities.mockResolvedValue({ entities: [owner] });

    const firstRender = render(<QuarterClient />);
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(/loading your local books/i);
    expect(await screen.findByText(/your books are not available just now/i)).toBeInTheDocument();
    firstRender.unmount();

    mockStore.state.mockResolvedValue(books(linkedLedger(owner), 2));
    mockApi.businesses.mockRejectedValue(new Error("HMRC unavailable"));
    render(<QuarterClient />);

    expect(
      await screen.findByText(/hmrc businesses are not available just now/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("submit-self-employment")).toBeNull();
  });
});
