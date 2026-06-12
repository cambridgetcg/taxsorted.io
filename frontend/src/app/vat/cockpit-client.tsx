"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { VATObligationsList } from "@/components/vat";
import { api, ApiError, type ApiEntity, type ApiSubmission, type RailStatus } from "@/lib/api";
import type { VATObligation } from "@taxsorted/engine/uk/vat";
import { formatDate } from "@/lib/utils";

const KINDS = [
  { value: "business", label: "a business" },
  { value: "person", label: "a person" },
  { value: "charity", label: "a charity" },
  { value: "trust", label: "a trust" },
] as const;

export default function CockpitClient() {
  const params = useSearchParams();
  const entityId = params.get("e");
  const hmrcOutcome = params.get("hmrc");

  const [rail, setRail] = useState<RailStatus | null>(null);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    api
      .railStatus()
      .then(setRail)
      .catch(() => setApiDown(true));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">VAT, for real</h1>
          <p className="text-sm text-ink-soft">
            Your entity, your HMRC connection, your filings — receipts and all.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      {apiDown && (
        <Alert className="mb-6">
          <AlertTitle>We can&apos;t reach the api right now</AlertTitle>
          <AlertDescription>
            So we can&apos;t show your entities or talk to HMRC. Try again in a
            minute.
          </AlertDescription>
        </Alert>
      )}

      {rail && !rail.configured && (
        <Alert className="mb-6">
          <AlertTitle>Connecting to HMRC isn&apos;t switched on yet</AlertTitle>
          <AlertDescription>
            You can create entities now; connecting and filing light up the
            moment our HMRC {rail.env} credentials are in place.
          </AlertDescription>
        </Alert>
      )}

      {rail?.configured && rail.env === "sandbox" && (
        <p className="mb-6 text-sm text-ink-soft">
          <Badge variant="outline">sandbox</Badge>{" "}
          Everything here runs against HMRC&apos;s test environment — real
          rails, practice money. Production filing arrives once HMRC approves
          the app.
        </p>
      )}

      {hmrcOutcome === "connected" && (
        <Alert className="mb-6">
          <AlertTitle>Connected to HMRC</AlertTitle>
          <AlertDescription>Your returns due are loading below.</AlertDescription>
        </Alert>
      )}
      {(hmrcOutcome === "denied" || hmrcOutcome === "failed" || hmrcOutcome === "invalid") && (
        <Alert className="mb-6">
          <AlertTitle>That connection didn&apos;t complete</AlertTitle>
          <AlertDescription>
            {hmrcOutcome === "denied"
              ? "You said no on HMRC's side — nothing was shared."
              : "Something broke in the handshake. Try connecting again."}
          </AlertDescription>
        </Alert>
      )}

      {entityId ? (
        <EntityCockpit entityId={entityId} railConfigured={Boolean(rail?.configured)} />
      ) : (
        <EntityPicker />
      )}
    </div>
  );
}

