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
  title: "TaxSorted — UK VAT made simple",
  description: "Turn your sales and purchases into a correct UK VAT return. Plain English, no jargon.",
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
        <header className="border-b border-gray-200 bg-white">
          <nav
            aria-label="Main"
            className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
          >
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-gray-900">TaxSorted</span>
              <span className="hidden text-sm text-gray-500 sm:inline">UK VAT, made simple</span>
            </Link>
            <div className="flex items-center gap-5 text-sm">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
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
