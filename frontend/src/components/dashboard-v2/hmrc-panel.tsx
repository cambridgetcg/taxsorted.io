"use client";

// i18n: deferred to M2 — plain English for launch
//
// The HMRC connect panel: first ITSA bytes through our own pipes, real
// sandbox OAuth, no fake states. Every branch below is honest about what it
// actually knows — an unreachable api never shows a stale "connected" view,
// and a connected view never shows sample obligations. The permanent SANDBOX
// badge lives in the card header, outside every conditional branch, so it is
// visible on every render path while this rail exists (production filing
// unlocks with HMRC recognition — this whole rail 404s in prod, same door
// pattern as the api's test-user mint).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { TaxYear } from "@taxsorted/engine/uk/itsa";
import {
  api,
  ApiError,
  type ApiEntity,
  type GetAccountResponse,
  type ItsaObligation,
  type ItsaStatusResponse,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatUkDate } from "@/lib/format";

export interface HmrcPanelProps {
  /** Which tax year to ask HMRC's ITSA status endpoint about. */
  taxYear: TaxYear;
}

type PanelStatus = "loading" | "unreachable" | "need-nino" | "not-connected" | "connected";

const RECOGNITION_LINE =
  "Real filing switches on once HMRC approves us — we're working on that in the open.";

/** Every card in this panel wears the same header shape: title, permanent
    SANDBOX badge, and the recognition line — so the badge can never be
    missing from a render path just because a branch changed. */
function PanelShell({
  title,
  notice,
  accountNote,
  children,
}: {
  title: string;
  /** One-shot OAuth outcome line (from ?hmrc=), shown above everything. */
  notice?: React.ReactNode;
  /** The account-truth line — see AccountNote below. */
  accountNote?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          {title}
          <Badge variant="outline">SANDBOX</Badge>
        </CardTitle>
        <CardDescription>
          {RECOGNITION_LINE} Until then everything runs in the sandbox — HMRC&apos;s practice
          system.{" "}
          <Link href="/learn/mtd-income-tax" className="underline hover:text-ink">
            How MTD for Income Tax works
          </Link>
          {" · "}
          <Link href="/learn/gov/what-we-send-hmrc" className="underline hover:text-ink">
            What we&apos;re legally required to send
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {notice}
        {accountNote}
        {children}
      </CardContent>
    </Card>
  );
}

/** The account-truth line under the header — silent until getAccount answers
    (never a flash of the wrong claim), then one of two honest states: an
    anonymous browser is told plainly its entity is tied to this browser (not
    lost, just local) with a door to create an account; a signed-in browser
    that still has unclaimed entities is pointed at the claim door on
    /account. A signed-in browser with nothing left to claim says nothing
    further here — the account page itself is where that detail lives. */
function AccountNote({ account }: { account: GetAccountResponse | null }) {
  if (!account) return null;
  if (!account.signedIn) {
    return (
      <p className="text-xs text-ink-soft">
        Tied to this browser — no account needed yet.{" "}
        <Link href="/account" className="underline hover:text-ink">
          Create an account
        </Link>{" "}
        to keep it if you switch devices.
      </p>
    );
  }
  if (account.claimableEntities > 0) {
    return (
      <p className="text-xs text-ink-soft">
        Keep this browser&apos;s businesses in your account <span aria-hidden="true">→</span>{" "}
        <Link href="/account" className="underline hover:text-ink">
          Account
        </Link>
      </p>
    );
  }
  return null;
}

/** Honest phrasing for each ?hmrc= outcome the api's OAuth callback lands
    back with — same vocabulary the VAT cockpit uses for the same dance. */
function outcomeText(outcome: string): { tone: "success" | "error"; text: string } | null {
  if (outcome === "connected") {
    return {
      tone: "success",
      text: "HMRC confirmed the connection — your sandbox data is below.",
    };
  }
  if (outcome === "denied") {
    return { tone: "error", text: "You said no on HMRC's side — nothing was shared." };
  }
  if (outcome === "failed" || outcome === "invalid") {
    return {
      tone: "error",
      text: "That connection didn't complete — something broke in the handshake. Try again.",
    };
  }
  return null;
}

