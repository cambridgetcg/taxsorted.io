"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import { cn, formatDate, formatPeriod } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { VATReturnData, VATObligation } from "@/types/vat";
import { calculateVATReturnTotals, validateVATReturnData } from "@/lib/hmrc/vat-api";
import { summarizeReturn, explainReturn } from "@/lib/vat";

interface VATReturnFormProps {
  entityId: string;
  obligation: VATObligation;
  onSubmit: (data: VATReturnData) => Promise<void>;
  isSubmitting?: boolean;
}

// Each box: a plain-English label + one line of help, shown as visible text (not a hover tooltip).
interface BoxDefinition {
  box: number;
  label: string;
  help: string;
  decimal: boolean;
  calculated?: boolean;
}

const BOX_DEFINITIONS: Record<string, BoxDefinition> = {
  vatDueSales: {
    box: 1,
    label: "VAT you charged on sales",
    help: "The VAT you added to what you sold this period.",
    decimal: true,
  },
  vatDueAcquisitions: {
    box: 2,
    label: "VAT on goods bought from the EU",
    help: "Only if you move goods to/from the EU under the Northern Ireland rules. Otherwise leave at 0.",
    decimal: true,
  },
  totalVatDue: {
    box: 3,
    label: "Total VAT you charged",
    help: "Box 1 + Box 2. Worked out for you.",
    decimal: true,
    calculated: true,
  },
  vatReclaimedCurrPeriod: {
    box: 4,
    label: "VAT you can claim back on costs",
    help: "The VAT you paid on business purchases and can reclaim.",
    decimal: true,
  },
  netVatDue: {
    box: 5,
    label: "What you owe HMRC (or they owe you)",
    help: "The difference between Box 3 and Box 4. Worked out for you.",
    decimal: true,
    calculated: true,
  },
  totalValueSalesExVAT: {
    box: 6,
    label: "Total sales, before VAT",
    help: "Everything you sold this period, not counting the VAT.",
    decimal: false,
  },
  totalValuePurchasesExVAT: {
    box: 7,
    label: "Total purchases, before VAT",
    help: "Everything you bought for the business, not counting the VAT.",
    decimal: false,
  },
  totalValueGoodsSuppliedExVAT: {
    box: 8,
    label: "Goods sold to the EU, before VAT",
    help: "Only under the Northern Ireland rules. Otherwise leave at 0.",
    decimal: false,
  },
  totalAcquisitionsExVAT: {
    box: 9,
    label: "Goods bought from the EU, before VAT",
    help: "Only under the Northern Ireland rules. Otherwise leave at 0.",
    decimal: false,
  },
};

type BoxKey =
  | "vatDueSales"
  | "vatDueAcquisitions"
  | "totalVatDue"
  | "vatReclaimedCurrPeriod"
  | "netVatDue"
  | "totalValueSalesExVAT"
  | "totalValuePurchasesExVAT"
  | "totalValueGoodsSuppliedExVAT"
  | "totalAcquisitionsExVAT";

