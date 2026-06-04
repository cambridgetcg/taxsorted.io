"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  VATConnectionCard,
  VATObligationsList,
  VATLiabilitiesCard,
} from "@/components/vat";
import type {
  VATConnection,
  VATObligation,
  VATLiability,
  VATPayment,
} from "@/types/vat";

// Mock data for development - replace with actual API calls
const mockConnection: VATConnection = {
  id: "conn-1",
  entityId: "entity-1",
  vrn: "123456789",
  status: "connected",
  scopes: ["read:vat", "write:vat"],
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  connectedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockObligations: VATObligation[] = [
  {
    periodKey: "24A1",
    start: "2024-01-01",
    end: "2024-03-31",
    due: "2024-05-07",
    status: "O",
  },
  {
    periodKey: "23A4",
    start: "2023-10-01",
    end: "2023-12-31",
    due: "2024-02-07",
    status: "F",
    received: "2024-02-05",
  },
  {
    periodKey: "23A3",
    start: "2023-07-01",
    end: "2023-09-30",
    due: "2023-11-07",
    status: "F",
    received: "2023-11-01",
  },
  {
    periodKey: "23A2",
    start: "2023-04-01",
    end: "2023-06-30",
    due: "2023-08-07",
    status: "F",
    received: "2023-08-05",
  },
];

const mockLiabilities: VATLiability[] = [
  {
    type: "VAT Return Debit Charge",
    taxPeriod: { from: "2024-01-01", to: "2024-03-31" },
    originalAmount: 2500.0,
    outstandingAmount: 2500.0,
    due: "2024-05-07",
  },
];

const mockPayments: VATPayment[] = [
  {
    amount: 1850.5,
    received: "2024-02-05",
  },
  {
    amount: 2100.0,
    received: "2023-11-06",
  },
];

interface VATPageClientProps { entityId: string; }

export default function VATPortalPage({ entityId }: VATPageClientProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connection, setConnection] = useState<VATConnection | null>(null);
  const [obligations, setObligations] = useState<VATObligation[]>([]);
  const [liabilities, setLiabilities] = useState<VATLiability[]>([]);
  const [payments, setPayments] = useState<VATPayment[]>([]);

  // Load data
  useEffect(() => {
    loadData();
  }, [entityId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setConnection(mockConnection);
      setObligations(mockObligations);
      setLiabilities(mockLiabilities);
      setPayments(mockPayments);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConnect = () => {
    // TODO: Implement HMRC OAuth flow
    // This would redirect to HMRC authorization endpoint
    console.log("Initiating HMRC OAuth flow...");
  };

  const handleDisconnect = () => {
    // TODO: Implement disconnection logic
    setConnection(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">VAT Portal</h1>
                <p className="text-sm text-gray-500">
                  Manage your VAT returns and HMRC connection
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="col-span-12 space-y-6 lg:col-span-8">
              {/* VAT Obligations */}
              <VATObligationsList
                obligations={obligations}
                entityId={entityId}
                isLoading={isLoading}
              />

              {/* Liabilities and Payments */}
              <VATLiabilitiesCard
                liabilities={liabilities}
                payments={payments}
                isLoading={isLoading}
              />
            </div>

            {/* Right Column */}
            <div className="col-span-12 space-y-6 lg:col-span-4">
              {/* HMRC Connection */}
              <VATConnectionCard
                connection={connection}
                entityId={entityId}
                isLoading={isLoading}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />

              {/* Quick links — only doors that actually open */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-medium text-gray-900">Quick links</h3>
                <div className="space-y-2">
                  <Link
                    href={`/vat/${entityId}/submit`}
                    className="block text-sm text-blue-600 hover:underline"
                  >
                    File a VAT return
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
