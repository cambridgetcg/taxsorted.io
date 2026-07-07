"use client";

// i18n: deferred to M2 — plain English for launch
//
// Your account, in plain words. An account here is nothing but a set of
// passkeys — no email, no password, no personal details (see the M2 plan).
// This page only ever shows doors that actually open: a browser that can't do
// passkeys is told so honestly instead of being handed buttons that fail; a
// recovery session (signed in with a one-time code, no passkey asserted) is
// offered only its forward path — add a passkey, or sign out — because every
// other management door needs a real passkey behind it and would 403.
//
// Every WebAuthn ceremony (register, authenticate) runs in the browser via
// @simplewebauthn/browser; this component never touches a credential itself —
// the authenticator does, and the api verifies. A user cancelling the OS
// prompt (AbortError / NotAllowedError) is a choice, not an error, so it is
// swallowed silently rather than shown as a red banner.

import { useCallback, useEffect, useState } from "react";
import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { api, type GetAccountResponse } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUkDateTime } from "@/lib/format";
import { useMounted } from "@/lib/use-mounted";

// A cancelled ceremony is silence, not an error. @simplewebauthn wraps the
// browser's DOMException — the original name rides along on `.cause`, and an
// aborted conditional-UI flow surfaces as its own WebAuthnError code.
const SILENT_NAMES = new Set(["AbortError", "NotAllowedError"]);
function isCeremonyCancel(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; code?: string; cause?: { name?: string } };
  if (e.code === "ERROR_CEREMONY_ABORTED") return true;
  if (e.name && SILENT_NAMES.has(e.name)) return true;
  if (e.cause?.name && SILENT_NAMES.has(e.cause.name)) return true;
  return false;
}

// The api's error messages are already user-ready plain words — surface them
// as-is; only invent copy when something threw that isn't an Error at all.
function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

const UNRECOVERABLE =
  "If you lose every passkey and every recovery code, your account can't be recovered — there's no email reset.";

