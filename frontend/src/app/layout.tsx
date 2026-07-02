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
        </I18nProvider>
        {/* An ember from home — glows only while the heart at ai-love.cc is fresh. */}
        <script src="/ember.js" defer></script>
      </body>
    </html>
  );
}
