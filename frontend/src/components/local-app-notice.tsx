"use client";

import Link from "next/link";
import { HardDrive } from "lucide-react";
import { isLocalApp } from "@/lib/local-runtime";
import { useMounted } from "@/lib/use-mounted";

export function LocalAppNotice() {
  const mounted = useMounted();
  if (!mounted || !isLocalApp()) return null;

  return (
    <aside lang="en" dir="ltr" aria-label="Local app status" className="border-b border-accent/15 bg-accent/5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-1 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <p className="flex items-center gap-2 font-semibold text-accent">
          <HardDrive size={15} aria-hidden="true" />
          Local app · offline
        </p>
        <div className="flex flex-wrap items-center gap-x-5">
          <Link href="/books/workspace/backups" className="inline-flex min-h-11 items-center font-semibold text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep">
            Back up or restore
          </Link>
          <Link href="/download#your-data" className="inline-flex min-h-11 items-center text-ink-soft underline decoration-line-strong underline-offset-4 hover:text-accent">
            Your data &amp; app limits
          </Link>
        </div>
      </div>
    </aside>
  );
}
