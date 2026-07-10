import type { Pence, SdltBandResult } from "./types";

function pounds(pence: Pence | number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function bandLabel(fromPence: Pence, upToPence: Pence | null): string {
  if (upToPence === null) return `Amount above ${pounds(fromPence)}`;
  if (fromPence === 0) return `First ${pounds(upToPence)}`;
  return `${pounds(fromPence)} to ${pounds(upToPence)}`;
}

export function explainBands(bands: SdltBandResult[], taxDuePence: Pence): string[] {
  const lines = bands.map(
    (band) =>
      `${pounds(band.amountTaxedPence)} at ${(band.rateBasisPoints / 100).toFixed(2)}% ` +
      `contributes ${pounds(band.taxPenceBeforeFinalRounding)} before final rounding.`
  );
  lines.push(`HMRC's rule rounds the final result down to ${pounds(taxDuePence)}.`);
  return lines;
}
