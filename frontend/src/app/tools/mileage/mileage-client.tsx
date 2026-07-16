"use client";

// i18n: deferred to M2 — plain English for launch

import { useId, useState } from "react";
import { mileageDeduction, type TaxYear } from "@taxsorted/engine/uk/itsa";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Cited } from "@/components/prep/cited";
import { EducationNotice } from "@/components/prep/education-notice";
import { PillRadioGroup } from "@/components/prep/pill-radio-group";
import { gbpCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

// Pinned to the year the 55p rate applies from — same convention as the
// other ITSA prep pages until a real tax-year picker exists.
const TAX_YEAR: TaxYear = "2026-27";

const VEHICLES: { value: "car-or-van" | "motorcycle"; label: string }[] = [
  { value: "car-or-van", label: "Car or van" },
  { value: "motorcycle", label: "Motorcycle" },
];

const INVALID_MILES_MESSAGE = "Enter a whole number of miles, like 12000 or 12,000";

// The June 2026 rise was backdated to the start of the tax year, so every
// citation on this page carries the same effective-from date (matches the
// engine config's own effectiveFrom for the mileage rates).
const EFFECTIVE_FROM = "2026-04-06";

/**
 * Business miles as typed -> a non-negative integer, tolerating thousands
 * separators and stray spaces ("12,000" / "12 000"). A blank field reads as
 * zero miles; anything non-blank that still doesn't parse to a finite,
 * non-negative integer is 'invalid' and must block the result — never
 * silently read as zero, matching the eligibility form's amount-field
 * convention (parsePounds in @/lib/parse). Miles are plain counts, not
 * money, so that helper doesn't apply here — this is its integer sibling.
 */
function parseMiles(raw: string): number | "invalid" {
  if (raw.trim() === "") return 0;
  const sanitized = raw.replace(/[,\s]/g, "");
  if (sanitized === "") return "invalid";
  const n = Number(sanitized);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return "invalid";
  return n;
}

/**
 * The 55p wedge: a business-miles input and a vehicle toggle feed the
 * engine's `mileageDeduction` live, no submit button — this is arithmetic
 * against gov.uk's own published rates, not a form to send anywhere. The
 * breakdown line carries a `<Cited>` disclosure per engine source (tiered
 * results above 10,000 miles cite both the first-10k and after-10k rates),
 * dated from the 2026-04-06 backdate, and the copy above leads with the
 * June 2026 rate rise — the fact most other software still gets wrong.
 */
export default function MileageClient() {
  const [milesInput, setMilesInput] = useState("");
  const [vehicle, setVehicle] = useState<"car-or-van" | "motorcycle">("car-or-van");
  const milesId = useId();

  const parsedMiles = parseMiles(milesInput);
  const error = parsedMiles === "invalid" ? INVALID_MILES_MESSAGE : null;
  const miles = typeof parsedMiles === "number" ? parsedMiles : 0;

  const result = mileageDeduction(miles, vehicle, TAX_YEAR);
  const tiered = result.sources.length > 1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ href: "/tools", label: "Do my tax" }]} current="Mileage" />

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Mileage</h1>
      <p className="mt-3 text-base text-ink-soft">
        Self-employed with a car, van or motorcycle? Enter your business miles for the year.
        The deduction updates as you type, cited to gov.uk.
      </p>

      {/* The rate-rise story is a car/van fact only — the 24p motorcycle rate
          never changed, so showing "you're owed the difference" to a
          motorcycle user would be exactly the kind of confident wrongness
          this page exists to correct. */}
      {vehicle === "car-or-van" ? (
        <Alert className="mt-6 border-accent/40 bg-accent-soft">
          <AlertTitle>HMRC raised this from 45p — you may be owed the difference</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              The car and van rate for the first 10,000 miles was 45p a mile for years. HM
              Revenue &amp; Customs (HMRC) raised it on 17 June 2026, backdated to 6 April
              2026. If your app or spreadsheet still says 45p, you&apos;re owed the difference
              on every business mile since 6 April.
            </p>
            <p>
              One warning: once you use the flat mileage rate for a vehicle, that vehicle stays
              on it while it&apos;s in the business. You can&apos;t switch it to claiming its
              actual running costs later.
            </p>
            <details>
              <summary className="cursor-pointer font-medium text-accent">
                What this means for you
              </summary>
              <p className="mt-2">
                Already sent Q1 at 45p? No redo needed. Each quarter&apos;s running figure is
                worked out fresh from the year&apos;s total miles at the current rate. The
                shortfall catches up by itself next quarter.
              </p>
            </details>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Your deduction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <PillRadioGroup
            label="Vehicle"
            hideLabel
            options={VEHICLES}
            value={vehicle}
            onChange={setVehicle}
          />

          <div className="space-y-1.5">
            <Label htmlFor={milesId}>Business miles this tax year</Label>
            <input
              id={milesId}
              name="business-miles"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={milesInput}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${milesId}-error` : undefined}
              onChange={(e) => setMilesInput(e.target.value)}
              className={cn(
                "flex min-h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-base",
                "placeholder:text-ink-soft focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-accent focus-visible:ring-offset-2",
                error ? "border-red-600 focus-visible:ring-red-600" : undefined
              )}
            />
            {error ? (
              <p id={`${milesId}-error`} className="text-base text-red-600">
                {error}
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-4xl font-bold text-ink">{gbpCompact(result.amount)}</p>
            {tiered ? (
              <>
                {/* Above 10,000 miles the two tiers carry two distinct gov.uk
                    sources, so each gets its own labelled Cited disclosure.
                    The labels name the tier, never the rate string — "55p"
                    must stay a single text node on the page (the breakdown),
                    or exact-text queries and readers alike get two answers. */}
                <p className="mt-1 text-base text-ink-soft">{result.breakdown}</p>
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                  <Cited cite={{ source: result.sources[0], effectiveFrom: EFFECTIVE_FROM }}>
                    first 10,000 miles rate
                  </Cited>
                  <Cited cite={{ source: result.sources[1], effectiveFrom: EFFECTIVE_FROM }}>
                    above 10,000 miles rate
                  </Cited>
                </p>
              </>
            ) : (
              <p className="mt-1 text-base text-ink-soft">
                <Cited cite={{ source: result.sources[0], effectiveFrom: EFFECTIVE_FROM }}>
                  {result.breakdown}
                </Cited>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <EducationNotice />
      </div>
    </div>
  );
}
