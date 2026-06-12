import { Suspense } from "react";
import CockpitClient from "./cockpit-client";

// The real VAT cockpit: your entity, your HMRC connection, your obligations.
// Entities are addressed by query (?e=...) because this site is a static export.
export default function VatCockpitPage() {
  return (
    <Suspense>
      <CockpitClient />
    </Suspense>
  );
}
