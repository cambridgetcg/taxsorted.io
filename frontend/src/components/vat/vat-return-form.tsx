"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  Send,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { VATReturnData, VATObligation } from "@/types/vat";
import { calculateVATReturnTotals, validateVATReturnData } from "@/lib/hmrc/vat-api";

interface VATReturnFormProps {
  entityId: string;
  obligation: VATObligation;
  onSubmit: (data: VATReturnData) => Promise<void>;
  isSubmitting?: boolean;
}

// Box definitions with help text
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
    label: "VAT due on sales and other outputs",
    help: "VAT charged on sales of goods and services, including zero-rated and exempt supplies.",
    decimal: true,
  },
  vatDueAcquisitions: {
    box: 2,
    label: "VAT due on acquisitions from EU",
    help: "VAT due on goods acquired from other EU member states (if applicable).",
    decimal: true,
  },
  totalVatDue: {
    box: 3,
    label: "Total VAT due",
    help: "Box 1 + Box 2. This is calculated automatically.",
    decimal: true,
    calculated: true,
  },
  vatReclaimedCurrPeriod: {
    box: 4,
    label: "VAT reclaimed on purchases",
    help: "VAT reclaimed on purchases and other inputs, including acquisitions from EU.",
    decimal: true,
  },
  netVatDue: {
    box: 5,
    label: "Net VAT to pay or reclaim",
    help: "Box 3 - Box 4. If negative, you are due a refund.",
    decimal: true,
    calculated: true,
  },
  totalValueSalesExVAT: {
    box: 6,
    label: "Total value of sales (ex VAT)",
    help: "Total value of all sales excluding VAT. Include zero-rated and exempt.",
    decimal: false,
  },
  totalValuePurchasesExVAT: {
    box: 7,
    label: "Total value of purchases (ex VAT)",
    help: "Total value of all purchases excluding VAT.",
    decimal: false,
  },
  totalValueGoodsSuppliedExVAT: {
    box: 8,
    label: "Total value of supplies to EU (ex VAT)",
    help: "Total value of goods and services supplied to EU member states.",
    decimal: false,
  },
  totalAcquisitionsExVAT: {
    box: 9,
    label: "Total value of acquisitions from EU (ex VAT)",
    help: "Total value of goods and services acquired from EU member states.",
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

  // Form state
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

  // Calculate totals when inputs change
  useEffect(() => {
    const { totalVatDue, netVatDue } = calculateVATReturnTotals(formData);
    setFormData((prev) => ({
      ...prev,
      totalVatDue,
      netVatDue,
    }));
  }, [
    formData.vatDueSales,
    formData.vatDueAcquisitions,
    formData.vatReclaimedCurrPeriod,
  ]);

  const handleInputChange = (field: BoxKey, value: string) => {
    const def = BOX_DEFINITIONS[field];
    let numValue: number;

    if (def.decimal) {
      numValue = parseFloat(value) || 0;
      // Round to 2 decimal places
      numValue = Math.round(numValue * 100) / 100;
    } else {
      numValue = Math.round(parseFloat(value) || 0);
    }

    setFormData((prev) => ({ ...prev, [field]: numValue }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    // Validate form data
    const validation = validateVATReturnData(formData as VATReturnData);

    if (!validation.valid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach((err) => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    // Show confirmation if not already showing
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    // Submit
    try {
      await onSubmit(formData as VATReturnData);
    } catch (error) {
      setErrors({ submit: "Failed to submit VAT return. Please try again." });
    }
  };

  const isRefund = (formData.netVatDue || 0) < 0;
  const periodDescription = formatPeriod(obligation.start, obligation.end);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-500" />
            VAT Return Submission
          </CardTitle>
          <CardDescription>
            Period: {periodDescription} | Due: {formatDate(obligation.due)}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">VAT Return Details</CardTitle>
          <CardDescription>
            Enter your VAT figures for this period. Boxes 3 and 5 are calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TooltipProvider>
            {/* VAT Output Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">VAT Output</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["vatDueSales", "vatDueAcquisitions", "totalVatDue"] as BoxKey[]).map(
                  (field) => (
                    <FormField
                      key={field}
                      field={field}
                      value={formData[field] as number}
                      onChange={handleInputChange}
                      error={errors[field]}
                      disabled={BOX_DEFINITIONS[field].calculated}
                    />
                  )
                )}
              </div>
            </div>

            {/* VAT Input Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">VAT Input</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  field="vatReclaimedCurrPeriod"
                  value={formData.vatReclaimedCurrPeriod as number}
                  onChange={handleInputChange}
                  error={errors.vatReclaimedCurrPeriod}
                />
              </div>
            </div>

            {/* Net VAT */}
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <FormField
                field="netVatDue"
                value={formData.netVatDue as number}
                onChange={handleInputChange}
                error={errors.netVatDue}
                disabled
                highlight
              />
              {isRefund && (
                <p className="mt-2 text-sm text-green-600">
                  You are due a refund of {formatCurrency(Math.abs(formData.netVatDue || 0))}
                </p>
              )}
            </div>

            {/* Totals Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Total Values (excluding VAT)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    "totalValueSalesExVAT",
                    "totalValuePurchasesExVAT",
                    "totalValueGoodsSuppliedExVAT",
                    "totalAcquisitionsExVAT",
                  ] as BoxKey[]
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
            </div>
          </TooltipProvider>

          {/* Declaration */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-800">Declaration</h4>
                <p className="mt-1 text-sm text-yellow-700">
                  By submitting this VAT return, you are making a legal declaration that the
                  information is true and complete. A false declaration can result in prosecution.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Checkbox
                    id="finalised"
                    checked={formData.finalised}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, finalised: checked === true }))
                    }
                  />
                  <Label htmlFor="finalised" className="text-sm text-yellow-800">
                    I declare that the information is true and complete
                  </Label>
                </div>
                {errors.finalised && (
                  <p className="mt-1 text-sm text-red-600">{errors.finalised}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submission Error */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Submission Failed</AlertTitle>
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Confirmation */}
          {showConfirmation && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Confirm Submission</AlertTitle>
              <AlertDescription>
                You are about to submit a VAT return for {periodDescription}.
                {isRefund ? (
                  <span className="font-medium text-green-600">
                    {" "}
                    You will receive a refund of {formatCurrency(Math.abs(formData.netVatDue || 0))}.
                  </span>
                ) : (
                  <span className="font-medium text-blue-600">
                    {" "}
                    You owe {formatCurrency(formData.netVatDue || 0)}.
                  </span>
                )}
                <br />
                This cannot be undone. Click Submit again to confirm.
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
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.finalised}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : showConfirmation ? (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Confirm Submission
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit VAT Return
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Form Field Component
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

  return (
    <div className={cn("space-y-2", highlight && "col-span-full")}>
      <div className="flex items-center gap-2">
        <Label
          htmlFor={field}
          className={cn(
            "text-sm",
            highlight ? "font-medium text-blue-900" : "text-gray-700"
          )}
        >
          Box {def.box}: {def.label}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{def.help}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          £
        </span>
        <Input
          id={field}
          type="number"
          step={def.decimal ? "0.01" : "1"}
          min="0"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          disabled={disabled}
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

// Utility functions
function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startMonth = startDate.toLocaleDateString("en-GB", { month: "short" });
  const endMonth = endDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  return `${startMonth} - ${endMonth}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
