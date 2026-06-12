"use client";

import { PoundSterling, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { VATLiability, VATPayment } from "@taxsorted/engine/uk/vat";

interface VATLiabilitiesCardProps {
  liabilities: VATLiability[];
  payments: VATPayment[];
  isLoading?: boolean;
}

export function VATLiabilitiesCard({
  liabilities,
  payments,
  isLoading,
}: VATLiabilitiesCardProps) {
  if (isLoading) {
    return <VATLiabilitiesCardSkeleton />;
  }

  // Calculate totals
  const totalOutstanding = liabilities.reduce(
    (sum, l) => sum + (l.outstandingAmount || 0),
    0
  );
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  const hasOutstanding = totalOutstanding > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5 text-blue-500" />
            <span>VAT Account</span>
          </div>
          {hasOutstanding && (
            <Badge variant="warning">Outstanding balance</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            className={cn(
              "rounded-lg p-4",
              hasOutstanding ? "bg-red-50" : "bg-green-50"
            )}
          >
            <div className="flex items-center gap-2">
              {hasOutstanding ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm text-gray-600">Outstanding</span>
            </div>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold",
                hasOutstanding ? "text-red-600" : "text-green-600"
              )}
            >
              {formatCurrency(totalOutstanding)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <PoundSterling className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Recent Payments</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(totalPayments)}
            </p>
          </div>
        </div>

        {/* Liabilities List */}
        {liabilities.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-500">
              Outstanding Liabilities
            </h4>
            <div className="space-y-2">
              {liabilities.slice(0, 3).map((liability, index) => (
                <LiabilityRow key={index} liability={liability} />
              ))}
            </div>
          </div>
        )}

        {/* Payments List */}
        {payments.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-500">
              Recent Payments
            </h4>
            <div className="space-y-2">
              {payments.slice(0, 3).map((payment, index) => (
                <PaymentRow key={index} payment={payment} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {liabilities.length === 0 && payments.length === 0 && (
          <div className="py-4 text-center">
            <PoundSterling className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              No liabilities or payments to display
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LiabilityRow({ liability }: { liability: VATLiability }) {
  const isOverdue =
    liability.due && new Date(liability.due) < new Date() && (liability.outstandingAmount || 0) > 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3",
        isOverdue && "border-red-200 bg-red-50"
      )}
    >
      <div className="flex items-center gap-2">
        {isOverdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
        <div>
          <p className="text-sm font-medium text-gray-900">
            {liability.type === "VAT Return Debit Charge"
              ? "VAT Return"
              : liability.type}
          </p>
          <p className="text-xs text-gray-500">
            {formatPeriod(liability.taxPeriod.from, liability.taxPeriod.to)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={cn(
            "text-sm font-medium",
            isOverdue ? "text-red-600" : "text-gray-900"
          )}
        >
          {formatCurrency(liability.outstandingAmount || liability.originalAmount)}
        </p>
        {liability.due && (
          <p className="text-xs text-gray-500">
            Due: {formatDate(liability.due)}
          </p>
        )}
      </div>
    </div>
  );
}

function PaymentRow({ payment }: { payment: VATPayment }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 p-3">
      <div>
        <p className="text-sm font-medium text-gray-900">Payment Received</p>
        <p className="text-xs text-gray-500">{formatDate(payment.received)}</p>
      </div>
      <p className="text-sm font-medium text-green-600">
        -{formatCurrency(payment.amount)}
      </p>
    </div>
  );
}

function VATLiabilitiesCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// Utility
function formatPeriod(from: string, to: string): string {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  return `${fromDate.toLocaleDateString("en-GB", {
    month: "short",
  })} - ${toDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
}

export { VATLiabilitiesCardSkeleton };
