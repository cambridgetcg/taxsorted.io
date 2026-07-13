"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

export function SiteNav() {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => setMenuOpen(false);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

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
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation-links"
          aria-label={t(menuOpen ? "nav.menu.close" : "nav.menu.open")}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm font-medium text-ink hover:bg-accent-soft lg:hidden"
        >
          {menuOpen ? (
            <X aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Menu aria-hidden="true" className="h-4 w-4" />
          )}
          {t("nav.menu")}
        </button>
        <div
          id="primary-navigation-links"
          onKeyDown={handleMenuKeyDown}
          className={`${menuOpen ? "flex" : "hidden"} w-full max-w-full flex-col items-start gap-x-4 gap-y-3 border-t border-line pt-3 text-sm lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:border-0 lg:pt-0`}
        >
          <Link href="/learn" onClick={closeMenu} className="text-ink-soft hover:text-ink">
            {t("nav.learn")}
          </Link>
          <Link href="/uk/tax-expert" onClick={closeMenu} className="font-medium text-accent hover:text-accent-deep">
            Tax expert
          </Link>
          <Link href="/uk/personal-tax" onClick={closeMenu} className="text-ink-soft hover:text-ink">
            {t("nav.playbook")}
          </Link>
          <Link href="/uk/tax-industry" onClick={closeMenu} className="text-ink-soft hover:text-ink">
            Industry
          </Link>
          <Link href="/uk/charities" onClick={closeMenu} className="text-ink-soft hover:text-ink">
            Charities
          </Link>
          <Link href="/uk/public-funding" onClick={closeMenu} className="text-ink-soft hover:text-ink">
            Public money
          </Link>
          <Link href="/uk/accountability" onClick={closeMenu} className="text-ink-soft hover:text-ink">
            Accountability
          </Link>
          <Link href="/uk/politics" onClick={closeMenu} className="text-ink-soft hover:text-ink">
            {t("nav.politics")}
          </Link>
          <Link href="/dashboard" onClick={closeMenu} className="text-ink-soft hover:text-ink">
            {t("nav.dashboard")}
          </Link>
          {/* i18n: deferred to M2 — plain English for launch */}
          <Link href="/itsa" onClick={closeMenu} className="text-ink-soft hover:text-ink">
            Income Tax (MTD)
          </Link>
          {/* i18n: deferred to M2 — plain English for launch */}
          <Link href="/account" onClick={closeMenu} className="text-ink-soft hover:text-ink">
            Account
          </Link>
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
