"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { VATReturnForm } from "@/components/vat";
import type { VATObligation, VATReturnData } from "@/types/vat";
import { formatDate, formatPeriod } from "@/lib/utils";

// Mock obligations - replace with actual API call
const mockObligations: VATObligation[] = [
  {
    periodKey: "24A1",
    start: "2024-01-01",
    end: "2024-03-31",
    due: "2024-05-07",
    status: "O",
  },
  {
    periodKey: "24A2",
    start: "2024-04-01",
    end: "2024-06-30",
    due: "2024-08-07",
    status: "O",
  },
];

interface VATSubmitPageClientProps { entityId: string; }

export default function VATSubmitPage({ entityId }: VATSubmitPageClientProps) {
  const searchParams = useSearchParams();
  const periodKey = searchParams.get("period");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [obligation, setObligation] = useState<VATObligation | null>(null);
  const [obligations, setObligations] = useState<VATObligation[]>([]);

  // Load obligations
  useEffect(() => {
    loadObligations();
  }, [entityId]);

  const loadObligations = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setObligations(mockObligations);

      // Find the selected obligation
      if (periodKey) {
        const selected = mockObligations.find((o) => o.periodKey === periodKey);
        setObligation(selected || null);
      } else if (mockObligations.length > 0) {
        // Default to first open obligation
        setObligation(mockObligations[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: VATReturnData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // TODO: Replace with actual API call
      // const response = await submitVATReturn(vrn, data, { accessToken });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Figures prepared and saved. No auto-redirect — let the user read the result and choose.
      setSubmitSuccess(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit VAT return"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // No obligation selected
  if (!isLoading && !obligation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/vat/${entityId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to VAT Portal
              </Link>
            </Button>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No period selected</AlertTitle>
            <AlertDescription>
              {obligations.length > 0 ? (
                <>
                  Please select a period to submit. Available periods:
                  <ul className="mt-2 list-disc pl-4">
                    {obligations.map((o) => (
                      <li key={o.periodKey}>
                        <Link
                          href={`/vat/${entityId}/submit?period=${o.periodKey}`}
                          className="text-blue-600 hover:underline"
                        >
                          {formatPeriod(o.start, o.end)} (Due:{" "}
                          {formatDate(o.due)})
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                "No open VAT obligations found. Please check your HMRC connection."
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="mt-4 text-2xl font-bold text-green-800">
              VAT Return Prepared
            </h1>
            <p className="mt-2 text-green-700">
              Your return has been checked and saved. Sending to HMRC isn’t switched on in
              this build yet — it prepares your figures, it doesn’t file them.
            </p>
            <p className="mt-1 text-sm text-green-600">
              When HMRC submission is enabled, you’ll confirm and file from here.
            </p>
            <Button className="mt-6" asChild>
              <Link href={`/vat/${entityId}`}>Back to VAT portal</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/vat/${entityId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to VAT Portal
            </Link>
          </Button>
        </div>

        {/* Error Alert */}
        {submitError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Submission Failed</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : obligation ? (
          <VATReturnForm
            entityId={entityId}
            obligation={obligation}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </div>
    </div>
  );
}
