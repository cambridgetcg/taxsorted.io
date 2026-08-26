// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BooksWorkspacePage from "../page";
import BooksMoneyPage from "../money/page";
import BooksBusinessPage from "../business/page";
import BooksTaxPage from "../tax/page";

vi.mock("@/app/itsa/records/records-client", () => ({
  default: ({ entry, view }: { entry: string; view: string }) => (
    <p data-testid="records-client">
      {entry}:{view}
    </p>
  ),
}));

describe("Books workspace view pages", () => {
  it.each([
    ["today", BooksWorkspacePage],
    ["money", BooksMoneyPage],
    ["business", BooksBusinessPage],
    ["tax", BooksTaxPage],
  ] as const)("opens the %s view", (view, Page) => {
    render(<Page />);

    expect(screen.getByTestId("records-client")).toHaveTextContent(`books:${view}`);
  });
});
