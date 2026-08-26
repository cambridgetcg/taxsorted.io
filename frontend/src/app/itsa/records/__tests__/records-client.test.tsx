// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecordsClient from "../records-client";
import { emptyLocalBooks, eventFromRecord } from "@/lib/local-books";

const store = vi.hoisted(() => ({
  state: vi.fn(),
  subscribe: vi.fn(() => () => undefined),
  add: vi.fn(),
  importMany: vi.fn(),
  review: vi.fn(),
  confirmLedger: vi.fn(),
  reopenLedger: vi.fn(),
  exportJson: vi.fn(),
  exportCsv: vi.fn(),
}));

vi.mock("@/lib/records", () => ({
  createRecordsStore: () => store,
}));

beforeEach(() => {
  vi.clearAllMocks();
  const state = emptyLocalBooks({
    replicaId: "mtd-records-client-test",
    createdAt: "2026-08-20T12:00:00.000Z",
  });
  state.storeRevision = 1;
  state.ledgers = [
    {
      id: "ledger:self-employment:primary",
      name: "My first business",
      activity: "self-employment",
      scopeState: "needs-confirmation",
    },
  ];
  state.events = [
    eventFromRecord(
      {
        date: "2026-08-20",
        amount: 420,
        kind: "expense",
        category: "adminCosts",
        source: "self-employment",
      },
      {
        id: "event-1",
        ledgerId: "ledger:self-employment:primary",
        now: "2026-08-20T12:00:00.000Z",
        reviewState: "needs-review",
        origin: { kind: "manual" },
        contentDigest: "digest-1",
      },
    ),
  ];
  store.state.mockResolvedValue(state);
});

describe("MTD records entry", () => {
  it("keeps the shared composite workflow while Books uses separate views", async () => {
    render(<RecordsClient />);

    expect(await screen.findByRole("heading", { name: "Starter Books" })).toBeInTheDocument();
    const toCheck = screen.getByRole("heading", { name: "To check" });
    const businessCheck = screen.getByRole("heading", {
      name: "Do all the records in each group belong to one business?",
    });
    const backup = screen.getByRole("heading", { name: "Checked records and backup" });
    expect(toCheck).toBeInTheDocument();
    expect(businessCheck).toBeInTheDocument();
    expect(backup).toBeInTheDocument();
    expect(toCheck.compareDocumentPosition(businessCheck) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(businessCheck.compareDocumentPosition(backup) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Books sections" })).not.toBeInTheDocument();
  });
});
