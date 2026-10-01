import { describe, expect, it } from "vitest";
import { withBooksActivity } from "../books-navigation";

describe("books activity navigation", () => {
  it("keeps import actions and anchors when carrying property context", () => {
    expect(withBooksActivity("/books/workspace/money?start=csv#upload", "uk-property"))
      .toBe("/books/workspace/money?start=csv&activity=uk-property#upload");
  });

  it("replaces an existing activity rather than adding ambiguous duplicates", () => {
    expect(withBooksActivity("/books/workspace?activity=self-employment", "uk-property"))
      .toBe("/books/workspace?activity=uk-property");
  });

  it("does not add a default choice to a context-free link", () => {
    expect(withBooksActivity("/books/workspace/money?start=manual"))
      .toBe("/books/workspace/money?start=manual");
  });
});
