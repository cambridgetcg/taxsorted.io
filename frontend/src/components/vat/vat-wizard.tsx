"use client";

import { useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { VATReturnData, VATObligation } from "@taxsorted/engine/uk/vat";
import { prepareVatReturn } from "@taxsorted/engine/uk/vat";

interface VatWizardProps {
  obligation: VATObligation;
  onConfirm: (data: VATReturnData) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Guided filing: two plain questions instead of nine boxes. The engine does the maths,
 * leads with the answer, and shows the official figures underneath for anyone who wants them.
 */
export function VatWizard({ obligation, onConfirm, isSubmitting = false }: VatWizardProps) {
  const [sales, setSales] = useState("");
  const [costs, setCosts] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const salesNum = Math.max(0, parseFloat(sales) || 0);
  const costsNum = Math.max(0, parseFloat(costs) || 0);
  const answered = sales !== "" || costs !== "";

  // Everything below is derived — never typed. Assumes standard-rate (20%) sales & costs.
  const { data, summary } = prepareVatReturn(
    [
      { kind: "sale", net: salesNum, rate: "standard" },
      { kind: "purchase", net: costsNum, rate: "standard" },
    ],
    { periodKey: obligation.periodKey, periodEnd: obligation.end, finalised: confirmed },
  );

  const tone =
    summary.position === "repayment"
      ? "border-green-200 bg-green-50"
      : summary.position === "payable"
        ? "border-blue-200 bg-blue-50"
        : "border-gray-200 bg-gray-50";

  return (
    <div className="space-y-6">
      {/* Two plain questions */}
      <Card>
        <CardHeader>
          <CardTitle>Let&apos;s work out your VAT</CardTitle>
          <CardDescription>
            Two questions for {summary.dueDate ? `the period ending ${formatDate(obligation.end)}` : "this period"}.
            We&apos;ll do the maths.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1">
            <Label htmlFor="wiz-sales" className="text-sm font-medium text-gray-900">
              How much did you sell this period, before VAT?
            </Label>
            <p id="wiz-sales-help" className="text-sm text-gray-500">
              Your total sales, not counting the VAT you added.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
              <Input
                id="wiz-sales"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={sales}
                onChange={(e) => setSales(e.target.value)}
                aria-describedby="wiz-sales-help"
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="wiz-costs" className="text-sm font-medium text-gray-900">
              How much did you spend on business costs, before VAT?
            </Label>
            <p id="wiz-costs-help" className="text-sm text-gray-500">
              Purchases you can reclaim the VAT on.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
              <Input
                id="wiz-costs"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={costs}
                onChange={(e) => setCosts(e.target.value)}
                aria-describedby="wiz-costs-help"
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>

          <p className="flex items-start gap-2 text-sm text-gray-500">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
            <span>
              This assumes the standard 20% rate. Selling at other rates, or EU trade? Switch to
              &ldquo;Enter the 9 boxes&rdquo; for full control.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* The answer, the moment they've typed something */}
      {answered && (
        <>
          <div className={cn("rounded-lg border p-5", tone)}>
            <h2 className="text-xl font-semibold text-gray-900">{summary.headline}</h2>
            <p className="mt-1 text-sm text-gray-600">{summary.detail}</p>
            {summary.dueDate && (
              <p className="mt-1 text-sm text-gray-600">
                Due {formatDate(summary.dueDate)}
                {typeof summary.daysRemaining === "number" &&
                  summary.daysRemaining >= 0 &&
                  ` · ${summary.daysRemaining} day${summary.daysRemaining === 1 ? "" : "s"} left`}
              </p>
            )}
          </div>

          {/* The official figures, derived and read-only, for anyone who wants them */}
          <details className="rounded-lg border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              See the 9 official figures
            </summary>
            <dl className="mt-3 divide-y divide-gray-100">
              {summary.boxes.map((b) => (
                <div key={b.box} className="flex items-center justify-between py-2 text-sm">
                  <dt className="text-gray-600">
                    <span className="text-gray-400">Box {b.box}</span> · {b.label}
                  </dt>
                  <dd className="font-medium text-gray-900">£{b.value.toLocaleString("en-GB")}</dd>
                </div>
              ))}
            </dl>
          </details>

          {/* Confirm — plain, honest */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="wiz-confirm"
                checked={confirmed}
                onCheckedChange={(c) => setConfirmed(c === true)}
              />
              <div className="flex-1">
                <Label htmlFor="wiz-confirm" className="text-sm font-medium text-gray-900">
                  These figures look right.
                </Label>
                <p className="mt-1 text-sm text-gray-500">
                  This prepares your return — it doesn&apos;t send it to HMRC yet.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => onConfirm(data)}
              disabled={isSubmitting || !confirmed}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing…
                </>
              ) : (
                "Prepare return"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
