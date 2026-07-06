// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StandStrip } from "../stand-strip";

describe("stand strip", () => {
  it("renders the next deadline countdown from engine quarters", () => {
    // Fixed "today" injected for determinism — 2026-07-06 is the first day
    // of Q2 under the standard election (Q1 ended 5 Jul), but Q1's deadline
    // (7 August 2026) is still ahead, so it's the next deadline: 32 days away.
    render(<StandStrip taxYear="2026-27" election="standard" today="2026-07-06" />);
    expect(screen.getByText(/7 August 2026/)).toBeInTheDocument();
    expect(screen.getByText(/32 days left/)).toBeInTheDocument();
  });

  it("says 'due today' when today IS a deadline", () => {
    render(<StandStrip taxYear="2026-27" election="standard" today="2026-08-07" />);
    expect(screen.getByText(/7 August 2026/)).toBeInTheDocument();
    expect(screen.getByText(/due today/)).toBeInTheDocument();
  });

  it("rolls to the next quarter's deadline the day after one passes", () => {
    // 2026-08-08 is the day after Q1's deadline — Q2's (7 Nov) takes over: 91 days.
    render(<StandStrip taxYear="2026-27" election="standard" today="2026-08-08" />);
    expect(screen.getByText(/7 November 2026/)).toBeInTheDocument();
    expect(screen.getByText(/91 days left/)).toBeInTheDocument();
  });

  it("owns up when all four deadlines have passed", () => {
    // 2027-05-08 is the day after Q4's deadline (7 May 2027) — nothing left to count down to.
    render(<StandStrip taxYear="2026-27" election="standard" today="2027-05-08" />);
    expect(
      screen.getByText(/all four quarterly deadlines for 2026-27 have passed/i)
    ).toBeInTheDocument();
  });

  it("shows the 2026-27 no-points penalty text", () => {
    render(<StandStrip taxYear="2026-27" election="standard" today="2026-07-06" />);
    expect(
      screen.getByText(/no penalty points for late quarterly updates in 2026-27/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/late.payment penalties still apply/i)).toBeInTheDocument();
  });

  it("owns up to there being no stored eligibility verdict", () => {
    render(<StandStrip taxYear="2026-27" election="standard" today="2026-07-06" />);
    expect(
      screen.getByRole("link", { name: /check in 60 seconds/i })
    ).toHaveAttribute("href", "/itsa/am-i-in");
  });
});
