"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { TaxSortedLockup } from "@/components/brand/TaxSortedLockup";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { isLocalApp } from "@/lib/local-runtime";
import { useMounted } from "@/lib/use-mounted";

// The service hubs explain the available tools; the navigation follows the
// person's task. Existing URLs stay usable as the product's language changes.
// Utilities remain visually separate.
// Every target is at least 44px.
//
// `match` lists every route family that belongs to a door, because the URL
// tree is older than the door tree. `exclude` resolves the few paths whose
// URL parent belongs to another human job. Trailing slashes are normalized:
// trailingSlash is on, so usePathname() returns "/uk/".
const DOORS = [
  { href: "/services", labelKey: "nav.services", descKey: "nav.services.desc", match: ["/services", "/prepare", "/plan", "/file", "/passport", "/itsa", "/vat", "/dashboard"], exclude: ["/itsa/am-i-in", "/itsa/records"] },
  { href: "/checkup", labelKey: "nav.checklist", descKey: "nav.checklist.desc", match: ["/checkup", "/itsa/am-i-in", "/uk/tax-expert", "/uk/personal-tax"] },
  { href: "/books", labelKey: "nav.records", descKey: "nav.records.desc", match: ["/books", "/itsa/records", "/tools/mileage"] },
  { href: "/learn", labelKey: "nav.guides", descKey: "nav.guides.desc", match: ["/learn", "/understanding", "/uk"], exclude: ["/uk/tax-expert", "/uk/personal-tax"] },
  { href: "/put-it-right", labelKey: "nav.help", descKey: "nav.help.desc", match: ["/put-it-right"] },
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
  const mounted = useMounted();
  const localApp = mounted && isLocalApp();
  const utilityHref = localApp ? "/download" : "/account";
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
        {/* The lockup is artwork, so the link takes its name from hidden text.
            Below sm the small drawing (153px wide) leaves room for the menu
            button on a 320px phone; the regular drawing never goes under 180px.
            The 2xl tagline sits under the lockup, and w-min breaks a long one
            (Polish) onto two lines: a link wider than the lockup pushes the
            doors onto a second row. */}
        <Link href="/" className="flex min-h-11 w-min flex-col items-start justify-center self-center text-ink">
          <span className="sr-only">TaxSorted</span>
          <TaxSortedLockup size="small" className="h-8 w-auto sm:hidden" />
          <TaxSortedLockup className="hidden h-9 w-auto sm:block" />
          <span className="hidden text-xs text-ink-soft 2xl:inline">{t("nav.tagline")}</span>
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
            const href = localApp && door.href === "/books" ? "/books/workspace" : door.href;
            const state = doorState({ ...door, href }, pathname);
            const { labelId, descId } = doorIds(door.href);

            return (
              <Link
                key={door.href}
                href={href}
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
              href={utilityHref}
              onClick={closeMenu}
              aria-current={ariaCurrentFor(doorState({ href: utilityHref, match: [utilityHref] }, pathname))}
              lang={localApp ? "en" : undefined}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-[0.95rem] font-medium text-ink hover:bg-paper hover:text-accent-deep"
            >
              {localApp ? "Local app" : t("nav.account")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>
    </header>
  );
}
