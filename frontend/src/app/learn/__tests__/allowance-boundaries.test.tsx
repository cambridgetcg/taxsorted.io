// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import SelfEmployedGuide from "../self-employed/page";
import LandlordGuide from "../for-landlords/page";
import IncomeTaxGuide from "../income-tax/page";

describe("allowance learning boundaries", () => {
  it("keeps records and reporting exceptions visible for self-employment", () => {
    const { container } = render(<SelfEmployedGuide />);

    expect(container).toHaveTextContent(/may not need to tell HMRC.*must still keep records/i);
    expect(container).toHaveTextContent(/keep records of the income either way/i);
    expect(container).not.toHaveTextContent(/no return, no records/i);
  });

  it("keeps the property allowance exclusions and record duty visible", () => {
    const { container } = render(<LandlordGuide />);

    expect(container).toHaveTextContent(/usually do not need to tell HMRC.*must keep records/i);
    expect(container).toHaveTextContent(/keep records either way/i);
    expect(container).not.toHaveTextContent(/nothing to declare and nothing to optimise/i);
  });

  it("does not turn small-income allowances into a blanket no-declaration promise", () => {
    const { container } = render(<IncomeTaxGuide />);

    expect(container).toHaveTextContent(/may not need to tell HMRC.*records must still be kept/i);
    expect(container).not.toHaveTextContent(/tax-free without declaring/i);
  });
});
