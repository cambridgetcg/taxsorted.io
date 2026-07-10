import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    "TaxSorted makes tax simple and fun for everyone — plain words in multiple languages, the UK tax game explained, and a deep, non-partisan look at UK tax politics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <I18nProvider>
          {/* One shared shell on every page — navigation can never disappear. */}
          <SiteNav />
          <main>{children}</main>
          {/* Open Government Licence attribution: Learn pages quote Crown-copyright
              material (gov.uk, legislation.gov.uk) verbatim, and OGL v3 requires an
              attribution statement wherever that material is republished. Site-wide
              footer keeps every page covered. */}
          <footer className="mt-12 border-t border-line">
            <div className="mx-auto max-w-4xl space-y-2 px-4 py-6 text-xs text-ink-soft sm:px-6 lg:px-8">
              <p>
                Contains public sector information licensed under the{" "}
                <a
                  href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-accent underline hover:text-accent-deep"
                >
                  Open Government Licence v3.0
                </a>
                .
              </p>
              <p>
                Contains Parliamentary information licensed under the{" "}
                <a
                  href="https://www.parliament.uk/site-information/copyright/open-parliament-licence/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-accent underline hover:text-accent-deep"
                >
                  Open Parliament Licence v3.0
                </a>
                . That licence expressly excludes personal data; it also does not cover
                Parliamentary photographs, which this directory does not republish. See the
                politics publishing method for the separate data-protection gate.
              </p>
              {/* Non-association note (naming-clearance mitigation, G1 decision
                  2026-07-07): other businesses trade under near-identical names in
                  the same market — say plainly that we are not them. */}
              <p>
                TaxSorted.io is a free, open-source software project. It is not
                connected to taxsorted.co.uk (a tax-refund service) or to
                Tax-Sorted Ltd.
              </p>
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
