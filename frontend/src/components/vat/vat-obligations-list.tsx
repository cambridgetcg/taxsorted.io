"use client";

import Link from "next/link";
import { Calendar, CheckCircle, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { VATObligation } from "@/types/vat";

interface VATObligationsListProps {
  obligations: VATObligation[];
  entityId: string;
  isLoading?: boolean;
}

export function VATObligationsList({
  obligations,
  entityId,
  isLoading,
}: VATObligationsListProps) {
  if (isLoading) {
    return <VATObligationsListSkeleton />;
  }

  const openObligations = obligations.filter((o) => o.status === "O");
  const fulfilledObligations = obligations.filter((o) => o.status === "F");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span>VAT Obligations</span>
          </div>
          {openObligations.length > 0 && (
            <Badge variant="warning">{openObligations.length} outstanding</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {obligations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {/* Outstanding Obligations */}
            {openObligations.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-500">Outstanding</h3>
                <div className="space-y-3">
                  {openObligations.map((obligation) => (
                    <ObligationRow
                      key={obligation.periodKey}
                      obligation={obligation}
                      entityId={entityId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Fulfilled Obligations */}
            {fulfilledObligations.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-500">Completed</h3>
                <div className="space-y-3">
                  {fulfilledObligations.slice(0, 3).map((obligation) => (
                    <ObligationRow
                      key={obligation.periodKey}
                      obligation={obligation}
                      entityId={entityId}
                    />
                  ))}
                </div>
                {fulfilledObligations.length > 3 && (
                  <Link
                    href={`/vat/${entityId}/history`}
                    className="mt-3 block text-sm text-blue-600 hover:underline"
                  >
                    View all {fulfilledObligations.length} completed returns
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ObligationRow({
  obligation,
  entityId,
}: {
  obligation: VATObligation;
  entityId: string;
}) {
  const isFulfilled = obligation.status === "F";
  const dueDate = new Date(obligation.due);
  const today = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = !isFulfilled && daysUntilDue < 0;
  const isUrgent = !isFulfilled && daysUntilDue <= 7 && daysUntilDue >= 0;

  const periodDescription = formatPeriod(obligation.start, obligation.end);

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4",
        isOverdue && "border-red-200 bg-red-50",
        isUrgent && !isOverdue && "border-yellow-200 bg-yellow-50",
        isFulfilled && "border-gray-100 bg-gray-50"
      )}
    >
      <div className="flex items-center gap-3">
        {isFulfilled ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : isOverdue ? (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        ) : (
          <Clock className={cn("h-5 w-5", isUrgent ? "text-yellow-500" : "text-gray-400")} />
        )}
        <div>
          <div className="font-medium text-gray-900">VAT Return</div>
          <div className="text-sm text-gray-500">{periodDescription}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          {isFulfilled ? (
            <div className="text-sm text-green-600">Submitted</div>
          ) : isOverdue ? (
            <div className="text-sm font-medium text-red-600">
              {Math.abs(daysUntilDue)} days overdue
            </div>
          ) : daysUntilDue === 0 ? (
            <div className="text-sm font-medium text-yellow-600">Due today</div>
          ) : (
            <div className={cn("text-sm", isUrgent ? "font-medium text-yellow-600" : "text-gray-500")}>
              Due in {daysUntilDue} days
            </div>
          )}
          <div className="text-xs text-gray-400">
            {isFulfilled && obligation.received
              ? formatDate(obligation.received)
              : formatDate(obligation.due)}
          </div>
        </div>

        {!isFulfilled && (
          <Button size="sm" variant={isOverdue ? "default" : "outline"} asChild>
            <Link href={`/vat/${entityId}/submit?period=${obligation.periodKey}`}>
              {isOverdue ? "File Now" : "Submit"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}

        {isFulfilled && (
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/vat/${entityId}/returns/${obligation.periodKey}`}>View</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-8 text-center">
      <Calendar className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-4 font-medium text-gray-900">No obligations found</h3>
      <p className="mt-1 text-sm text-gray-500">
        Connect to HMRC to see your VAT obligations.
      </p>
    </div>
  );
}

function VATObligationsListSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-1 h-3 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-1 h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Utility
function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startMonth = startDate.toLocaleDateString("en-GB", { month: "short" });
  const endMonth = endDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  return `${startMonth} - ${endMonth}`;
}

export { VATObligationsListSkeleton };
