"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Check, FileText, Clock, Send, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, formatDate, formatReference } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Submission, SubmissionStatus } from "@/types/dashboard";

interface RecentSubmissionsProps {
  submissions: Submission[];
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<
  SubmissionStatus,
  {
    icon: LucideIcon;
    label: string;
    variant: "success" | "info" | "error" | "default";
  }
> = {
  accepted: {
    icon: Check,
    label: "Accepted",
    variant: "success",
  },
  processing: {
    icon: Clock,
    label: "Processing",
    variant: "info",
  },
  submitted: {
    icon: Send,
    label: "Submitted",
    variant: "info",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    variant: "error",
  },
};

export function RecentSubmissions({
  submissions,
  isLoading,
}: RecentSubmissionsProps) {
  if (isLoading) {
    return <RecentSubmissionsSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Recent Submissions
        </CardTitle>
        {submissions.length > 0 && (
          <Link
            href="/submissions"
            className="text-sm text-blue-600 hover:underline"
          >
            View All
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <RecentSubmissionsEmpty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left text-sm font-medium text-gray-500">
                    Filing
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-500">
                    Period
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-500 hidden sm:table-cell">
                    Submitted
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="pb-3 text-left text-sm font-medium text-gray-500 hidden md:table-cell">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <SubmissionRow key={submission.id} submission={submission} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SubmissionRow({ submission }: { submission: Submission }) {
  const [copied, setCopied] = useState(false);
  const statusConfig = STATUS_CONFIG[submission.status];
  const StatusIcon = statusConfig.icon;

  const handleCopyReference = async () => {
    if (submission.hmrcReference) {
      await navigator.clipboard.writeText(submission.hmrcReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50">
      <td className="py-3 text-sm text-gray-900">{submission.displayName}</td>
      <td className="py-3 text-sm text-gray-600">
        {submission.periodDescription}
      </td>
      <td className="py-3 text-sm text-gray-600 hidden sm:table-cell">
        {formatDate(submission.submittedAt)}
      </td>
      <td className="py-3">
        <Badge variant={statusConfig.variant} className="inline-flex items-center gap-1">
          <StatusIcon className="h-3 w-3" />
          <span>{statusConfig.label}</span>
        </Badge>
      </td>
      <td className="py-3 text-sm text-gray-600 hidden md:table-cell">
        {submission.hmrcReference ? (
          <button
            onClick={handleCopyReference}
            className={cn(
              "flex items-center gap-1 rounded px-1 hover:bg-gray-100",
              copied && "text-green-600"
            )}
            title="Click to copy"
          >
            <span className="font-mono">
              {formatReference(submission.hmrcReference)}
            </span>
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3 text-gray-400" />
            )}
          </button>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
    </tr>
  );
}

function RecentSubmissionsEmpty() {
  return (
    <div className="py-8 text-center">
      <FileText className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-4 font-medium text-gray-900">No submissions yet</h3>
      <p className="mt-1 text-sm text-gray-500">
        Your submission history will appear here once you file your first
        return.
      </p>
    </div>
  );
}

function RecentSubmissionsSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24 hidden sm:block" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-28 hidden md:block" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export { RecentSubmissionsSkeleton };