export default function AccountClient() {
  const [account, setAccount] = useState<GetAccountResponse | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [copied, setCopied] = useState(false);

  // browserSupportsWebAuthn reads `window`, so gate it on the post-mount render
  // (useMounted's server snapshot keeps the static HTML deterministic — no
  // setState-in-effect, no hydration mismatch).
  const mounted = useMounted();
  const supported = mounted && browserSupportsWebAuthn();

  const refresh = useCallback(async () => {
    try {
      setAccount(await api.getAccount());
    } catch (err) {
      setError(describeError(err));
    }
  }, []);

  // First read of who-am-I. setState lives in the async continuation (never the
  // effect body), the house pattern the lint rule enforces.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getAccount();
        if (!cancelled) setAccount(res);
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Conditional-UI autofill: once we know this is a signed-out, passkey-capable
  // browser, quietly arm the autocomplete="username webauthn" input so the OS
  // can offer a passkey inline. Anything going wrong here degrades in silence —
  // the explicit buttons are always available.
  useEffect(() => {
    if (!supported) return;
    if (account?.signedIn !== false) return;
    let cancelled = false;
    (async () => {
      try {
        if (!(await browserSupportsWebAuthnAutofill())) return;
        const optionsJSON = await api.loginStart();
        const response = await startAuthentication({ optionsJSON, useBrowserAutofill: true });
        if (cancelled) return;
        await api.loginFinish({ response });
        if (cancelled) return;
        await refresh();
      } catch {
        // Silent by design — autofill is a bonus, never a requirement.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported, account?.signedIn, refresh]);

  // register: shared by "create an account" (signed-out) and "add a passkey"
  // (signed-in / recovery-upgrade). A brand-new account comes back carrying its
  // ten one-time codes — that's the show-them-once screen; every other flavour
  // just refreshes into the updated view.
  async function handleRegister() {
    setError(null);
    setBusy(true);
    try {
      const optionsJSON = await api.registerStart();
      const response = await startRegistration({ optionsJSON });
      const res = await api.registerFinish({ response });
      if ("recoveryCodes" in res) {
        setCodes(res.recoveryCodes);
      } else {
        await refresh();
      }
    } catch (err) {
      if (!isCeremonyCancel(err)) setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn() {
    setError(null);
    setBusy(true);
    try {
      const optionsJSON = await api.loginStart();
      const response = await startAuthentication({ optionsJSON });
      await api.loginFinish({ response });
      await refresh();
    } catch (err) {
      if (!isCeremonyCancel(err)) setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.recover(recoveryInput);
      setRecoveryInput("");
      // A successful recovery lands a restricted (mfa:false) session — refresh
      // drops us onto the "add a passkey now" nudge, the only way forward.
      await refresh();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(credentialId: string) {
    setError(null);
    setBusy(true);
    try {
      await api.deletePasskey(credentialId);
      // Removing the passkey that opened this session signs it out — the next
      // getAccount simply reads signed-out, which the refresh renders honestly.
      await refresh();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.regenerateCodes();
      setCodes(res.recoveryCodes);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleAdopt() {
    setError(null);
    setBusy(true);
    try {
      await api.adopt();
      await refresh();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout(everywhere: boolean) {
    setError(null);
    setBusy(true);
    try {
      await api.logout(everywhere ? { everywhere: true } : {});
      await refresh();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDismissCodes() {
    setCodes(null);
    setCopied(false);
    setError(null);
    await refresh();
  }

  async function handleCopyCodes() {
    if (!codes) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(codes.join("\n"));
        setCopied(true);
      }
    } catch {
      // Clipboard denied — the codes are on screen to copy by hand.
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Your account</h1>
        <p className="mt-1 text-sm text-ink-soft">
          An account here is just your passkeys — no email, no password, no personal details.
        </p>
      </div>

      {codes ? (
        <ShowCodesOnce
          codes={codes}
          copied={copied}
          onCopy={handleCopyCodes}
          onDismiss={handleDismissCodes}
        />
      ) : (
        <>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {account === null ? (
            // A failed first load already shows its error above — don't also
            // claim to still be loading.
            error ? null : <p className="text-sm text-ink-soft">Loading your account…</p>
          ) : account.signedIn === false ? (
            <SignedOut
              supported={supported}
              busy={busy}
              recoveryInput={recoveryInput}
              onRecoveryInput={setRecoveryInput}
              onCreate={handleRegister}
              onSignIn={handleSignIn}
              onRecover={handleRecover}
            />
          ) : account.mfa ? (
            <SignedIn
              account={account}
              busy={busy}
              onAddPasskey={handleRegister}
              onRemove={handleRemove}
              onRegenerate={handleRegenerate}
              onAdopt={handleAdopt}
              onLogout={handleLogout}
            />
          ) : (
            <RecoverySession busy={busy} onAddPasskey={handleRegister} onLogout={handleLogout} />
          )}
        </>
      )}
    </div>
  );
}

function ShowCodesOnce({
  codes,
  copied,
  onCopy,
  onDismiss,
}: {
  codes: string[];
  copied: boolean;
  onCopy: () => void;
  onDismiss: () => void;
}) {
  return (
    <Card className="border-accent/40">
      <CardHeader>
        <CardTitle>Save your recovery codes</CardTitle>
        <CardDescription>
          These are shown exactly once. Store them somewhere safe — a password manager, or on
          paper. They&apos;re your only way back in if you ever lose your passkeys.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid grid-cols-1 gap-2 font-mono text-sm sm:grid-cols-2">
          {codes.map((c) => (
            <li key={c} className="rounded bg-gray-50 px-3 py-1.5 text-ink">
              {c}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onCopy}>
            Copy codes
          </Button>
          {copied ? <span className="text-sm text-green-700">Copied</span> : null}
        </div>
        <p className="text-sm text-ink-soft">
          Each code works exactly once. {UNRECOVERABLE}
        </p>
        <Button onClick={onDismiss}>I&apos;ve saved them</Button>
      </CardContent>
    </Card>
  );
}

function SignedOut({
  supported,
  busy,
  recoveryInput,
  onRecoveryInput,
  onCreate,
  onSignIn,
  onRecover,
}: {
  supported: boolean;
  busy: boolean;
  recoveryInput: string;
  onRecoveryInput: (v: string) => void;
  onCreate: () => void;
  onSignIn: () => void;
  onRecover: (e: React.FormEvent) => void;
}) {
  return (
    <div className="space-y-6">
      {!supported ? (
        <Alert>
          <AlertDescription>
            This browser can&apos;t do passkeys, so creating an account and signing in aren&apos;t
            available here. You can still use a recovery code below, or open TaxSorted in a recent
            version of Safari, Chrome, Edge or Firefox.
          </AlertDescription>
        </Alert>
      ) : null}

      {supported ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Create an account</CardTitle>
              <CardDescription>
                Your device&apos;s face, fingerprint or PIN becomes your key. No password, no email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-ink-soft">
                Creating an account claims this browser&apos;s tax entities into it.
              </p>
              <Button onClick={onCreate} disabled={busy}>
                Create an account
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sign in with a passkey</CardTitle>
              <CardDescription>
                Already have an account? Your authenticator will pick the right passkey.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="passkey-username">Passkey</Label>
              <Input
                id="passkey-username"
                name="username"
                autoComplete="username webauthn"
                placeholder="Choose your passkey"
              />
              <Button onClick={onSignIn} disabled={busy}>
                Sign in with a passkey
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Use a recovery code</CardTitle>
          <CardDescription>
            Lost your passkeys? Sign in with one of your one-time recovery codes, then add a new
            passkey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onRecover} className="space-y-3">
            <Label htmlFor="recovery-code">Recovery code</Label>
            <Input
              id="recovery-code"
              value={recoveryInput}
              onChange={(e) => onRecoveryInput(e.target.value)}
              placeholder="xxxx-xxxx-xxxx"
            />
            <Button type="submit" disabled={busy || !recoveryInput.trim()}>
              Use a recovery code
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PasskeyRow({
  nickname,
  createdAt,
  lastUsedAt,
  onRemove,
  busy,
}: {
  nickname: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  onRemove?: () => void;
  busy: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div>
        <p className="font-medium text-ink">{nickname || "Unnamed passkey"}</p>
        <p className="text-xs text-ink-soft">
          Added {formatUkDateTime(createdAt)} · Last used{" "}
          {lastUsedAt ? formatUkDateTime(lastUsedAt) : "never"}
        </p>
      </div>
      {onRemove ? (
        <Button variant="outline" size="sm" onClick={onRemove} disabled={busy}>
          Remove
        </Button>
      ) : null}
    </li>
  );
}

function SignedIn({
  account,
  busy,
  onAddPasskey,
  onRemove,
  onRegenerate,
  onAdopt,
  onLogout,
}: {
  account: Extract<GetAccountResponse, { signedIn: true }>;
  busy: boolean;
  onAddPasskey: () => void;
  onRemove: (id: string) => void;
  onRegenerate: () => void;
  onAdopt: () => void;
  onLogout: (everywhere: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{account.account.name}</CardTitle>
          <CardDescription>Signed in with a passkey.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your passkeys</CardTitle>
          <CardDescription>The keys that open this account. Add more than one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {account.passkeys.map((pk) => (
              <PasskeyRow
                key={pk.id}
                nickname={pk.nickname}
                createdAt={pk.createdAt}
                lastUsedAt={pk.lastUsedAt}
                onRemove={() => onRemove(pk.id)}
                busy={busy}
              />
            ))}
          </ul>
          <Button onClick={onAddPasskey} disabled={busy}>
            Add a passkey
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recovery codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-ink">{account.recoveryCodesLeft} codes left</p>
          <p className="text-xs text-ink-soft">{UNRECOVERABLE}</p>
          <Button variant="outline" onClick={onRegenerate} disabled={busy}>
            Regenerate codes
          </Button>
        </CardContent>
      </Card>

      {account.claimableEntities > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Unclaimed entities on this browser</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-ink-soft">
              This browser has {account.claimableEntities} tax{" "}
              {account.claimableEntities === 1 ? "entity" : "entities"} that aren&apos;t in your
              account yet.
            </p>
            <Button onClick={onAdopt} disabled={busy}>
              Keep this browser&apos;s entities in your account
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => onLogout(false)} disabled={busy}>
          Sign out
        </Button>
        <Button variant="ghost" onClick={() => onLogout(true)} disabled={busy}>
          Sign out everywhere
        </Button>
      </div>
    </div>
  );
}

function RecoverySession({
  busy,
  onAddPasskey,
  onLogout,
}: {
  busy: boolean;
  onAddPasskey: () => void;
  onLogout: (everywhere: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <AlertTitle>You signed in with a recovery code</AlertTitle>
        <AlertDescription>
          Add a passkey now to get back to a full, secure sign-in. Until you do, the only doors open
          are adding a passkey and signing out.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Add a passkey</CardTitle>
          <CardDescription>This upgrades you back to a full sign-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onAddPasskey} disabled={busy}>
            Add a passkey
          </Button>
        </CardContent>
      </Card>

      <div>
        <Button variant="outline" onClick={() => onLogout(false)} disabled={busy}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
