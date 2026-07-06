import type { Metadata } from "next";
import MileageClient from "./mileage-client";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Mileage — Making Tax Digital for Income Tax | TaxSorted",
  description:
    "Work out your simplified mileage deduction for a self-employed car, van or motorcycle, cited to gov.uk's current rates — including the June 2026 45p to 55p rise.",
};

export default function MileagePage() {
  return <MileageClient />;
}
