import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CheckupClient } from "./checkup-client";

export const metadata: Metadata = {
  title: "My tax checklist",
  description: "Choose your starting point, open the relevant tax services and keep a simple checklist in this browser.",
};

export default function CheckupPage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Breadcrumbs items={[{ href: "/services", label: "Tax services" }]} current="My tax checklist" />
      <header className="mt-7 max-w-3xl">
        <p className="section-label">One useful step at a time</p>
        <h1 className="hero-title mt-4 text-ink">My tax checklist</h1>
        <p className="mt-6 text-lg leading-8 text-ink-soft">
          Find the checks, records and next steps that fit your situation. Open a service, check what
          applies to you, then mark your own progress here.
        </p>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          No account needed. This checklist asks for no name, tax reference or tax figures.
          Production filing through TaxSorted is not live.
        </p>
      </header>
      <Suspense fallback={<p className="mt-10 text-ink-soft">Loading your checklist…</p>}>
        <CheckupClient />
      </Suspense>
    </div>
  );
}
