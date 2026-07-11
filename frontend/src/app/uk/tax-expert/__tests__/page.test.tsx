// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UkTaxExpertPage from "../page";

describe("UK tax expert page shell", () => {
  it("leaves the single main landmark to the shared site layout", () => {
    const { container } = render(<UkTaxExpertPage />);

    expect(container.querySelector("main")).toBeNull();
  });

  it("marks the Cantonese phrase for assistive technology", () => {
    render(<UkTaxExpertPage />);

    expect(screen.getByText("唔估、唔嚇、逐條規則畀你睇。")).toHaveAttribute(
      "lang",
      "yue-Hant",
    );
  });
});