export function HmrcPanel({ taxYear }: HmrcPanelProps) {
  const [status, setStatus] = useState<PanelStatus>("loading");
  const [entity, setEntity] = useState<ApiEntity | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [account, setAccount] = useState<GetAccountResponse | null>(null);
  // The api's OAuth callback lands on /dashboard?hmrc=<outcome> for the
  // ITSA rail. Read it exactly once (lazy initializer; null during the
  // build-time prerender where no URL exists — harmless, since no state
  // that renders the notice exists before the client bootstraps anyway).
  const [hmrcOutcome] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URL(window.location.href).searchParams.get("hmrc")
  );

  const [ninoDraft, setNinoDraft] = useState("");
  const [ninoSaving, setNinoSaving] = useState(false);
  const [ninoError, setNinoError] = useState<string | null>(null);

  const [itsaStatus, setItsaStatus] = useState<ItsaStatusResponse | null>(null);
  const [itsaStatusError, setItsaStatusError] = useState<string | null>(null);
  const [obligations, setObligations] = useState<ItsaObligation[] | null>(null);
  const [obligationsError, setObligationsError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  // Clean ?hmrc= off the address bar (pure external-system work) so a
  // refresh or a shared link never replays a stale one-shot claim.
  useEffect(() => {
    if (!hmrcOutcome) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("hmrc")) return;
    url.searchParams.delete("hmrc");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [hmrcOutcome]);

  const loadConnected = useCallback(
    (entityId: string) => {
      setItsaStatus(null);
      setItsaStatusError(null);
      api
        .itsaStatus(entityId, taxYear)
        .then(setItsaStatus)
        .catch((e) => {
          setItsaStatus(null);
          setItsaStatusError(
            e instanceof ApiError ? e.message : "HMRC didn't answer just now."
          );
        });

      setObligations(null);
      setObligationsError(null);
      api
        .itsaObligations(entityId)
        .then((r) => setObligations(r.obligations ?? []))
        .catch((e) => {
          // Leave obligations null on error — an empty array would read as
          // "HMRC confirmed there are none," which isn't what happened.
          setObligations(null);
          setObligationsError(
            e instanceof ApiError ? e.message : "HMRC didn't answer just now."
          );
        });
    },
    [taxYear]
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus("loading");
      try {
        const { entities } = await api.listEntities();
        if (cancelled) return;

        // An ITSA entity carries a NINO — a VAT-only entity (VRN, no NINO)
        // from /vat is never reused here; connections are per-rail in the
        // vault (unique entity+rail) but this panel keeps ITSA on its own
        // entity anyway for a clean separation. A bare "Self
        // Assessment" person is this panel's own earlier creation waiting
        // for its NINO — reuse it, never mint a duplicate per visit.
        let picked =
          entities.find((e) => e.nino) ??
          entities.find((e) => e.kind === "person" && e.name === "Self Assessment") ??
          null;
        if (!picked) {
          const created = await api.createEntity({ name: "Self Assessment", kind: "person" });
          picked = created.entity;
        }
        if (cancelled) return;

        setEntity(picked);
        if (!picked.nino) {
          setStatus("need-nino");
          return;
        }
        // ITSA-specific: a VAT-only connection on this entity must not read
        // as connected here — that's the collision bug's user-visible half.
        if (!picked.connections.itsa) {
          setStatus("not-connected");
          return;
        }
        setStatus("connected");
        loadConnected(picked.id);
      } catch {
        if (!cancelled) setStatus("unreachable");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [reloadToken, loadConnected]);

  // Account awareness is a secondary, non-blocking signal — whether this
  // browser's entities are anonymous or already tied to a signed-in
  // account. Unlike the bootstrap above, a failure here stays silent: the
  // connect/status rail works identically either way, this only decides
  // whether AccountNote has anything honest to say.
  useEffect(() => {
    let cancelled = false;
    api
      .getAccount()
      .then((res) => {
        if (!cancelled) setAccount(res);
      })
      .catch(() => {
        // Silent by design — see comment above.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveNino = async () => {
    if (!entity) return;
    setNinoSaving(true);
    setNinoError(null);
    try {
      const { entity: updated } = await api.setNino(entity.id, ninoDraft.trim());
      setEntity(updated);
      setNinoDraft("");
      if (updated.connections.itsa) {
        setStatus("connected");
        loadConnected(updated.id);
      } else {
        setStatus("not-connected");
      }
    } catch (e) {
      setNinoError(e instanceof ApiError ? e.message : "Could not save — try again.");
    } finally {
      setNinoSaving(false);
    }
  };

  const disconnect = async () => {
    if (!entity) return;
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      await api.disconnect(entity.id);
      setItsaStatus(null);
      setObligations(null);
      setStatus("not-connected");
    } catch (e) {
      // No fake "disconnected" claim, and no silently-stale "connected" view
      // either: say what happened, then re-check the server for the truth.
      setDisconnectError(
        e instanceof ApiError ? e.message : "Could not disconnect — try again."
      );
      setReloadToken((t) => t + 1);
    } finally {
      setDisconnecting(false);
    }
  };

  const outcome = hmrcOutcome ? outcomeText(hmrcOutcome) : null;
  const notice = outcome ? (
    <p
      className={
        outcome.tone === "success" ? "text-sm font-medium text-green-700" : "text-sm text-red-600"
      }
    >
      {outcome.text}
    </p>
  ) : undefined;

  if (status === "loading") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            Connect to HMRC
            <Badge variant="outline">SANDBOX</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-soft">Checking your connection…</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "unreachable") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Connect to HMRC</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-base text-ink-soft">
            Our server may be asleep — it naps between visits. Nothing is lost. Give it a
            moment, then retry.
          </p>
          <Button variant="outline" size="sm" onClick={() => setReloadToken((t) => t + 1)}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "need-nino" && entity) {
    return (
      <PanelShell
        title="Connect to HMRC"
        notice={notice}
        accountNote={<AccountNote account={account} />}
      >
        <p className="text-base text-ink-soft">
          First, your National Insurance number (NINO) — HMRC uses it to identify you for
          Income Tax.
        </p>
        <div className="flex max-w-sm gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="nino">National Insurance number</Label>
            <Input
              id="nino"
              placeholder="two letters, six digits, one letter"
              value={ninoDraft}
              onChange={(e) => setNinoDraft(e.target.value)}
            />
          </div>
          <Button
            className="mt-6"
            variant="outline"
            disabled={ninoSaving || !ninoDraft.trim()}
            onClick={saveNino}
          >
            {ninoSaving ? "Saving…" : "Save"}
          </Button>
        </div>
        {ninoError && <p className="text-sm text-red-600">{ninoError}</p>}
      </PanelShell>
    );
  }

  if (status === "not-connected" && entity) {
    return (
      <PanelShell
        title="Connect to HMRC"
        notice={notice}
        accountNote={<AccountNote account={account} />}
      >
        <a href={api.connectUrl(entity.id, "itsa")} className={buttonVariants({})}>
          Connect to HMRC (sandbox demo)
        </a>
      </PanelShell>
    );
  }

  if (status === "connected" && entity) {
    return (
      <PanelShell
        title="Connected to HMRC"
        notice={notice}
        accountNote={<AccountNote account={account} />}
      >
        {itsaStatusError ? (
          <Alert>
            <AlertTitle>HMRC didn&apos;t answer</AlertTitle>
            <AlertDescription>{itsaStatusError}</AlertDescription>
          </Alert>
        ) : itsaStatus ? (
          <p className="text-sm text-ink">
            ITSA status for {itsaStatus.taxYear}:{" "}
            <Badge variant="info">{itsaStatus.status ?? "unknown"}</Badge>{" "}
            <span className="text-xs text-ink-soft">sandbox source</span>
          </p>
        ) : (
          <p className="text-sm text-ink-soft">Loading your ITSA status…</p>
        )}

        {obligationsError ? (
          <Alert>
            <AlertTitle>HMRC didn&apos;t answer</AlertTitle>
            <AlertDescription>{obligationsError}</AlertDescription>
          </Alert>
        ) : obligations === null ? (
          <p className="text-base text-ink-soft">Checking what you must send…</p>
        ) : obligations.length === 0 ? (
          <p className="text-base text-ink-soft">
            HMRC&apos;s practice system lists nothing for you to send right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {obligations.map((o, i) => (
              <li
                key={`${o.periodStart}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm"
              >
                <span>
                  {formatUkDate(o.periodStart)} – {formatUkDate(o.periodEnd)}
                </span>
                <span className="text-ink-soft">Due {formatUkDate(o.dueDate)}</span>
                <Badge variant={o.status === "fulfilled" ? "success" : "warning"}>
                  {o.status}
                </Badge>
                <span className="text-xs text-ink-soft">sandbox source</span>
              </li>
            ))}
          </ul>
        )}

        {disconnectError && <p className="text-sm text-red-600">{disconnectError}</p>}
        <button
          type="button"
          className="text-sm underline hover:text-ink"
          disabled={disconnecting}
          onClick={disconnect}
        >
          {disconnecting ? "Disconnecting…" : "Disconnect from HMRC"}
        </button>
      </PanelShell>
    );
  }

  return null;
}
