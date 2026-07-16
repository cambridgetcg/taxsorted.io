import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SiteNav } from "@/components/site-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaxSorted — Tax, understood. Then sorted.",
  description:
    "Use the UK Tax Checkup to find the right source-backed check, prepare from your records, and follow the public rules, money and institutions around tax.",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }} />
        <I18nProvider>
          <a
            href="#main-content"
            className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 motion-reduce:transition-none"
          >
            Skip to main content
          </a>
          {/* One shared shell on every page — navigation can never disappear. */}
          <SiteNav />
          <main id="main-content" tabIndex={-1} className="focus:outline-none">
            {children}
          </main>
          {/* One line + three worded links. The full licence and attribution
              text (OGL, OPL, AGPL, non-association note) lives once, at
              /about#licences, linked from every page here. */}
          <footer className="mt-12 border-t border-line">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 text-sm text-ink-soft sm:px-6 lg:px-8">
              <p>TaxSorted is free and open-source, built in the open.</p>
              <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-2">
                <Link
                  href="/about"
                  className="inline-flex min-h-11 items-center font-medium text-accent underline hover:text-accent-deep"
                >
                  About
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  href="/tools"
                  className="inline-flex min-h-11 items-center font-medium text-accent underline hover:text-accent-deep"
                >
                  All tools
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  href="/feedback"
                  className="inline-flex min-h-11 items-center font-medium text-accent underline hover:text-accent-deep"
                >
                  Feedback
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  href="/about#licences"
                  className="inline-flex min-h-11 items-center font-medium text-accent underline hover:text-accent-deep"
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
