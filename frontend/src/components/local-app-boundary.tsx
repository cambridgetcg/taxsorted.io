"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isLocalApp } from "@/lib/local-runtime";
import { useMounted } from "@/lib/use-mounted";

const ONLINE_ROUTES = ["/account", "/dashboard", "/vat"];

/** A useful destination for online-only routes inside the offline desktop app. */
export function LocalAppBoundary({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const pathname = usePathname() ?? "/";
  const needsConnection = ONLINE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!mounted || !isLocalApp() || !needsConnection) return children;

  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="section-label">Local app · offline</p>
      <h1 className="section-title mt-5 text-ink">This service needs an online connection.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
        Accounts, connected dashboards and VAT sandbox submissions are unavailable in this
        local preview. Your money records and local tools remain available without an account.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/books/workspace" className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-deep">Open Money records →</Link>
        <Link href="/prepare" className="inline-flex min-h-12 items-center rounded-full border border-line-strong px-6 py-3 text-sm font-semibold text-ink hover:border-accent">Prepare my tax return →</Link>
      </div>
      <Link href="/download#your-data" className="mt-7 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">About your local data and app limits →</Link>
    </div>
  );
}
