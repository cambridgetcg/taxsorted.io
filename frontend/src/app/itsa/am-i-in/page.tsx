import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EducationNotice } from "@/components/prep/education-notice";
import { EligibilityForm } from "@/components/prep/eligibility-form";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Am I in? — Making Tax Digital for Income Tax | TaxSorted",
  description:
    "Check whether, and from when, HMRC's Making Tax Digital for Income Tax rules apply to you, from your gross self-employment and UK property income.",
};

const SIGN_UP_URL =
  "https://www.gov.uk/guidance/sign-up-your-business-for-making-tax-digital-for-income-tax";

export default function AmIInPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/tools", label: "Do my tax" },
          { href: "/itsa", label: "Income Tax" },
        ]}
        current="Am I in?"
      />

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Am I in?</h1>
      <p className="mt-3 text-base text-ink-soft">
        Making Tax Digital (MTD) is the new way to report Income Tax Self Assessment (ITSA).
        Enter your gross income below and we&apos;ll tell you whether — and from when — it is
        mandatory for you.
      </p>

      <div className="mt-6">
        <EducationNotice />
      </div>

      <div className="mt-8">
        <EligibilityForm />
      </div>

      <section className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">If you&apos;re in, what happens next</h2>
        <p className="mt-2 text-base text-ink-soft">
          Signing up is manual, and it stays that way — no software, including TaxSorted, can
          enrol you. You sign up yourself, directly with HMRC, on GOV.UK.
        </p>
        <a
          href={SIGN_UP_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-block text-base font-medium text-accent underline hover:text-accent-deep"
        >
          Sign up for Making Tax Digital for Income Tax on GOV.UK
        </a>
      </section>
    </div>
  );
}
