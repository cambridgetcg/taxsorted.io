import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "TaxSorted — Tax, understood. Then sorted.",
  description:
    "Check your UK tax position, compare lawful choices, keep browser-local books, prepare filings with consent, and find the right correction or challenge route.",
};

// Runs before first paint (static export — no server): reads the saved
// language and sets the page's lang + text direction, so an Urdu reader
// never sees a left-to-right flash. Must mirror LOCALES in dictionaries.ts.
const LOCALE_BOOT_SCRIPT = `try{var l=localStorage.getItem("taxsorted.locale");if(["en","zh-Hant","zh-Hans","pl","hi","ur"].indexOf(l)>-1){var d=document.documentElement;d.lang=l;d.dir=l==="ur"?"rtl":"ltr";}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the boot script above may change lang/dir
    // before React hydrates — that difference is deliberate.
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }} />
        <I18nProvider>
          {/* One shared shell on every page — navigation can never disappear.
              The skip link lives inside SiteNav so it can speak the reader's
              language; it is still the first focusable thing on the page. */}
          <SiteNav />
          <main id="main-content" tabIndex={-1} className="focus:outline-none">
            {children}
          </main>
          <footer className="mt-20 border-t border-line bg-surface/60">
            <div lang="en" dir="ltr" className="mx-auto grid max-w-7xl gap-7 px-4 py-9 text-sm text-ink-soft sm:px-6 md:grid-cols-[1fr_auto] md:items-end lg:px-8">
              <div className="max-w-xl">
                <p className="font-display text-2xl font-semibold tracking-tight text-ink">
                  Tax, understood. Then sorted.
                </p>
                <p className="mt-2">Free and open-source, built in the open. Prepared and filed always mean different things.</p>
              </div>
              <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-3 gap-y-1 md:justify-end">
                <Link
                  href="/plan"
                  className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep"
                >
                  Plan
                </Link>
                <Link
                  href="/put-it-right"
                  className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep"
                >
                  Put it right
                </Link>
                <Link
                  href="/uk"
                  className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep"
                >
                  UK system
                </Link>
                <Link
                  href="/trust"
                  className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep"
                >
                  Trust and boundaries
                </Link>
                <Link
                  href="/feedback"
                  className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep"
                >
                  Feedback
                </Link>
                <Link
                  href="/about"
                  className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep"
                >
                  About
                </Link>
                <Link
                  href="/about#licences"
                  className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep"
                >
                  Licences
                </Link>
              </nav>
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
