"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VATReturnForm } from "@/components/vat";
import { api, ApiError, type ApiSubmission, type RailStatus } from "@/lib/api";
import type { VATObligation, VATReturnData } from "@taxsorted/engine/uk/vat";
import { formatDate, formatPeriod } from "@/lib/utils";

export default function FileClient() {
  const params = useSearchParams();
  const entityId = params.get("e");
  const periodKey = params.get("period");

  const [obligation, setObligation] = useState<VATObligation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ApiSubmission | null>(null);
  const [rail, setRail] = useState<RailStatus | null>(null);

  useEffect(() => {
    api.railStatus().then(setRail).catch(() => {});
  }, []);

  useEffect(() => {
    if (!entityId || !periodKey) return;
    api
      .obligations(entityId)
      .then((data) => {
        const match = (data.obligations ?? []).find((o) => o.periodKey === periodKey);
        if (match) setObligation(match);
        else setLoadError("That period isn't open for this entity — check the cockpit.");
      })
      .catch((e) =>
        setLoadError(e instanceof ApiError ? e.message : "Could not reach the api.")
      )
      .finally(() => setLoading(false));
  }, [entityId, periodKey]);

  if (!entityId || !periodKey) {
    return (
      <Shell entityId={entityId}>
        <Alert>
          <AlertTitle>Nothing to file here</AlertTitle>
          <AlertDescription>
            Pick a period from your{" "}
            <Link className="underline" href={entityId ? `/vat/?e=${entityId}` : "/vat/"}>
              cockpit
            </Link>
            .
          </AlertDescription>
        </Alert>
      </Shell>
    );
  }

  const fileIt = async (data: VATReturnData) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await api.fileReturn(entityId, data);
      setReceipt(result.submission);
    } catch (e) {
      if (e instanceof ApiError && e.code === "already_filed") {
        setSubmitError("This period is already filed — its receipt is on the cockpit.");
      } else if (e instanceof ApiError) {
        setSubmitError(e.message);
      } else {
        setSubmitError(
          "We can't confirm whether it went through. Go back to the cockpit and refresh before trying again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell entityId={entityId}>
      {receipt ? (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-6 w-6" />
              Filed. Receipted.
            </CardTitle>
            <CardDescription>
              HMRC accepted the return for {formatPeriod(obligation?.start ?? "", obligation?.end ?? "")}.
              The receipt is saved with this entity — you&apos;ll find it on the cockpit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ReceiptLine label="Period" value={receipt.period_key} />
            <ReceiptLine label="Processed" value={receipt.receipt.processingDate ? formatDate(receipt.receipt.processingDate) : "—"} />
            <ReceiptLine label="Form bundle" value={receipt.receipt.formBundleNumber ?? "—"} />
            {receipt.receipt.chargeRefNumber && (
              <ReceiptLine label="Charge reference" value={receipt.receipt.chargeRefNumber} />
            )}
            <div className="pt-2">
              <Badge variant="outline">{receipt.hmrc_env}</Badge>
              {receipt.hmrc_env === "sandbox" && (
                <span className="ml-2 text-ink-soft">
                  practice money — the production rail arrives with HMRC&apos;s approval
                </span>
              )}
            </div>
            <div className="pt-4">
              <Button asChild>
                <Link href={`/vat/?e=${entityId}`}>Back to the cockpit</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <p className="text-sm text-ink-soft">Loading the period…</p>
      ) : loadError ? (
        <Alert>
          <AlertTitle>Can&apos;t file just now</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : obligation ? (
        <>
          {rail?.env === "sandbox" && (
            <p className="mb-6 text-sm text-ink-soft">
              <Badge variant="outline">sandbox</Badge>{" "}
              This files to HMRC&apos;s test environment — the real motions,
              practice money.
            </p>
          )}
          {submitError && (
            <Alert className="mb-6">
              <AlertTitle>Not filed</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <VATReturnForm
            entityId={entityId}
            obligation={obligation}
            onSubmit={fileIt}
            isSubmitting={submitting}
            mode="file"
            cancelHref={`/vat/?e=${entityId}`}
          />
        </>
      ) : null}
    </Shell>
  );
}

function Shell({ entityId, children }: { entityId: string | null; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">File a VAT return</h1>
          <p className="text-sm text-ink-soft">
            Review, consent, file — a receipt or nothing.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={entityId ? `/vat/?e=${entityId}` : "/vat/"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cockpit
          </Link>
        </Button>
      </div>
      {children}
    </div>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line pb-1 last:border-0">
      <span className="text-ink-soft">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
