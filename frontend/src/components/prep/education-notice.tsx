// i18n: deferred to M2 — plain English for launch

/**
 * The honesty line every ITSA prep page carries: this is education and
 * arithmetic, not advice, and nothing here has been submitted to HMRC.
 * The status claims stay visible on every page — never behind a disclosure:
 * a reader must not need a click to learn nothing is sent to HMRC.
 * Copy is exact — do not soften "working towards HMRC recognition"
 * into "approved" or similar; that claim isn't true yet.
 */
export function EducationNotice() {
  return (
    <div
      role="note"
      className="rounded-2xl border border-line bg-accent-soft p-4 text-base text-ink sm:p-5"
    >
      <p>
        <strong>Education, not advice.</strong>{" "} The number that counts is the one HM Revenue
        &amp; Customs (HMRC) calculates. We are working towards HMRC recognition; this tool
        does not yet submit anything to HMRC.
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer font-medium text-accent">What this means</summary>
        <p className="mt-2 text-ink-soft">
          TaxSorted explains the rules and does the arithmetic; it doesn&apos;t know your full
          situation, so every figure here is an estimate.
        </p>
      </details>
    </div>
  );
}
