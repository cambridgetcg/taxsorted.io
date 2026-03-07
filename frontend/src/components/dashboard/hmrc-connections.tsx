"use client";

import Link from "next/link";
import { Link2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { HMRCConnection, ConnectionStatus } from "@/types/dashboard";

interface HMRCConnectionsProps {
  connections: HMRCConnection[];
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  {
    icon: typeof CheckCircle;
    iconColor: string;
    label: string;
    action?: string;
  }
> = {
  connected: {
    icon: CheckCircle,
    iconColor: "text-green-500",
    label: "Connected",
  },
  "not-connected": {
    icon: XCircle,
    iconColor: "text-gray-400",
    label: "Not connected",
    action: "Connect",
  },
  expiring: {
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
    label: "Expires soon",
    action: "Renew",
  },
  expired: {
    icon: XCircle,
    iconColor: "text-red-500",
    label: "Expired",
    action: "Reconnect",
  },
};

export function HMRCConnections({
  connections,
  isLoading,
}: HMRCConnectionsProps) {
  if (isLoading) {
    return <HMRCConnectionsSkeleton />;
  }

  const needsAttention = connections.some(
    (c) => c.status === "not-connected" || c.status === "expiring" || c.status === "expired"
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5 text-blue-500" />
          HMRC Connections
        </CardTitle>
        <Link
          href="/settings/connections"
          className="text-sm text-blue-600 hover:underline"
        >
          Manage
        </Link>
      </CardHeader>
      <CardContent>
        {connections.length === 0 ? (
          <HMRCConnectionsEmpty />
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => (
              <ConnectionRow key={connection.type} connection={connection} />
            ))}
            {needsAttention && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Connect all services to submit filings automatically</span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectionRow({ connection }: { connection: HMRCConnection }) {
  const config = STATUS_CONFIG[connection.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5", config.iconColor)} />
        <div>
          <div className="font-medium text-gray-900">
            {connection.displayName}
          </div>
          <div className="text-sm text-gray-500">
            {connection.status === "connected" && connection.identifier
              ? `Connected - ${connection.identifier}`
              : connection.status === "expiring" && connection.daysUntilExpiry
                ? `Expires in ${connection.daysUntilExpiry} days`
                : config.label}
          </div>
        </div>
      </div>
      {config.action && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/settings/connections/${connection.type}`}>
            {config.action}
          </Link>
        </Button>
      )}
    </div>
  );
}

function HMRCConnectionsEmpty() {
  return (
    <div className="py-4 text-center">
      <p className="text-sm text-gray-600 mb-4">
        Connect to HMRC to submit your tax returns directly.
      </p>
      <Button variant="outline" asChild>
        <Link href="/settings/connections">Set Up Connections</Link>
      </Button>
    </div>
  );
}

function HMRCConnectionsSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-4 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-1 h-3 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export { HMRCConnectionsSkeleton };
