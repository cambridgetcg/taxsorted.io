"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

// One level deep, forever. The doors are plain links and the hub pages are
// the menus — no dropdown can explain a destination better than the hub it
// hides. The bridge into existing accounting software deserves its own door;
// utilities remain visually separate. Every target is at least 44px.
//
// `match` lists every route family that belongs to a door, because the URL
// tree is older than the door tree (Tax tools → /tools also owns /itsa,
// /vat and /dashboard). Trailing slashes are normalized: trailingSlash is
// on, so usePathname() returns "/uk/".
const DOORS = [
  { href: "/books", labelKey: "nav.books", descKey: "nav.books.desc", match: ["/books"], exclude: ["/books/connect"] },
  { href: "/books/connect", labelKey: "nav.connect", descKey: "nav.connect.desc", match: ["/books/connect"] },
  { href: "/checkup", labelKey: "nav.checkup", descKey: "nav.checkup.desc", match: ["/checkup"] },
  { href: "/tools", labelKey: "nav.prepare", descKey: "nav.prepare.desc", match: ["/tools", "/itsa", "/vat", "/dashboard", "/passport"] },
  { href: "/learn", labelKey: "nav.learn", descKey: "nav.learn.desc", match: ["/learn"] },
  { href: "/uk", labelKey: "nav.publicSystem", descKey: "nav.publicSystem.desc", match: ["/uk"] },
] as const;

function doorState(
  door: { href: string; match: readonly string[]; exclude?: readonly string[] },
  pathname: string | null,
): "page" | "section" | undefined {
  if (!pathname) return undefined;
  const p = pathname.replace(/\/+$/, "") || "/";
  if (door.exclude?.some((m) => p === m || p.startsWith(`${m}/`))) return undefined;
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
    <header
      onKeyDown={handleMenuKeyDown}
      className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur-xl"
    >
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
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8"
      >
        <Link href="/" className="group flex min-h-11 items-center gap-3 self-center">
          <span
            aria-hidden="true"
            className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-accent/20 bg-accent-soft font-display text-xl font-bold text-accent-deep"
          >
            <span className="absolute inset-x-1.5 bottom-1.5 h-px bg-warm/60" />
            T
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight text-ink">TaxSorted</span>
            <span className="hidden text-xs text-ink-soft 2xl:inline">{t("nav.tagline")}</span>
          </span>
        </Link>

        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation-links"
          aria-label={t(menuOpen ? "nav.menu.close" : "nav.menu.open")}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-base font-medium text-ink shadow-sm hover:border-line-strong hover:bg-accent-soft xl:hidden"
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
          className={`${menuOpen ? "flex" : "hidden"} soft-shadow w-full max-w-full flex-col divide-y divide-line rounded-2xl border border-line bg-surface p-2 xl:flex xl:w-auto xl:flex-row xl:items-center xl:gap-1 xl:divide-y-0 xl:rounded-full xl:p-1 xl:shadow-sm`}
        >
          {DOORS.map((door) => {
            const state = doorState(door, pathname);
            const { labelId, descId } = doorIds(door.href);

            return (
              <Link
                key={door.href}
                href={door.href}
                onClick={closeMenu}
                aria-current={ariaCurrentFor(state)}
                aria-labelledby={labelId}
                aria-describedby={descId}
                className={`group flex min-h-11 flex-col justify-center rounded-xl px-3.5 py-2.5 transition-colors xl:inline-flex xl:flex-row xl:items-center xl:rounded-full xl:py-0 ${
                  state
                    ? "bg-accent-soft text-accent-deep"
                    : "hover:bg-paper"
                }`}
              >
                <span
                  id={labelId}
                  className={`text-[0.95rem] font-medium ${state ? "font-semibold" : "text-ink xl:text-ink-soft xl:group-hover:text-ink"}`}
                >
                  {t(door.labelKey)}
                </span>
                {/* One plain line of scent per door — mobile only, where the
                    hub page isn't one hover away. */}
                <span id={descId} className="mt-0.5 text-sm text-ink-soft xl:hidden">
                  {t(door.descKey)}
                </span>
              </Link>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-2 pt-1 xl:ms-1 xl:gap-x-2 xl:border-s xl:border-line xl:px-1 xl:ps-2 xl:pt-0">
            <Link
              href="/account"
              onClick={closeMenu}
              aria-current={ariaCurrentFor(doorState({ href: "/account", match: ["/account"] }, pathname))}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-[0.95rem] font-medium text-ink hover:bg-paper hover:text-accent-deep"
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
