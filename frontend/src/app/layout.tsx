import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

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
    "TaxSorted is making tax simple for everyone — plain words, figures derived from your records, honest filing. For people, businesses, charities and trusts. The UK is drawn first.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* One shared shell on every page — navigation can never disappear. */}
        <header className="border-b border-line bg-paper">
          <nav
            aria-label="Main"
            className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
          >
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-ink">TaxSorted</span>
              <span className="hidden text-sm text-ink-soft sm:inline">
                Tax, understood. Then sorted.
              </span>
            </Link>
            <div className="flex items-center gap-5 text-sm">
              <Link href="/dashboard" className="text-ink-soft hover:text-ink">
                Dashboard
              </Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
