"use client";

import Link from "next/link";
import { Zap, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { QuickAction } from "@/types/dashboard";

interface QuickActionsProps {
  actions: QuickAction[];
  isLoading?: boolean;
}

export function QuickActions({ actions, isLoading }: QuickActionsProps) {
  if (isLoading) {
    return <QuickActionsSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-yellow-500" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <QuickActionsEmpty />
        ) : (
          <div className="space-y-2">
            {actions.map((action) => (
              <ActionRow key={action.id} action={action} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionRow({ action }: { action: QuickAction }) {
  return (
    <Link
      href={action.href}
      className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
    >
      <span className="text-xl">{action.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{action.title}</div>
        <div className="text-sm text-gray-500 truncate">{action.subtitle}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
    </Link>
  );
}

function QuickActionsEmpty() {
  return (
    <div className="py-4 text-center text-sm text-gray-500">
      No actions available right now.
    </div>
  );
}

function QuickActionsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
            >
              <Skeleton className="h-6 w-6 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-40" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export { QuickActionsSkeleton };
