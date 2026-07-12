// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonalThresholdCheck } from "../PersonalThresholdCheck";

function enter(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function choose(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /map my thresholds/i }));
}

describe("personal ANI threshold check", () => {
  it("keeps a blank income unknown", () => {
    render(<PersonalThresholdCheck />);
    expect(screen.getByLabelText(/total taxable income/i)).toBeRequired();
    submit();

    expect(screen.getAllByText(/enter your expected total taxable income/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("£0.00")).toBeNull();
  });

  it("shows the shared £100k consequences from one calculation", () => {
    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "112000");
    choose(/tax-free childcare household-partner situation/i, "none");
    choose(/^non-disabled children to check for tax-free childcare$/i, "1");
    submit();

    expect(screen.getByText("£112,000.00")).toBeInTheDocument();
    expect(screen.getByText("£6,000.00 lost")).toBeInTheDocument();
    expect(screen.getByText("Income test fails")).toBeInTheDocument();
    expect(screen.getByText(/fails the condition for up to £2,000.00 of potential annual top-up/i)).toBeInTheDocument();
    expect(screen.getByText(/distance back to £100,000: £12,000.00/i)).toBeInTheDocument();
  });

  it("grosses up a net pension payment and restores the exact boundary", () => {
    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "112000");
    enter(/pension paid net/i, "9600");
    choose(/tax-free childcare household-partner situation/i, "none");
    choose(/^non-disabled children to check for tax-free childcare$/i, "1");
    submit();

    expect(screen.getByText("£100,000.00")).toBeInTheDocument();
    expect(screen.getByText("£12,570.00 remains")).toBeInTheDocument();
    expect(screen.getByText("Income test passes")).toBeInTheDocument();
  });

  it("does not turn an unknown partner into zero", () => {
    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "90000");
    choose(/tax-free childcare household-partner situation/i, "unknown");
    choose(/^non-disabled children to check for tax-free childcare$/i, "1");
    submit();

    expect(screen.getByText("Household partner ANI needed")).toBeInTheDocument();
    expect(screen.getByText(/blank stays unknown/i)).toBeInTheDocument();
  });

  it("keeps non-disabled and disabled childcare counts mutually exclusive", () => {
    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "90000");
    choose(/tax-free childcare household-partner situation/i, "none");
    choose(/^disabled children \(do not include them above\)$/i, "1");
    submit();

    expect(screen.getByText("Income test passes")).toBeInTheDocument();
    expect(screen.getByText(/£4,000.00 is the maximum potential annual top-up/i)).toBeInTheDocument();
  });

  it("explains every HICBC status instead of implying an estimate exists", () => {
    const { unmount } = render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "70000");
    submit();
    expect(screen.getByText(/add the children covered by full-year child benefit payments/i)).toBeInTheDocument();
    unmount();

    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "70000");
    choose(/hicbc partner situation/i, "known");
    enter(/hicbc partner's expected ani/i, "70000");
    choose(/children covered by payments received/i, "1");
    submit();
    expect(screen.getByText(/supplied ANIs are equal and above £60,000/i)).toBeInTheDocument();
  });

  it("accepts child counts above the old six-child selector cap", () => {
    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "80000");
    choose(/hicbc partner situation/i, "none");
    choose(/children covered by payments received/i, "7");
    submit();

    expect(screen.getByText(/^100% ·/i)).toBeInTheDocument();
  });

  it("distinguishes an explicit zero-payment HICBC check from skipping it", () => {
    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "70000");
    enter(/children covered by payments received/i, "0");
    submit();

    expect(screen.getByText("No charge on these facts")).toBeInTheDocument();
    expect(screen.getByText(/no HICBC is due on the supplied full-year payment/i)).toBeInTheDocument();
  });

  it("requires the relevant statutory partner answer only when a family check is requested", () => {
    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "90000");
    enter(/^non-disabled children to check for tax-free childcare$/i, "1");
    submit();

    expect(screen.getAllByText(/choose the childcare household-partner situation/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Income test passes")).toBeNull();
  });

  it("stops when Child Benefit was received by someone outside the modelled pair", () => {
    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "70000");
    enter(/children covered by payments received/i, "1");
    choose(/hicbc partner situation/i, "none");
    choose(/who received the child benefit payments/i, "someone-else");
    submit();

    expect(screen.getAllByText(/cannot model a claimant outside/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("£70,000.00")).toBeNull();
  });

  it("keeps unrelated validation errors until each field is corrected", () => {
    render(<PersonalThresholdCheck />);
    enter(/pension paid net/i, "-1");
    enter(/children covered by payments received/i, "51");
    submit();

    enter(/total taxable income/i, "90000");
    expect(screen.getByLabelText(/pension paid net/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/children covered by payments received/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("shows exact sub-penny ANI when it changes the childcare boundary", () => {
    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "100000.03");
    enter(/gift aid paid net/i, "0.02");
    choose(/tax-free childcare household-partner situation/i, "none");
    enter(/^non-disabled children to check for tax-free childcare$/i, "1");
    submit();

    expect(screen.getByText("£100,000.005")).toBeInTheDocument();
    expect(screen.getByText("Income test fails")).toBeInTheDocument();
    expect(screen.getByText(/practical distance back to £100,000: £0.01/i)).toBeInTheDocument();
  });

  it("accepts exact quarter-penny partner ANI without rounding the household across £100,000", () => {
    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "90000");
    enter(/^non-disabled children to check for tax-free childcare$/i, "1");
    choose(/tax-free childcare household-partner situation/i, "known");
    enter(/childcare partner's expected ani/i, "100000.0025");
    submit();

    expect(screen.getByText("Income test fails")).toBeInTheDocument();
    expect(screen.getByText(/fails the condition for up to £2,000.00/i)).toBeInTheDocument();
  });

  it("preserves dependent errors while a check remains requested and clears them at zero", () => {
    render(<PersonalThresholdCheck />);
    enter(/total taxable income/i, "90000");
    enter(/^non-disabled children to check for tax-free childcare$/i, "1");
    submit();

    const partnerMode = screen.getByLabelText(/tax-free childcare household-partner situation/i);
    expect(partnerMode).toHaveAttribute("aria-invalid", "true");
    enter(/^non-disabled children to check for tax-free childcare$/i, "2");
    expect(partnerMode).toHaveAttribute("aria-invalid", "true");
    enter(/^non-disabled children to check for tax-free childcare$/i, "0");
    expect(partnerMode).not.toHaveAttribute("aria-invalid");
  });
});
