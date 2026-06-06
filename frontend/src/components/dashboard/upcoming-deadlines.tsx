"use client";

import Link from "next/link";
import { Calendar, ArrowRight, Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Deadline, DeadlineGroup } from "@/types/dashboard";

interface UpcomingDeadlinesProps {
  deadlineGroups: DeadlineGroup[];
  isLoading?: boolean;
}

const URGENCY_INDICATORS: Record<
  "critical" | "warning" | "normal",
  { iconColor: string; className: string }
> = {
  critical: { iconColor: "text-red-500 fill-red-500", className: "text-red-600 font-semibold" },
  warning: { iconColor: "text-yellow-500 fill-yellow-500", className: "text-yellow-600" },
  normal: { iconColor: "text-gray-300", className: "text-gray-400" },
};

export function UpcomingDeadlines({
  deadlineGroups,
  isLoading,
}: UpcomingDeadlinesProps) {
  if (isLoading) {
    return <UpcomingDeadlinesSkeleton />;
  }

  const totalDeadlines = deadlineGroups.reduce(
    (acc, group) => acc + group.deadlines.length,
    0
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-blue-500" />
          Upcoming deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalDeadlines === 0 ? (
          <UpcomingDeadlinesEmpty />
        ) : (
          <div className="space-y-6">
            {deadlineGroups.slice(0, 3).map((group) => (
              <DeadlineMonth key={group.monthYear} group={group} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeadlineMonth({ group }: { group: DeadlineGroup }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-500">
        {group.monthYear}
      </h3>
      <div className="space-y-3">
        {group.deadlines.slice(0, 3).map((deadline) => (
          <DeadlineRow key={deadline.id} deadline={deadline} />
        ))}
      </div>
    </div>
  );
}

function DeadlineRow({ deadline }: { deadline: Deadline }) {
  const urgency = URGENCY_INDICATORS[deadline.urgencyIndicator];
  const daysText =
    deadline.daysRemaining <= 0
      ? "Today"
      : deadline.daysRemaining === 1
        ? "1 day"
        : `${deadline.daysRemaining} days`;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
      {/* Date Box */}
      <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-gray-100 text-center">
        <span className="text-lg font-semibold text-gray-900">
          {deadline.dayOfMonth}
        </span>
        <span className="text-xs text-gray-500">{deadline.monthAbbrev}</span>
      </div>

      {/* Filing Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {deadline.displayName}
        </div>
        <div className="text-sm text-gray-500 truncate">
          {deadline.description}
        </div>
      </div>

      {/* Days Remaining */}
      <div className={cn("hidden sm:flex items-center gap-1.5 text-sm whitespace-nowrap", urgency.className)}>
        <Circle className={cn("h-2.5 w-2.5", urgency.iconColor)} />
        <span>{daysText}</span>
      </div>

      {/* Amount (if any) */}
      {deadline.amount && (
        <div className="hidden md:block text-sm text-gray-600 whitespace-nowrap">
          {formatCurrency(deadline.amount)}
        </div>
      )}

      {/* Action button — only when there's a real page to act on */}
      {deadline.actionLabel && deadline.actionHref && (
        <Button variant="outline" size="sm" asChild>
          <Link href={deadline.actionHref}>
            {deadline.actionLabel}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      )}
    </div>
  );
}

function UpcomingDeadlinesEmpty() {
  return (
    <div className="py-8 text-center">
      <Calendar className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-4 font-medium text-gray-900">No upcoming deadlines</h3>
      <p className="mt-1 text-sm text-gray-500">
        All your filings are up to date.
      </p>
    </div>
  );
}

function UpcomingDeadlinesSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {[1, 2].map((month) => (
            <div key={month}>
              <Skeleton className="mb-3 h-4 w-32" />
              <div className="space-y-3">
                {[1, 2].map((row) => (
                  <div
                    key={row}
                    className="flex items-center gap-4 rounded-lg border border-gray-100 p-3"
                  >
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1 h-3 w-48" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export { UpcomingDeadlinesSkeleton };
