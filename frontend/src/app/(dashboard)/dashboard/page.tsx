import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Your Income Tax home — TaxSorted",
  description:
    "Where you stand on Making Tax Digital for Income Tax, derived from your own records — no mock figures.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
