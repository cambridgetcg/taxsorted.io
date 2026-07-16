// @vitest-environment jsdom

// The account page. The api client AND @simplewebauthn/browser are mocked
// wholesale — no real network, no real WebAuthn ceremony. Every api mock here
// is a shape the real api actually sends back for that scenario (pinned to
// lib/api.ts's response types); every ceremony mock is what
// startRegistration/startAuthentication resolve to on success.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountClient from "../account-client";

const { mockApi, MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
      public detail?: unknown
    ) {
      super(message);
    }
  }
  return {
    MockApiError,
    mockApi: {
      getAccount: vi.fn(),
      registerStart: vi.fn(),
      registerFinish: vi.fn(),
      loginStart: vi.fn(),
      loginFinish: vi.fn(),
      adopt: vi.fn(),
      recover: vi.fn(),
      logout: vi.fn(),
      deletePasskey: vi.fn(),
      regenerateCodes: vi.fn(),
    },
  };
});

vi.mock("@/lib/api", () => ({
  api: mockApi,
  ApiError: MockApiError,
}));

const webauthn = vi.hoisted(() => ({
  browserSupportsWebAuthn: vi.fn(() => true),
  browserSupportsWebAuthnAutofill: vi.fn(() => Promise.resolve(false)),
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

vi.mock("@simplewebauthn/browser", () => webauthn);

/** The ten codes a real new-account / regenerate response carries. */
function tenCodes(prefix = "CODE") {
  return Array.from({ length: 10 }, (_, i) => `${prefix}-${i + 1}`);
}

function signedInFull(overrides: Record<string, unknown> = {}) {
  return {
    signedIn: true as const,
    account: { id: "u1", name: "TaxSorted user" },
    mfa: true,
    passkeys: [
      {
        id: "p1",
        nickname: "MacBook",
        createdAt: "2026-01-01T00:00:00.000Z",
        lastUsedAt: "2026-02-01T00:00:00.000Z",
      },
      { id: "p2", nickname: null, createdAt: "2026-01-03T00:00:00.000Z", lastUsedAt: null },
    ],
    recoveryCodesLeft: 7,
    claimableEntities: 0,
    ...overrides,
  };
}

describe("AccountClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    webauthn.browserSupportsWebAuthn.mockReturnValue(true);
    webauthn.browserSupportsWebAuthnAutofill.mockResolvedValue(false);
    // Default world: a fresh anonymous visitor.
    mockApi.getAccount.mockResolvedValue({ signedIn: false });
  });

  it("signed-out: renders the three doors when the browser supports passkeys", async () => {
    render(<AccountClient />);

    expect(
      await screen.findByRole("button", { name: /create an account/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with a passkey/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /use a recovery code/i })).toBeInTheDocument();
    // The always-shown adoption note on the create screen.
    expect(
      screen.getByText(/will be saved into your new account/i)
    ).toBeInTheDocument();
  });

  it("unsupported browser: hides the passkey doors and shows an honest line, keeps the recovery door", async () => {
    webauthn.browserSupportsWebAuthn.mockReturnValue(false);

    render(<AccountClient />);

    expect(await screen.findByText(/can't do passkeys/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create an account/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /sign in with a passkey/i })).toBeNull();
    // A recovery code needs no WebAuthn, so its door stays open.
    expect(screen.getByRole("button", { name: /use a recovery code/i })).toBeInTheDocument();
  });

  it("create flow: registerStart -> startRegistration -> registerFinish, lands on show-codes-once with a dismissal gate", async () => {
    const opts = { challenge: "reg-challenge" };
    mockApi.registerStart.mockResolvedValue(opts);
    webauthn.startRegistration.mockResolvedValue({ id: "cred-1" });
    mockApi.registerFinish.mockResolvedValue({
      signedIn: true,
      account: { id: "u1", name: "TaxSorted user" },
      adoptedEntities: 2,
      recoveryCodes: tenCodes(),
    });

    render(<AccountClient />);
    fireEvent.click(await screen.findByRole("button", { name: /create an account/i }));

    // The ten codes are shown exactly once…
    expect(await screen.findByText("CODE-1")).toBeInTheDocument();
    expect(screen.getByText("CODE-10")).toBeInTheDocument();
    expect(screen.getByText(/shown exactly once/i)).toBeInTheDocument();

    // …the ceremony ran in the right order with the right payloads…
    expect(mockApi.registerStart).toHaveBeenCalled();
    expect(webauthn.startRegistration).toHaveBeenCalledWith({ optionsJSON: opts });
    expect(mockApi.registerFinish).toHaveBeenCalledWith({ response: { id: "cred-1" } });

    // …and the normal signed-in view is unreachable until the codes are dismissed.
    expect(screen.queryByRole("button", { name: /^sign out$/i })).toBeNull();

    mockApi.getAccount.mockResolvedValue(signedInFull());
    fireEvent.click(screen.getByRole("button", { name: /i've saved them/i }));
    expect(await screen.findByRole("button", { name: /^sign out$/i })).toBeInTheDocument();
  });

  it("sign-in flow: calls loginStart -> startAuthentication -> loginFinish", async () => {
    const opts = { challenge: "auth-challenge" };
    mockApi.loginStart.mockResolvedValue(opts);
    webauthn.startAuthentication.mockResolvedValue({ id: "cred-1" });
    mockApi.loginFinish.mockResolvedValue({
      signedIn: true,
      account: { id: "u1", name: "TaxSorted user" },
      claimableEntities: 0,
    });

    render(<AccountClient />);
    fireEvent.click(await screen.findByRole("button", { name: /sign in with a passkey/i }));

    await waitFor(() =>
      expect(mockApi.loginFinish).toHaveBeenCalledWith({ response: { id: "cred-1" } })
    );
    expect(mockApi.loginStart).toHaveBeenCalled();
    // The manual button never opts into browser autofill.
    expect(webauthn.startAuthentication).toHaveBeenCalledWith({ optionsJSON: opts });
  });

  it("recovery flow: submit -> recover -> lands on the add-a-passkey-now nudge", async () => {
    mockApi.recover.mockResolvedValue({
      signedIn: true,
      mfa: false,
      addPasskeyNow: true,
      recoveryCodesLeft: 9,
    });

    render(<AccountClient />);
    const input = await screen.findByLabelText(/recovery code/i);
    fireEvent.change(input, { target: { value: "MY-CODE-123" } });

    // The refresh after recover lands a restricted (mfa:false) session.
    mockApi.getAccount.mockResolvedValue(
      signedInFull({ mfa: false, passkeys: [], recoveryCodesLeft: 9 })
    );
    fireEvent.click(screen.getByRole("button", { name: /use a recovery code/i }));

    expect(await screen.findByText(/add a passkey now/i)).toBeInTheDocument();
    expect(mockApi.recover).toHaveBeenCalledWith("MY-CODE-123");
  });

  it("signed-in: renders the passkey list, codes-left and both sign-out doors, no claim door when nothing is claimable", async () => {
    mockApi.getAccount.mockResolvedValue(signedInFull());

    render(<AccountClient />);

    expect(await screen.findByText("MacBook")).toBeInTheDocument();
    expect(screen.getByText(/unnamed/i)).toBeInTheDocument();
    expect(screen.getByText(/7 codes left/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign out$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out everywhere/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^remove$/i })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /keep this browser's businesses/i })).toBeNull();
  });

  it("recovery session: shows the banner + add-passkey door, hides every [passkey] door", async () => {
    mockApi.getAccount.mockResolvedValue(
      signedInFull({
        mfa: false,
        passkeys: [
          { id: "p1", nickname: "Old phone", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: null },
        ],
        recoveryCodesLeft: 5,
        claimableEntities: 3,
      })
    );

    render(<AccountClient />);

    expect(await screen.findByText(/signed in with a recovery code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add a passkey/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign out$/i })).toBeInTheDocument();
    // [passkey] doors are hidden even though there are claimable entities.
    expect(screen.queryByRole("button", { name: /^remove$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /regenerate/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /keep this browser's businesses/i })).toBeNull();
  });

  it("claim door: shown when claimableEntities>0 and calls adopt", async () => {
    mockApi.getAccount.mockResolvedValue(signedInFull({ claimableEntities: 2 }));
    mockApi.adopt.mockResolvedValue({ adopted: 2 });

    render(<AccountClient />);
    fireEvent.click(
      await screen.findByRole("button", { name: /keep this browser's businesses/i })
    );

    await waitFor(() => expect(mockApi.adopt).toHaveBeenCalled());
  });

  it("remove: surfaces the last_passkey 422 message verbatim", async () => {
    const message = "This is your only passkey. Add another before removing it.";
    mockApi.getAccount.mockResolvedValue(
      signedInFull({
        passkeys: [
          { id: "p1", nickname: "Only one", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: null },
        ],
      })
    );
    mockApi.deletePasskey.mockRejectedValue(new MockApiError(422, "last_passkey", message));

    render(<AccountClient />);
    fireEvent.click(await screen.findByRole("button", { name: /^remove$/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("add-passkey: surfaces a 409 passkey_already_registered plainly", async () => {
    const message = "This passkey is already on your account.";
    mockApi.getAccount.mockResolvedValue(signedInFull());
    mockApi.registerStart.mockResolvedValue({ challenge: "c" });
    webauthn.startRegistration.mockResolvedValue({ id: "cred-2" });
    mockApi.registerFinish.mockRejectedValue(
      new MockApiError(409, "passkey_already_registered", message)
    );

    render(<AccountClient />);
    fireEvent.click(await screen.findByRole("button", { name: /add a passkey/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("regenerate: lands on the show-codes-once screen", async () => {
    mockApi.getAccount.mockResolvedValue(signedInFull({ recoveryCodesLeft: 3 }));
    mockApi.regenerateCodes.mockResolvedValue({ recoveryCodes: tenCodes("NEW") });

    render(<AccountClient />);
    fireEvent.click(await screen.findByRole("button", { name: /regenerate/i }));

    expect(await screen.findByText("NEW-1")).toBeInTheDocument();
    expect(screen.getByText(/shown exactly once/i)).toBeInTheDocument();
  });
});
