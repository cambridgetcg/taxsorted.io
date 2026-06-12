"use client";

import Link from "next/link";
import { Calendar, CheckCircle, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { cn, formatDate, formatPeriod } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { VATObligation } from "@taxsorted/engine/uk/vat";

interface VATObligationsListProps {
  obligations: VATObligation[];
  entityId: string;
  isLoading?: boolean;
  /** Where the File button leads. Defaults to the sample-books route. */
  fileHref?: (periodKey: string) => string;
}

export function VATObligationsList({
  obligations,
  entityId,
  isLoading,
  fileHref,
}: VATObligationsListProps) {
  if (isLoading) {
    return <VATObligationsListSkeleton />;
  }

  const notFiled = obligations.filter((o) => o.status === "O");
  const filed = obligations.filter((o) => o.status === "F");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span>Returns due</span>
          </div>
          {notFiled.length > 0 && (
            <Badge variant="warning">{notFiled.length} not filed</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {obligations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {notFiled.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-500">Not filed yet</h3>
                <div className="space-y-3">
                  {notFiled.map((obligation) => (
                    <ObligationRow
                      key={obligation.periodKey}
                      obligation={obligation}
                      entityId={entityId}
                      fileHref={fileHref}
                    />
                  ))}
                </div>
              </div>
            )}

            {filed.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-500">Filed</h3>
                <div className="space-y-3">
                  {filed.slice(0, 3).map((obligation) => (
                    <ObligationRow
                      key={obligation.periodKey}
                      obligation={obligation}
                      entityId={entityId}
                      fileHref={fileHref}
                    />
                  ))}
                </div>
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
  fileHref,
}: {
  obligation: VATObligation;
  entityId: string;
  fileHref?: (periodKey: string) => string;
}) {
  const isFiled = obligation.status === "F";
  const dueDate = new Date(obligation.due);
  const today = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = !isFiled && daysUntilDue < 0;
  const isUrgent = !isFiled && daysUntilDue <= 7 && daysUntilDue >= 0;

  const periodDescription = formatPeriod(obligation.start, obligation.end);

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4",
        isOverdue && "border-red-200 bg-red-50",
        isUrgent && !isOverdue && "border-yellow-200 bg-yellow-50",
        isFiled && "border-gray-100 bg-gray-50"
      )}
    >
      <div className="flex items-center gap-3">
        {isFiled ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : isOverdue ? (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        ) : (
          <Clock className={cn("h-5 w-5", isUrgent ? "text-yellow-500" : "text-gray-400")} />
        )}
        <div>
          <div className="font-medium text-gray-900">VAT return</div>
          <div className="text-sm text-gray-500">{periodDescription}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          {isFiled ? (
            <div className="text-sm text-green-600">Filed</div>
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
            {isFiled && obligation.received
              ? formatDate(obligation.received)
              : formatDate(obligation.due)}
          </div>
        </div>

        {!isFiled && (
          <Button size="sm" variant={isOverdue ? "default" : "outline"} asChild>
            <Link
              href={
                fileHref
                  ? fileHref(obligation.periodKey)
                  : `/vat/${entityId}/submit?period=${obligation.periodKey}`
              }
            >
              {isOverdue ? "File now" : "File"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
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
      <h3 className="mt-4 font-medium text-gray-900">No returns yet</h3>
      <p className="mt-1 text-sm text-gray-500">
        Connect to HMRC to see your VAT returns.
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

export { VATObligationsListSkeleton };
