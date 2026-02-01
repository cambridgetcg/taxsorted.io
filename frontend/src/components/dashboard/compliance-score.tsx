"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComplianceData, ScoreLevel } from "@/types/dashboard";

interface ComplianceScoreProps {
  data: ComplianceData | null;
  isLoading?: boolean;
}

const SCORE_CONFIG: Record<
  ScoreLevel,
  {
    label: string;
    textColor: string;
    progressColor: string;
    bgColor: string;
  }
> = {
  excellent: {
    label: "Excellent",
    textColor: "text-green-600",
    progressColor: "stroke-green-500",
    bgColor: "bg-green-50",
  },
  good: {
    label: "Good",
    textColor: "text-yellow-600",
    progressColor: "stroke-yellow-500",
    bgColor: "bg-yellow-50",
  },
  "needs-improvement": {
    label: "Needs Improvement",
    textColor: "text-red-600",
    progressColor: "stroke-red-500",
    bgColor: "bg-red-50",
  },
  "no-data": {
    label: "No data yet",
    textColor: "text-gray-400",
    progressColor: "stroke-gray-200",
    bgColor: "bg-gray-50",
  },
};

function getScoreLevel(score: number | null): ScoreLevel {
  if (score === null) return "no-data";
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  return "needs-improvement";
}

export function ComplianceScore({ data, isLoading }: ComplianceScoreProps) {
  if (isLoading) {
    return <ComplianceScoreSkeleton />;
  }

  const scoreLevel = getScoreLevel(data?.score ?? null);
  const config = SCORE_CONFIG[scoreLevel];
  const hasData = data && data.score !== null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Compliance Score
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        {/* Circular Progress */}
        <div className="relative mx-auto h-32 w-32">
          <svg className="h-32 w-32 -rotate-90 transform">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200"
            />
            {/* Progress circle */}
            {hasData && (
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={config.progressColor}
                strokeDasharray={`${((data.score ?? 0) / 100) * 352} 352`}
              />
            )}
          </svg>
          {/* Score text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-3xl font-bold", config.textColor)}>
              {hasData ? `${data.score}%` : "--"}
            </span>
          </div>
        </div>

        {/* Label */}
        <p className={cn("mt-4 font-medium", config.textColor)}>
          {config.label}
        </p>

        {/* Stats */}
        {hasData ? (
          <>
            <p className="mt-2 text-sm text-gray-600">
              {data.onTimeCount} of {data.totalCount} filings on time this year
            </p>
            {data.overdueCount > 0 && (
              <p className="mt-2 text-sm text-red-600">
                ⚠️ {data.overdueCount} overdue filing
                {data.overdueCount > 1 ? "s" : ""} - file now to improve
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            Complete your first filing to see your compliance score
          </p>
        )}

        {/* Link */}
        {hasData && (
          <Link
            href="/compliance/history"
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            View History →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function ComplianceScoreSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <Skeleton className="h-32 w-32 rounded-full" />
        <Skeleton className="mt-4 h-5 w-24" />
        <Skeleton className="mt-2 h-4 w-40" />
      </CardContent>
    </Card>
  );
}

export { ComplianceScoreSkeleton };
