// i18n: deferred to M2 — plain English for launch

/**
 * The honesty line every ITSA prep page carries: this is education and
 * arithmetic, not advice, and nothing here has been submitted to HMRC.
 * Copy is exact — do not soften "working towards HMRC recognition" into
 * "approved" or similar; that claim isn't true yet.
 */
export function EducationNotice() {
  return (
    <div role="note" className="rounded-2xl border border-line bg-accent-soft p-4 text-sm text-ink sm:p-5">
      <p>
        <strong>Education, not advice.</strong> TaxSorted explains the rules and does the
        arithmetic; it doesn&apos;t know your full situation. Figures are estimates —
        HMRC&apos;s own calculation is the number that counts. We are working towards HMRC
        recognition; this tool does not yet submit anything to HMRC.
      </p>
    </div>
  );
}
