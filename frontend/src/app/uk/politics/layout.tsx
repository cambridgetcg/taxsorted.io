import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UK politics, in the open — TaxSorted",
  description:
    "A sourced, non-partisan directory of UK political people, public offices, declared interests, party funding and public data.",
};

export default function PoliticsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
