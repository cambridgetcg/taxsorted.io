import { afterEach, describe, expect, it, vi } from "vitest";
import { isLocalApp } from "../local-runtime";

afterEach(() => vi.unstubAllGlobals());

describe("local runtime identification", () => {
  it("is safe during server rendering", () => {
    vi.stubGlobal("window", undefined);
    expect(isLocalApp()).toBe(false);
  });

  it("recognises the exact bundled app origin", () => {
    vi.stubGlobal("window", { location: new URL("taxsorted://app/books/workspace/") });
    expect(isLocalApp()).toBe(true);
  });

  it.each([
    "https://taxsorted.io/",
    "http://localhost:3000/",
    "http://127.0.0.1:4318/",
    "https://app/",
    "taxsorted://other/",
    "taxsorted://app.example/",
    "file:///app/index.html",
  ])("does not identify %s as the desktop app", (url) => {
    vi.stubGlobal("window", { location: new URL(url) });
    expect(isLocalApp()).toBe(false);
  });
});
