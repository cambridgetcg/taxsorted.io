"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, ArrowRight, XCircle, Circle, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttentionFiling, UrgencyLevel } from "@/types/dashboard";

interface AttentionRequiredProps {
  filings: AttentionFiling[];
  isLoading?: boolean;
}

const URGENCY_STYLES: Record<
  UrgencyLevel,
  {
    border: string;
    background: string;
    badge: string;
    badgeVariant: "error" | "warning";
    icon: LucideIcon;
    iconColor: string;
  }
> = {
  overdue: {
    border: "border-red-300",
    background: "bg-red-50",
    badge: "OVERDUE",
    badgeVariant: "error",
    icon: XCircle,
    iconColor: "text-red-500",
  },
  critical: {
    border: "border-red-200",
    background: "bg-red-50/50",
    badge: "",
    badgeVariant: "error",
    icon: Circle,
    iconColor: "text-red-500",
  },
  warning: {
    border: "border-yellow-200",
    background: "bg-yellow-50/50",
    badge: "",
    badgeVariant: "warning",
    icon: Circle,
    iconColor: "text-yellow-500",
  },
};

export function AttentionRequired({ filings, isLoading }: AttentionRequiredProps) {
  if (isLoading) {
    return <AttentionRequiredSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Attention Required
        </CardTitle>
        {filings.length > 0 && (
          <Link
            href="/filings?filter=attention"
            className="text-sm text-blue-600 hover:underline"
          >
            View All
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {filings.length === 0 ? (
          <AttentionRequiredEmpty />
        ) : (
          <div className="space-y-4">
            {filings.map((filing) => (
              <AttentionCard key={filing.id} filing={filing} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttentionCard({ filing }: { filing: AttentionFiling }) {
  const styles = URGENCY_STYLES[filing.urgency];
  const UrgencyIcon = styles.icon;
  const daysText =
    filing.daysRemaining < 0
      ? `${Math.abs(filing.daysRemaining)} DAYS OVERDUE`
      : filing.daysRemaining === 0
        ? "DUE TODAY"
        : filing.daysRemaining === 1
          ? "1 DAY REMAINING"
          : `${filing.daysRemaining} DAYS REMAINING`;

  const actionLabel =
    filing.urgency === "overdue"
      ? "File Now"
      : filing.status === "ready"
        ? "Review & Submit"
        : "Start";

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        styles.border,
        styles.background
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <UrgencyIcon className={cn("h-5 w-5 mt-0.5", styles.iconColor)} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{filing.displayName}</h3>
              {filing.urgency === "overdue" && (
                <Badge variant="error">{styles.badge}</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Period: {filing.periodDescription}
            </p>
            <p className="text-sm text-gray-600">
              {filing.urgency === "overdue" ? "Was due" : "Due"}:{" "}
              {formatDate(filing.dueDate)}
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
          filing.urgency === "overdue"
            ? "bg-red-100 text-red-700"
            : filing.urgency === "critical"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
        )}
      >
        {filing.urgency === "overdue" ? (
          <XCircle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
        <span>{daysText}{filing.penaltyInfo && ` - ${filing.penaltyInfo}`}</span>
      </div>

      {filing.amount && (
        <p className="mt-3 text-sm text-gray-600">
          {filing.amountLabel || "Amount"}: {formatCurrency(filing.amount)}
        </p>
      )}

      <div className="mt-4">
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/filings/${filing.id}/submit`}>
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function AttentionRequiredEmpty() {
  return (
    <div className="py-8 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
      <h3 className="mt-4 font-medium text-gray-900">All caught up!</h3>
      <p className="mt-1 text-sm text-gray-500">
        No filings need your attention right now.
      </p>
      <Link
        href="/filings"
        className="mt-4 inline-block text-sm text-blue-600 hover:underline"
      >
        View All Filings
      </Link>
    </div>
  );
}

function AttentionRequiredSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-2 h-4 w-48" />
                  <Skeleton className="mt-1 h-4 w-36" />
                </div>
              </div>
              <Skeleton className="mt-3 h-8 w-full rounded-md" />
              <Skeleton className="mt-4 h-10 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export { AttentionRequiredSkeleton };
