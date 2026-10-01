import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { WorkspaceBackup } from "@/features/workspace-backup";

export const metadata: Metadata = {
  title: "Back up and restore this workspace | TaxSorted",
  description: "Create a password-protected copy of saved Books, Passport, preparation drafts and checklists, or review a workspace backup before replacing saved work.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/backups" },
};

export default function BackupsPage() {
  return <div lang="en" dir="ltr" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
    <Breadcrumbs items={[{ href: "/checkup", label: "My tax year" }]} current="Workspace backups" />
    <header className="mt-7 max-w-3xl">
      <p className="section-label">Your saved work, your copy</p>
      <h1 className="hero-title mt-4 text-ink">Back up and restore this workspace</h1>
      <p className="mt-6 text-lg leading-8 text-ink-soft">Keep a password-protected copy of the work saved in this app or browser. Bring it to another device, or return to an earlier copy when you need to.</p>
    </header>
    <WorkspaceBackup />
  </div>;
}
