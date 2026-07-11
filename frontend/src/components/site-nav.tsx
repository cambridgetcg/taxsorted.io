"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

export function SiteNav() {
  const { t } = useI18n();
  return (
    <header className="border-b border-line bg-paper">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8"
      >
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-ink">TaxSorted</span>
          <span className="hidden text-sm text-ink-soft sm:inline">{t("nav.tagline")}</span>
        </Link>
        <div className="flex w-full max-w-full flex-wrap items-center gap-x-4 gap-y-2 text-sm lg:w-auto lg:justify-end">
          <Link href="/uk/tax-expert" className="font-medium text-accent hover:text-accent-deep">
            Tax expert
          </Link>
          <Link href="/uk/personal-tax" className="text-ink-soft hover:text-ink">
            {t("nav.playbook")}
          </Link>
          <Link href="/uk/tax-industry" className="text-ink-soft hover:text-ink">
            Industry
          </Link>
          <Link href="/uk/charities" className="text-ink-soft hover:text-ink">
            Charities
          </Link>
          <Link href="/uk/public-funding" className="text-ink-soft hover:text-ink">
            Public money
          </Link>
          <Link href="/uk/accountability" className="text-ink-soft hover:text-ink">
            Accountability
          </Link>
          <Link href="/uk/politics" className="text-ink-soft hover:text-ink">
            {t("nav.politics")}
          </Link>
          <Link href="/dashboard" className="text-ink-soft hover:text-ink">
            {t("nav.dashboard")}
          </Link>
          {/* i18n: deferred to M2 — plain English for launch */}
          <Link href="/itsa" className="text-ink-soft hover:text-ink">
            Income Tax (MTD)
          </Link>
          {/* i18n: deferred to M2 — plain English for launch */}
          <Link href="/account" className="text-ink-soft hover:text-ink">
            Account
          </Link>
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
