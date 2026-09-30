import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CheckupClient } from "./checkup-client";

export const metadata: Metadata = {
  title: "My tax year | TaxSorted",
  description: "Pick up your saved local work, see what needs attention and keep a personal tax checklist. Choose when to show progress from Books and your Tax Passport.",
};

export default function CheckupPage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Breadcrumbs items={[{ href: "/services", label: "Tax services" }]} current="My tax year" />
      <header className="mt-7 max-w-3xl">
        <p className="section-label">One useful step at a time</p>
        <h1 className="hero-title mt-4 text-ink">My tax year</h1>
        <p className="mt-6 text-lg leading-8 text-ink-soft">
          Pick up where you left off. See what needs attention in your saved work,
          open the next useful task and keep your own checklist alongside it.
        </p>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          No account needed. Choose whether to show progress from this device’s Books and
          Tax Passport. Nothing is sent or filed by showing your progress.
        </p>
      </header>
      <Suspense fallback={<p className="mt-10 text-ink-soft">Loading your checklist…</p>}>
        <CheckupClient />
      </Suspense>
    </div>
  );
}
