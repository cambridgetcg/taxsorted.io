"use client";

import { useState } from "react";
import Link from "next/link";
import { Link2, CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { VATConnection } from "@/types/vat";

interface VATConnectionCardProps {
  connection: VATConnection | null;
  entityId: string;
  vrn?: string;
  isLoading?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const STATUS_CONFIG = {
  connected: {
    icon: CheckCircle,
    iconColor: "text-green-500",
    badge: "Connected",
    badgeVariant: "success" as const,
    description: "Your HMRC MTD for VAT is connected and ready for submissions.",
  },
  expired: {
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
    badge: "Expired",
    badgeVariant: "warning" as const,
    description: "Your connection has expired. Please reconnect to continue filing.",
  },
  "not-connected": {
    icon: XCircle,
    iconColor: "text-gray-400",
    badge: "Not Connected",
    badgeVariant: "default" as const,
    description: "Connect to HMRC to submit VAT returns directly.",
  },
};

export function VATConnectionCard({
  connection,
  entityId,
  vrn,
  isLoading,
  onConnect,
  onDisconnect,
}: VATConnectionCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  if (isLoading) {
    return <VATConnectionCardSkeleton />;
  }

  const status = connection?.status || "not-connected";
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      onConnect?.();
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-500" />
            <span>HMRC VAT Connection</span>
          </div>
          <Badge variant={config.badgeVariant}>{config.badge}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-start gap-3">
          <StatusIcon className={cn("h-5 w-5 mt-0.5", config.iconColor)} />
          <div className="flex-1">
            <p className="text-sm text-gray-600">{config.description}</p>
            {connection?.status === "connected" && connection.vrn && (
              <p className="mt-1 text-sm font-medium text-gray-900">
                VRN: {formatVRN(connection.vrn)}
              </p>
            )}
            {connection?.status === "connected" && connection.expiresAt && (
              <p className="mt-1 text-xs text-gray-500">
                Expires: {formatDate(connection.expiresAt)}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row">
          {status === "not-connected" && (
            <Button onClick={handleConnect} disabled={isConnecting} className="flex-1">
              {isConnecting ? "Connecting..." : "Connect to HMRC"}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}

          {status === "expired" && (
            <Button onClick={handleConnect} disabled={isConnecting} className="flex-1">
              {isConnecting ? "Reconnecting..." : "Reconnect to HMRC"}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}

          {status === "connected" && (
            <>
              <Button variant="outline" onClick={onDisconnect} className="flex-1">
                Disconnect
              </Button>
              <Button asChild className="flex-1">
                <Link href={`/vat/${entityId}/submit`}>Submit VAT Return</Link>
              </Button>
            </>
          )}
        </div>

        {/* Help Link */}
        <p className="text-xs text-gray-500">
          Need help?{" "}
          <Link href="/help/hmrc-connection" className="text-blue-600 hover:underline">
            Learn about HMRC connections
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function VATConnectionCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

// Utility functions
function formatVRN(vrn: string): string {
  // Format as XXX XXXX XX
  const clean = vrn.replace(/\D/g, "");
  if (clean.length !== 9) return vrn;
  return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export { VATConnectionCardSkeleton };
