// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { LedgerRecord } from "@taxsorted/engine/uk/itsa";
import { QuarterTimeline } from "../quarter-timeline";

const records: LedgerRecord[] = [
  {
    id: "1",
    date: "2026-05-01",
    amount: 10000,
    kind: "income",
    category: "turnover",
    source: "self-employment",
  },
];

describe("quarter timeline", () => {
  it("highlights the current quarter and marks quarters with local records", () => {
    // 2026-07-06 falls in Q2 (6 Jul - 5 Oct) of the 2026-27 standard election;
    // the one record above (1 May 2026) falls in Q1.
    render(
      <QuarterTimeline records={records} taxYear="2026-27" election="standard" today="2026-07-06" />
    );

    const q1 = screen.getByText("Q1").closest("li");
    expect(q1).not.toBeNull();
    expect(within(q1!).getByText("records added")).toBeInTheDocument();

    const q2 = screen.getByText("Q2").closest("li");
    expect(q2).not.toBeNull();
    expect(within(q2!).getByText("current")).toBeInTheDocument();
    expect(within(q2!).getByText("no records yet")).toBeInTheDocument();
  });

  it("renders honestly with zero records — every quarter unstarted", () => {
    render(<QuarterTimeline records={[]} taxYear="2026-27" election="standard" today="2026-07-06" />);
    expect(screen.getAllByText("no records yet")).toHaveLength(4);
  });
});
