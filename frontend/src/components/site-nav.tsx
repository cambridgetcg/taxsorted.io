"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

// Four doors, one account, one language switcher. Every deep page is one click
// from its door's hub, so nothing that left the old flat nav is lost.
const DOORS = [
  { href: "/learn", labelKey: "nav.learn" },
  { href: "/tools", labelKey: "nav.tools" },
  { href: "/uk/money", labelKey: "nav.money" },
  { href: "/about", labelKey: "nav.about" },
] as const;

export function SiteNav() {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => setMenuOpen(false);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || !menuOpen) return;
    event.preventDefault();
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <header className="border-b border-line bg-paper">
      <nav
        aria-label="Main"
        onKeyDown={handleMenuKeyDown}
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8"
      >
        <Link href="/" className="flex min-h-11 items-baseline gap-2 self-center">
          <span className="self-center text-lg font-semibold text-ink">TaxSorted</span>
          <span className="hidden self-center text-sm text-ink-soft sm:inline">
            {t("nav.tagline")}
          </span>
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation-links"
          aria-label={t(menuOpen ? "nav.menu.close" : "nav.menu.open")}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-3 text-base font-medium text-ink hover:bg-accent-soft lg:hidden"
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
          className={`${menuOpen ? "flex" : "hidden"} w-full max-w-full flex-col items-start gap-x-5 gap-y-1 border-t border-line pt-2 text-base lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:border-0 lg:pt-0`}
        >
          {DOORS.map((door) => (
            <Link
              key={door.href}
              href={door.href}
              onClick={closeMenu}
              className="inline-flex min-h-11 items-center text-ink-soft hover:text-ink"
            >
              {t(door.labelKey)}
            </Link>
          ))}
          <Link
            href="/account"
            onClick={closeMenu}
            className="inline-flex min-h-11 items-center font-medium text-ink hover:text-accent-deep"
          >
            {t("nav.account")}
          </Link>
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
