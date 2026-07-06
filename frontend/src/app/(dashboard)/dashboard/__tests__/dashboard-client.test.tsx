// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRecordsStore } from "@/lib/records";
import DashboardClient from "../dashboard-client";

describe("dashboard client", () => {
  it("shows the honest outside-periods copy, never a stuck loading state, when today is past the tax year", async () => {
    // 2027-06-01 is after 2026-27's last quarterly period (ended 5 Apr 2027):
    // quarterForDate returns null FOREVER from here on — that must read as
    // "outside the quarterly periods", not as "Loading…" for eternity.
    render(<DashboardClient today="2027-06-01" store={createRecordsStore(new Map())} />);
    expect(
      await screen.findByText(/falls outside the 2026-27 quarterly periods/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/loading your quarter/i)).toBeNull();
  });
});