function EntityPicker() {
  const router = useRouter();
  const [entities, setEntities] = useState<ApiEntity[] | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ApiEntity["kind"]>("business");
  const [vrn, setVrn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .listEntities()
      .then((r) => setEntities(r.entities))
      .catch(() => setEntities([]));
  }, []);

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      const { entity } = await api.createEntity({
        name,
        kind,
        vrn: vrn.trim() || undefined,
      });
      router.push(`/vat/?e=${entity.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Your entities</CardTitle>
          <CardDescription>
            Who is filing? Each entity keeps its own connection and receipts,
            tied to this browser — no account needed yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entities === null ? (
            <p className="text-sm text-ink-soft">Loading…</p>
          ) : entities.length === 0 ? (
            <p className="text-sm text-ink-soft">
              None yet — make your first one alongside.
            </p>
          ) : (
            <ul className="space-y-2">
              {entities.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/vat/?e=${e.id}`}
                    className="flex items-center justify-between rounded-lg border border-line p-3 hover:bg-gray-50"
                  >
                    <span>
                      <span className="font-medium text-ink">{e.name}</span>{" "}
                      <span className="text-sm text-ink-soft">({e.kind})</span>
                    </span>
                    <Badge variant={e.connected ? "success" : "outline"}>
                      {e.connected ? "connected" : "not connected"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New entity</CardTitle>
          <CardDescription>Three details. Plain ones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Cambridge TCG Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">This is…</legend>
            <div role="radiogroup" aria-label="Kind of entity" className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  role="radio"
                  aria-checked={kind === k.value}
                  onClick={() => setKind(k.value)}
                  className={
                    kind === k.value
                      ? "rounded-full bg-accent px-3 py-1 text-sm text-white"
                      : "rounded-full border border-line px-3 py-1 text-sm text-ink-soft hover:text-ink"
                  }
                >
                  {k.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="vrn">VAT number (VRN)</Label>
            <Input
              id="vrn"
              inputMode="numeric"
              value={vrn}
              onChange={(e) => setVrn(e.target.value)}
              aria-describedby="vrn-help"
            />
            <p id="vrn-help" className="text-xs text-ink-soft">
              Nine digits. You can add it later — it&apos;s needed before connecting to HMRC.
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={create} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Create entity"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function EntityCockpit({
  entityId,
  railConfigured,
}: {
  entityId: string;
  railConfigured: boolean;
}) {
  const [entity, setEntity] = useState<ApiEntity | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [obligations, setObligations] = useState<VATObligation[] | null>(null);
  const [obligationsError, setObligationsError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<ApiSubmission[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [vrnDraft, setVrnDraft] = useState("");
  const [vrnError, setVrnError] = useState<string | null>(null);
  const [vrnSaving, setVrnSaving] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { entity } = await api.getEntity(entityId);
      setEntity(entity);
      api.submissions(entityId).then((r) => setSubmissions(r.submissions)).catch(() => {});
      if (entity.connected) {
        setObligationsError(null);
        try {
          const data = await api.obligations(entityId);
          setObligations(data.obligations ?? []);
        } catch (e) {
          setObligations([]);
          setObligationsError(
            e instanceof ApiError ? e.message : "Could not reach HMRC just now."
          );
        }
      }
    } catch {
      setNotFound(true);
    } finally {
      setRefreshing(false);
    }
  }, [entityId]);

  useEffect(() => {
    load();
  }, [load]);

  if (notFound) {
    return (
      <Alert>
        <AlertTitle>We can&apos;t show this entity</AlertTitle>
        <AlertDescription>
          Entities belong to the browser that made them, so this one may be
          someone else&apos;s — or the link is stale.{" "}
          <Link className="underline" href="/vat/">
            See your own list.
          </Link>
        </AlertDescription>
      </Alert>
    );
  }
  if (!entity) return <p className="text-sm text-ink-soft">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">{entity.name}</h2>
          <p className="text-sm text-ink-soft">
            {entity.kind}
            {entity.vrn ? ` · VRN ${entity.vrn}` : " · no VRN yet"}
            {entity.connected ? ` · connected (${entity.hmrc_env})` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/vat/">All entities</Link>
          </Button>
        </div>
      </div>

      {!entity.connected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-accent" />
              Connect to HMRC
            </CardTitle>
            <CardDescription>
              You&apos;ll sign in on HMRC&apos;s own site and grant TaxSorted
              permission to see and file VAT for this entity. We never see your
              password; you can revoke the grant at HMRC any time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!entity.vrn ? (
              <div className="max-w-sm space-y-2">
                <Label htmlFor="vrn-late">First, this entity&apos;s VAT number (VRN)</Label>
                <div className="flex gap-2">
                  <Input
                    id="vrn-late"
                    inputMode="numeric"
                    placeholder="nine digits"
                    value={vrnDraft}
                    onChange={(e) => setVrnDraft(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    disabled={vrnSaving || !vrnDraft.trim()}
                    onClick={async () => {
                      setVrnSaving(true);
                      setVrnError(null);
                      try {
                        await api.setVrn(entity.id, vrnDraft.trim());
                        await load();
                      } catch (e) {
                        setVrnError(
                          e instanceof ApiError ? e.message : "Could not save — try again."
                        );
                      } finally {
                        setVrnSaving(false);
                      }
                    }}
                  >
                    {vrnSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
                {vrnError && <p className="text-sm text-red-600">{vrnError}</p>}
              </div>
            ) : railConfigured ? (
              <Button asChild>
                <a href={api.connectUrl(entity.id)}>Connect at HMRC</a>
              </Button>
            ) : (
              <p className="text-sm text-ink-soft">
                This door opens when the HMRC credentials are set. It will say
                so here, plainly.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {obligationsError && (
            <Alert>
              <AlertTitle>HMRC didn&apos;t answer</AlertTitle>
              <AlertDescription>{obligationsError}</AlertDescription>
            </Alert>
          )}
          <VATObligationsList
            obligations={obligations ?? []}
            entityId={entity.id}
            isLoading={obligations === null}
            fileHref={(periodKey) => `/vat/file/?e=${entity.id}&period=${periodKey}`}
          />
          <p className="text-sm text-ink-soft">
            Done with this connection?{" "}
            <button
              type="button"
              className="underline hover:text-ink"
              onClick={async () => {
                await api.disconnect(entity.id).catch(() => {});
                await load();
              }}
            >
              Disconnect from HMRC
            </button>{" "}
            — we revoke our access and delete the keys.
          </p>
        </>
      )}

      {submissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Receipts</CardTitle>
            <CardDescription>
              Filed means sent — each one receipted by HMRC and kept with this
              entity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {submissions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-line p-3 text-sm"
                >
                  <span>
                    Period <span className="font-medium">{s.period_key}</span>
                    {" · "}filed {formatDate(s.submitted_at)}
                  </span>
                  <span className="text-ink-soft">
                    bundle {s.receipt.formBundleNumber ?? "—"} ·{" "}
                    <Badge variant="outline">{s.hmrc_env}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
