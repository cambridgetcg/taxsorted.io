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
        <div className="flex items-center gap-4 text-sm">
          <Link href="/uk/personal-tax" className="text-ink-soft hover:text-ink">
            {t("nav.playbook")}
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