export function VATReturnForm({
  entityId,
  obligation,
  onSubmit,
  isSubmitting = false,
}: VATReturnFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<Partial<VATReturnData>>({
    periodKey: obligation.periodKey,
    vatDueSales: 0,
    vatDueAcquisitions: 0,
    totalVatDue: 0,
    vatReclaimedCurrPeriod: 0,
    netVatDue: 0,
    totalValueSalesExVAT: 0,
    totalValuePurchasesExVAT: 0,
    totalValueGoodsSuppliedExVAT: 0,
    totalAcquisitionsExVAT: 0,
    finalised: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Boxes 3 and 5 are derived, never typed.
  useEffect(() => {
    const { totalVatDue, netVatDue } = calculateVATReturnTotals(formData);
    setFormData((prev) => ({ ...prev, totalVatDue, netVatDue }));
  }, [
    formData.vatDueSales,
    formData.vatDueAcquisitions,
    formData.vatReclaimedCurrPeriod,
  ]);

  // The plain answer + the calm "what this means" brief — straight from the engine.
  const summary = summarizeReturn(formData as VATReturnData, obligation.end);
  const explanation = explainReturn(summary);

  const handleInputChange = (field: BoxKey, value: string) => {
    const def = BOX_DEFINITIONS[field];
    let numValue: number;
    if (def.decimal) {
      numValue = Math.round((parseFloat(value) || 0) * 100) / 100;
    } else {
      numValue = Math.round(parseFloat(value) || 0);
    }
    setFormData((prev) => ({ ...prev, [field]: numValue }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    const validation = validateVATReturnData(formData as VATReturnData);
    if (!validation.valid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach((err) => {
        // Lead the error with the plain box label.
        const def = BOX_DEFINITIONS[err.field];
        errorMap[err.field] = def ? `${def.label}: ${err.message}` : err.message;
      });
      setErrors(errorMap);
      return;
    }
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    try {
      await onSubmit(formData as VATReturnData);
    } catch {
      setErrors({ submit: "Something went wrong preparing your return. Please try again." });
    }
  };

  const periodDescription = formatPeriod(obligation.start, obligation.end);

  const headlineTone =
    summary.position === "repayment"
      ? "border-green-200 bg-green-50"
      : summary.position === "payable"
        ? "border-blue-200 bg-blue-50"
        : "border-gray-200 bg-gray-50";

  return (
    <div className="space-y-6">
      {/* Title */}
      <Card>
        <CardHeader>
          <CardTitle>Prepare your VAT return</CardTitle>
          <CardDescription>
            {periodDescription} · due {formatDate(obligation.due)}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* The plain answer, leading everything */}
      <div className={cn("rounded-lg border p-5", headlineTone)}>
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

      {/* What this means — reassurance in plain words */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-blue-500" />
            What this means
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-gray-700">{explanation.whatItMeans}</p>
          <ExplainList title="What you need to do" items={explanation.youNeedTo} />
          <ExplainList title="What you can skip" items={explanation.youCanSkip} muted />
          <ExplainList title="How to pay less" items={explanation.howToOptimise} muted />
        </CardContent>
      </Card>

      {/* The figures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The figures</CardTitle>
          <CardDescription>
            Enter what you charged and what you can claim back. The totals work themselves out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* VAT you charged */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">VAT you charged on sales</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["vatDueSales", "totalVatDue"] as BoxKey[]).map((field) => (
                <FormField
                  key={field}
                  field={field}
                  value={formData[field] as number}
                  onChange={handleInputChange}
                  error={errors[field]}
                  disabled={BOX_DEFINITIONS[field].calculated}
                />
              ))}
            </div>
          </div>

          {/* VAT you can claim back */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">VAT you can claim back on costs</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                field="vatReclaimedCurrPeriod"
                value={formData.vatReclaimedCurrPeriod as number}
                onChange={handleInputChange}
                error={errors.vatReclaimedCurrPeriod}
              />
            </div>
          </div>

          {/* Net */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
            <FormField
              field="netVatDue"
              value={formData.netVatDue as number}
              onChange={handleInputChange}
              error={errors.netVatDue}
              disabled
              highlight
            />
          </div>

          {/* Totals */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Totals, before VAT</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["totalValueSalesExVAT", "totalValuePurchasesExVAT"] as BoxKey[]).map((field) => (
                <FormField
                  key={field}
                  field={field}
                  value={formData[field] as number}
                  onChange={handleInputChange}
                  error={errors[field]}
                />
              ))}
            </div>
          </div>

          {/* EU trade — hidden by default, since most UK businesses don't need it */}
          <details className="rounded-lg border border-gray-200 p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              EU trade — most UK businesses leave these at 0
            </summary>
            <p className="mt-2 text-sm text-gray-500">
              Only fill these in if you move goods between Northern Ireland and the EU.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                ["vatDueAcquisitions", "totalValueGoodsSuppliedExVAT", "totalAcquisitionsExVAT"] as BoxKey[]
              ).map((field) => (
                <FormField
                  key={field}
                  field={field}
                  value={formData[field] as number}
                  onChange={handleInputChange}
                  error={errors[field]}
                />
              ))}
            </div>
          </details>

          {/* Confirm — plain, honest, no fear */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="finalised"
                checked={formData.finalised}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, finalised: checked === true }))
                }
              />
              <div className="flex-1">
                <Label htmlFor="finalised" className="text-sm font-medium text-gray-900">
                  Tick to confirm these figures are right.
                </Label>
                <p className="mt-1 text-sm text-gray-500">
                  This prepares your return — it doesn&apos;t send it to HMRC yet.
                </p>
                {errors.finalised && (
                  <p className="mt-1 text-sm text-red-600">{errors.finalised}</p>
                )}
              </div>
            </div>
          </div>

          {errors.submit && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Couldn&apos;t prepare the return</AlertTitle>
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {showConfirmation && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Ready to prepare</AlertTitle>
              <AlertDescription>
                {summary.headline} for {periodDescription}. Click &ldquo;Prepare return&rdquo;
                again to save these figures. Nothing is sent to HMRC yet.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/vat/${entityId}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.finalised}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing…
                </>
              ) : showConfirmation ? (
                "Prepare return"
              ) : (
                "Review figures"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExplainList({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-gray-900">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item, i) => (
          <li key={i} className={cn("flex gap-2", muted ? "text-gray-500" : "text-gray-700")}>
            <span aria-hidden="true">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FormField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  highlight = false,
}: {
  field: BoxKey;
  value: number;
  onChange: (field: BoxKey, value: string) => void;
  error?: string;
  disabled?: boolean;
  highlight?: boolean;
}) {
  const def = BOX_DEFINITIONS[field];
  const helpId = `${field}-help`;

  return (
    <div className={cn("space-y-1", highlight && "col-span-full")}>
      <Label
        htmlFor={field}
        className={cn("text-sm", highlight ? "font-medium text-blue-900" : "text-gray-700")}
      >
        {def.label} <span className="text-gray-400">(Box {def.box})</span>
      </Label>
      <p id={helpId} className="text-sm text-gray-500">
        {def.help}
      </p>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
        <Input
          id={field}
          type="number"
          step={def.decimal ? "0.01" : "1"}
          min="0"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          disabled={disabled}
          aria-describedby={helpId}
          aria-invalid={!!error}
          className={cn(
            "pl-7",
            disabled && "bg-gray-100",
            highlight && "text-lg font-medium",
            error && "border-red-500"
          )}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
