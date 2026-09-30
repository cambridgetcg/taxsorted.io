"use client";

import { useSearchParams } from "next/navigation";
import { PREPARATION_YEARS, type PreparationYear } from "@/lib/return-preparation";
import { PrepareClient } from "./prepare-client";

export function PrepareEntry() {
  const params = useSearchParams();
  const years = params.getAll("year");
  const requestedYear: PreparationYear =
    years.length === 1 && PREPARATION_YEARS.includes(years[0] as PreparationYear)
      ? (years[0] as PreparationYear)
      : "2025-26";

  // The link selects a year. Reading its saved draft still needs Start or Resume.
  return <PrepareClient requestedYear={requestedYear} />;
}
