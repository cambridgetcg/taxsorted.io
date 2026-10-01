// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocalAppBoundary } from "../local-app-boundary";
import { LocalAppNotice } from "../local-app-notice";

const runtime = vi.hoisted(() => ({ pathname: "/", local: false }));
vi.mock("next/navigation", () => ({ usePathname: () => runtime.pathname }));
vi.mock("@/lib/local-runtime", () => ({ isLocalApp: () => runtime.local }));

afterEach(() => {
  runtime.pathname = "/";
  runtime.local = false;
});

describe("offline app navigation", () => {
  it.each(["/account/", "/account/recover/", "/dashboard/", "/vat/"])("replaces %s with an explanation and working local destinations", (pathname) => {
    runtime.local = true;
    runtime.pathname = pathname;
    render(<LocalAppBoundary><p>Online form</p></LocalAppBoundary>);
    expect(screen.queryByText("Online form")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /needs an online connection/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open money records/i })).toHaveAttribute("href", "/books/workspace");
  });

  it.each(["/books/workspace/", "/file/", "/itsa/quarter/", "/checkup/", "/passport/", "/accounting/"])("keeps %s available locally", (pathname) => {
    runtime.local = true;
    runtime.pathname = pathname;
    render(<LocalAppBoundary><p>Local work</p></LocalAppBoundary>);
    expect(screen.getByText("Local work")).toBeInTheDocument();
  });

  it("keeps the account route available on the website", () => {
    runtime.pathname = "/account/";
    render(<LocalAppBoundary><p>Account form</p></LocalAppBoundary>);
    expect(screen.getByText("Account form")).toBeInTheDocument();
  });

  it("links straight to recovery as well as the desktop data explanation", () => {
    runtime.local = true;
    render(<LocalAppNotice />);
    expect(screen.getByText("Local app · offline")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back up or restore" })).toHaveAttribute("href", "/backups");
    expect(screen.getByRole("link", { name: /your data & app limits/i })).toHaveAttribute("href", "/download#your-data");
  });

  it("does not claim website sessions are offline", () => {
    render(<LocalAppNotice />);
    expect(screen.queryByLabelText("Local app status")).not.toBeInTheDocument();
  });
});
