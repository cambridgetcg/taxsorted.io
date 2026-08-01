// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EducationNotice } from "../education-notice";

describe("EducationNotice", () => {
  it("states the real sandbox boundary without denying the working practice rail", () => {
    render(<EducationNotice />);

    expect(screen.getByRole("note")).toHaveTextContent(/cannot file to live HMRC/i);
    expect(screen.getByRole("note")).toHaveTextContent(/practice flow.*HMRC's sandbox/i);
    expect(screen.getByRole("note")).not.toHaveTextContent(/does not yet submit anything/i);
  });
});
