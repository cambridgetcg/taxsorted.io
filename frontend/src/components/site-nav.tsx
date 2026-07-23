"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

// One level deep, forever. The doors are plain links and the hub pages are
// the menus — no dropdown can explain a destination better than the hub it
// hides. What makes this nav "pro" is fit, not features: a you-are-here
// marker on the active door, one accent pill for the site's single next
// step, 44px targets, six locales, RTL-safe logical positioning.
//
// `match` lists every route family that belongs to a door, because the URL
// tree is older than the door tree (Do my tax → /tools also owns /itsa,
// /vat and /dashboard). Trailing slashes are normalized: trailingSlash is
// on, so usePathname() returns "/uk/".
const DOORS = [
  { href: "/checkup", labelKey: "nav.checkup", descKey: "nav.checkup.desc", pill: true, match: ["/checkup"] },
  { href: "/tools", labelKey: "nav.prepare", descKey: "nav.prepare.desc", pill: false, match: ["/tools", "/itsa", "/vat", "/dashboard", "/passport"] },
  { href: "/learn", labelKey: "nav.learn", descKey: "nav.learn.desc", pill: false, match: ["/learn"] },
  { href: "/uk", labelKey: "nav.publicSystem", descKey: "nav.publicSystem.desc", pill: false, match: ["/uk"] },
] as const;

function doorState(
  door: { href: string; match: readonly string[] },
  pathname: string | null,
): "page" | "section" | undefined {
  if (!pathname) return undefined;
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === door.href) return "page";
  return door.match.some((m) => p === m || p.startsWith(`${m}/`)) ? "section" : undefined;
}

function ariaCurrentFor(state: "page" | "section" | undefined): "page" | "true" | undefined {
  return state === "page" ? "page" : state === "section" ? "true" : undefined;
}

/** Stable element ids so links can name themselves by their label alone and
    carry the one-line description as a description, not as name noise. */
function doorIds(href: string) {
  const slug = href.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "home";
  return { labelId: `nav-door-${slug}-label`, descId: `nav-door-${slug}-desc` };
}

export function SiteNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => setMenuOpen(false);

  // Back/forward with the menu open lands on a new page — the menu must not
  // still be covering it. React's blessed reset-during-render pattern.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || !menuOpen) return;
    event.preventDefault();
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    // Escape works anywhere in the header — including on the skip link —
    // so the open menu can always be dismissed from where focus actually is.
    <header onKeyDown={handleMenuKeyDown} className="border-b border-line bg-paper">
      {/* First focusable on every page. Lives here (not layout.tsx) so it
          speaks the reader's language; start-* keeps it right under RTL. */}
      <a
        href="#main-content"
        className="fixed start-4 top-3 z-[100] -translate-y-24 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        {t("nav.skip")}
      </a>
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 sm:px-6 lg:px-8"
      >
        <Link href="/" className="flex min-h-11 items-baseline gap-2 self-center">
          <span className="self-center text-lg font-semibold tracking-tight text-ink">
            TaxSorted
          </span>
          <span className="hidden self-center text-sm text-ink-soft md:inline">
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
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper px-3.5 text-base font-medium text-ink hover:bg-accent-soft lg:hidden"
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
          className={`${menuOpen ? "flex" : "hidden"} w-full max-w-full flex-col divide-y divide-line border-t border-line pt-1 lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-2 lg:divide-y-0 lg:border-0 lg:pt-0`}
        >
          {DOORS.map((door) => {
            const state = doorState(door, pathname);
            const { labelId, descId } = doorIds(door.href);

            if (door.pill) {
              return (
                <div key={door.href} className="py-2 lg:py-0">
                  <Link
                    href={door.href}
                    onClick={closeMenu}
                    aria-current={ariaCurrentFor(state)}
                    aria-describedby={descId}
                    className={`inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-base font-semibold text-white transition-colors lg:w-auto ${
                      state ? "bg-accent-deep" : "bg-accent hover:bg-accent-deep"
                    }`}
                  >
                    {t(door.labelKey)}
                  </Link>
                  <span id={descId} className="mt-1 block text-center text-sm text-ink-soft lg:hidden">
                    {t(door.descKey)}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={door.href}
                href={door.href}
                onClick={closeMenu}
                aria-current={ariaCurrentFor(state)}
                aria-labelledby={labelId}
                aria-describedby={descId}
                className="group flex min-h-11 flex-col justify-center py-2.5 lg:inline-flex lg:flex-row lg:items-center lg:py-0"
              >
                {/* Underline sits on the span: text-decoration does not
                    propagate into flex items, so the Link can't carry it.
                    aria-labelledby keeps the link's NAME to this label alone;
                    the scent line below is a description, not name noise. */}
                <span
                  id={labelId}
                  className={`text-base font-medium ${
                    state
                      ? "font-semibold text-ink underline decoration-accent decoration-2 underline-offset-8"
                      : "text-ink lg:text-ink-soft lg:group-hover:text-ink"
                  }`}
                >
                  {t(door.labelKey)}
                </span>
                {/* One plain line of scent per door — mobile only, where the
                    hub page isn't one hover away. */}
                <span id={descId} className="mt-0.5 text-sm text-ink-soft lg:hidden">
                  {t(door.descKey)}
                </span>
              </Link>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-1 lg:gap-x-6 lg:pt-0">
            <Link
              href="/account"
              onClick={closeMenu}
              aria-current={ariaCurrentFor(doorState({ href: "/account", match: ["/account"] }, pathname))}
              className="inline-flex min-h-11 items-center text-base font-medium text-ink hover:text-accent-deep"
            >
              {t("nav.account")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>
    </header>
  );
}
