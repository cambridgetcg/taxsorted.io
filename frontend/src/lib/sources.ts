// i18n: deferred to M2 — plain English for launch

import type { SourceType } from "@taxsorted/engine/uk/itsa";

/** The two MTD ITSA income sources, with display label and plain-words one-liner. */
export const SOURCES: { value: SourceType; label: string; plain: string }[] = [
  {
    value: "self-employment",
    label: "Self-employment",
    plain: "Income and costs from running your own business",
  },
  {
    value: "uk-property",
    label: "UK property",
    plain: "Income and costs from letting UK property",
  },
];
