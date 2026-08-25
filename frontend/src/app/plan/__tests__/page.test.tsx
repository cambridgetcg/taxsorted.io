// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlanPage from "../page";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function enterComparison(income: string, deductions: string, payer: RegExp) {
  fireEvent.change(screen.getByLabelText(/^total relevant income for the tax year$/i), { target: { value: income } });
  fireEvent.change(screen.getByLabelText(/complete ordinary-method deductions/i), { target: { value: deductions } });
  fireEvent.click(screen.getByRole("radio", { name: /a full 2026–27 projection through 5 april 2027/i }));
  fireEvent.click(screen.getByRole("radio", { name: /complete relevant income for one continuing trade/i }));
  fireEvent.click(screen.getByRole("radio", { name: /no basis-period transition-profit amount arises/i }));
  fireEvent.click(screen.getByRole("radio", { name: /exactly one relevant sole trade/i }));
  fireEvent.click(screen.getByRole("radio", { name: /^no rent a room receipts/i }));
  fireEvent.click(screen.getByRole("radio", { name: payer }));
  fireEvent.click(screen.getByRole("button", { name: /calculate the two routes/i }));
}

describe("Plan page", () => {
  it("puts whole lawful burden and user choice ahead of a savings score", () => {
    render(<PlanPage />);
    expect(screen.getByRole("heading", { name: /see covered lawful choices/i })).toBeInTheDocument();
    expect(screen.getByText(/tax is one line, not the whole answer/i)).toBeInTheDocument();
    expect(screen.getByText(/never hides these dimensions inside one “best option” score/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /six powers, held by the person/i })).toBeInTheDocument();
    expect(screen.getByText(/This narrow 2026–27 module calculates/i)).toHaveTextContent(
      /has earned the calculated state, not a complete whole-burden comparison/i,
    );
    const payerBoundary = screen.getByText(/No payment was made by or on behalf of an employer/i);
    expect(payerBoundary).toHaveTextContent(
      /while you were employed by it or while your spouse or civil partner was employed by it/i,
    );
    expect(payerBoundary).toHaveTextContent(/status when each payment was made/i);
  });

  it("compares allowance and ordinary-method profit without calling either advice", () => {
    render(<PlanPage />);
    enterComparison("5,000", "600", /no — i checked every relevant trading and miscellaneous-income payment/i);

    expect(screen.getByText("£4,000.00")).toBeInTheDocument();
    expect(screen.getByText("£4,400.00")).toBeInTheDocument();
    expect(screen.getByText(/trading-allowance route leaves lower projected trading profit/i)).toBeInTheDocument();
    expect(screen.getByText(/projected calculation · comparison incomplete · not a recommendation/i)).toBeInTheDocument();
    expect(screen.getByText(/final tax and cash flow/i)).toBeInTheDocument();
    expect(screen.getByText(/ruleset uk-itsa-trading-allowance\/2026-27\.2/i)).toBeInTheDocument();
    expect(screen.getByText(/evaluated source freshness on 25 August 2026/i)).toBeInTheDocument();
    expect(screen.getAllByText(/retrieved 25 August 2026/i)).toHaveLength(19);
    expect(screen.getByText(/No election, claim or return entry has been made/i)).toBeInTheDocument();
    expect(screen.getByText(/requires an election in Self Assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/31 January 2029 for 2026–27/i)).toBeInTheDocument();
    expect(screen.getByText(/late return may include the election.*general four-year claim limit/i)).toBeInTheDocument();
  });

  it("names the actual full-relief deduction below the £1,000 limit", () => {
    render(<PlanPage />);
    enterComparison("800", "100", /no — i checked every relevant trading and miscellaneous-income payment/i);

    expect(screen.getByText("£0.00")).toBeInTheDocument();
    expect(screen.getByText(/after a £800\.00 allowance deduction \(up to the £1,000\.00 limit\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/after a £1,000\.00 allowance deduction/i)).not.toBeInTheDocument();
  });

  it("keeps an unknown payer fact unknown and names the next fact", () => {
    render(<PlanPage />);
    enterComparison("5,000", "600", /i am not sure yet/i);

    expect(screen.getByText(/calculation paused · needs review/i)).toBeInTheDocument();
    expect(screen.getByText(/payer relationship is unresolved/i)).toBeInTheDocument();
    expect(screen.getByText(/check who made every payment within relevant trading or miscellaneous income/i)).toBeInTheDocument();
  });

  it("stops possible-loss cases instead of selecting the ordinary method", () => {
    render(<PlanPage />);
    enterComparison("500", "900", /no — i checked every relevant trading and miscellaneous-income payment/i);

    expect(screen.getByText(/loss and relief choices sit outside/i)).toBeInTheDocument();
    expect(screen.queryByText(/£-400/)).not.toBeInTheDocument();
  });

  it("does not read blank money as zero", () => {
    render(<PlanPage />);
    fireEvent.click(screen.getByRole("button", { name: /calculate the two routes/i }));

    expect(screen.getByText(/enter your total relevant income/i)).toBeInTheDocument();
    expect(screen.getByText(/enter the complete ordinary-method deductions/i)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/nothing was calculated/i);

    fireEvent.change(screen.getByLabelText(/^total relevant income for the tax year$/i), { target: { value: "5,000" } });
    fireEvent.change(screen.getByLabelText(/complete ordinary-method deductions/i), { target: { value: "600" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps year-to-date figures and a prematurely completed year out of whole-year results", () => {
    render(<PlanPage />);
    fireEvent.change(screen.getByLabelText(/^total relevant income for the tax year$/i), { target: { value: "800" } });
    fireEvent.change(screen.getByLabelText(/complete ordinary-method deductions/i), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("radio", { name: /only figures or facts to date/i }));
    fireEvent.click(screen.getByRole("button", { name: /calculate the two routes/i }));

    expect(screen.getByText(/year-to-date or partial-period figures/i)).toBeInTheDocument();
    expect(screen.queryByText(/£0\.00/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /completed records for the whole 2026–27 tax year/i }));
    fireEvent.click(screen.getByRole("button", { name: /calculate the two routes/i }));
    expect(screen.getByText(/2026–27 tax year has not ended/i)).toBeInTheDocument();
  });

  it("stops when figures combine more than one trade", () => {
    render(<PlanPage />);
    fireEvent.change(screen.getByLabelText(/^total relevant income for the tax year$/i), { target: { value: "12,000" } });
    fireEvent.change(screen.getByLabelText(/complete ordinary-method deductions/i), { target: { value: "2,500" } });
    fireEvent.click(screen.getByRole("radio", { name: /a full 2026–27 projection through 5 april 2027/i }));
    fireEvent.click(screen.getByRole("radio", { name: /complete relevant income for one continuing trade/i }));
    fireEvent.click(screen.getByRole("radio", { name: /another trade or miscellaneous-income source/i }));
    fireEvent.click(screen.getByRole("radio", { name: /^no rent a room receipts/i }));
    fireEvent.click(screen.getByRole("radio", { name: /no — i checked every relevant trading and miscellaneous-income payment/i }));
    fireEvent.click(screen.getByRole("button", { name: /calculate the two routes/i }));

    expect(screen.getByText(/^The supplied whole-year state includes another relevant trade/i)).toHaveTextContent(
      /total relevant income and each trade computation/i,
    );
    expect(screen.queryByText(/trading-allowance route leaves lower/i)).not.toBeInTheDocument();
  });

  it("stops when Rent a Room choices could affect trading-allowance eligibility", () => {
    render(<PlanPage />);
    fireEvent.change(screen.getByLabelText(/^total relevant income for the tax year$/i), { target: { value: "5,000" } });
    fireEvent.change(screen.getByLabelText(/complete ordinary-method deductions/i), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("radio", { name: /a full 2026–27 projection through 5 april 2027/i }));
    fireEvent.click(screen.getByRole("radio", { name: /complete relevant income for one continuing trade/i }));
    fireEvent.click(screen.getByRole("radio", { name: /no basis-period transition-profit amount arises/i }));
    fireEvent.click(screen.getByRole("radio", { name: /exactly one relevant sole trade/i }));
    fireEvent.click(screen.getByRole("radio", { name: /rent a room receipts are included/i }));
    fireEvent.click(screen.getByRole("radio", { name: /no — i checked every relevant trading and miscellaneous-income payment/i }));
    fireEvent.click(screen.getByRole("button", { name: /calculate the two routes/i }));

    expect(screen.getByText(/Rent-a-Room receipts can change whether trading-allowance relief is due/i)).toBeInTheDocument();
    expect(screen.getByText(/Establish the Rent-a-Room receipts, relief limit and any election/i)).toBeInTheDocument();
    expect(screen.queryByText(/£4,000\.00/)).not.toBeInTheDocument();
  });

  it("stops when special receipts or an incomplete income measure could distort relief", () => {
    render(<PlanPage />);
    fireEvent.change(screen.getByLabelText(/^total relevant income for the tax year$/i), { target: { value: "1,000" } });
    fireEvent.change(screen.getByLabelText(/complete ordinary-method deductions/i), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("radio", { name: /a full 2026–27 projection through 5 april 2027/i }));
    fireEvent.click(screen.getByRole("radio", { name: /a special item exists, or the measure is incomplete/i }));
    fireEvent.click(screen.getByRole("radio", { name: /exactly one relevant sole trade/i }));
    fireEvent.click(screen.getByRole("radio", { name: /^no rent a room receipts/i }));
    fireEvent.click(screen.getByRole("radio", { name: /no — i checked every relevant trading and miscellaneous-income payment/i }));
    fireEvent.click(screen.getByRole("button", { name: /calculate the two routes/i }));

    expect(screen.getByText(/may omit a required own-use value or balancing charge/i)).toBeInTheDocument();
    expect(screen.getByText(/separate any adjustment income or post-cessation receipt/i)).toBeInTheDocument();
    expect(screen.queryByText(/£0\.00/)).not.toBeInTheDocument();
  });

  it("stops before omitting basis-period transition profit", () => {
    render(<PlanPage />);
    fireEvent.change(screen.getByLabelText(/^total relevant income for the tax year$/i), { target: { value: "5,000" } });
    fireEvent.change(screen.getByLabelText(/complete ordinary-method deductions/i), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("radio", { name: /a full 2026–27 projection through 5 april 2027/i }));
    fireEvent.click(screen.getByRole("radio", { name: /complete relevant income for one continuing trade/i }));
    fireEvent.click(screen.getByRole("radio", { name: /exactly one relevant sole trade/i }));
    fireEvent.click(screen.getByRole("radio", { name: /a transition-profit amount arises, or may arise/i }));
    fireEvent.click(screen.getByRole("button", { name: /calculate the two routes/i }));

    expect(screen.getByText(/transition profit is treated as arising/i)).toBeInTheDocument();
    expect(screen.getByText(/calculate the 2026–27 transition-profit amount/i)).toBeInTheDocument();
    expect(screen.queryByText(/£4,000\.00/)).not.toBeInTheDocument();
  });

  it("never leaves a calculated result beside changed inputs", () => {
    render(<PlanPage />);
    enterComparison("5,000", "600", /no — i checked every relevant trading and miscellaneous-income payment/i);
    expect(screen.getByText(/trading-allowance route leaves lower projected trading profit/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^total relevant income for the tax year$/i), { target: { value: "5,001" } });
    expect(screen.getByText(/your calculation will appear here/i)).toBeInTheDocument();
    expect(screen.queryByText(/trading-allowance route leaves lower projected trading profit/i)).not.toBeInTheDocument();

    enterComparison("5,001", "600", /no — i checked every relevant trading and miscellaneous-income payment/i);
    fireEvent.change(screen.getByLabelText(/complete ordinary-method deductions/i), { target: { value: "601" } });
    expect(screen.getByText(/your calculation will appear here/i)).toBeInTheDocument();

    enterComparison("5,001", "601", /no — i checked every relevant trading and miscellaneous-income payment/i);
    fireEvent.click(screen.getByRole("radio", { name: /yes — at least one excluded payment/i }));
    expect(screen.getByText(/your calculation will appear here/i)).toBeInTheDocument();
  });

  it("exports the exact result and source boundary without sending it", async () => {
    render(<PlanPage />);
    enterComparison("5,000", "600", /no — i checked every relevant trading and miscellaneous-income payment/i);

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:plan-receipt");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    let downloadedName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadedName = this.download;
    });

    fireEvent.click(screen.getByRole("button", { name: /download calculation receipt/i }));

    expect(downloadedName).toBe("taxsorted-trading-allowance-receipt.json");
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:plan-receipt");
    expect(fetchSpy).not.toHaveBeenCalled();
    const blob = createObjectUrl.mock.calls[0][0] as Blob;
    const body = JSON.parse(await blob.text());
    expect(body).toMatchObject({
      schema: "taxsorted.uk.trading-allowance-calculation/2",
      input: {
        totalRelevantIncomePence: 500_000,
        ordinaryMethodDeductionsPence: 60_000,
        basisPeriodTransitionProfit: "no-amount-arises",
        factPeriodState: "full-year-projection",
        tradeScope: "single-trade-complete",
        excludedIncome: "none",
        rentARoomReceipts: "none",
        relevantIncomeBoundary: "complete-continuing-trade",
      },
      result: {
        status: "calculated",
        trust: {
          rulesetVersion: "uk-itsa-trading-allowance/2026-27.2",
          taxYearEnd: "2027-04-05",
        },
      },
    });
  });
});
