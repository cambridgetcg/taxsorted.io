import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, Check, FolderOpen, HardDrive, Laptop, Monitor, Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "TaxSorted Local — your tax workspace on your computer",
  description:
    "An offline TaxSorted app for individuals, sole traders and landlords. Keep money records on your computer, prepare figures and export your work. Local preview for macOS, Windows and Linux.",
};

const platforms = [
  { name: "macOS", format: "DMG / ZIP", detail: "Build a Mac app on macOS.", icon: Laptop },
  { name: "Windows", format: "EXE installer", detail: "Build a Windows installer on Windows.", icon: Monitor },
  { name: "Linux", format: "AppImage", detail: "Build an AppImage on Linux.", icon: Terminal },
];

const localTools = [
  { name: "Your checklist", detail: "Choose your circumstances and keep track of the next steps.", href: "/checkup" },
  { name: "Money records", detail: "Add income and expenses, import CSV files and review your figures.", href: "/books" },
  { name: "Planning & guides", detail: "Use the bundled calculators and read the included tax guides.", href: "/plan" },
  { name: "Adviser handover", detail: "Prepare a Tax Position Passport and export a copy to share yourself.", href: "/passport" },
];

const scaffoldCommands = `node scripts/create-local-project.mjs ../my-taxsorted
cd ../my-taxsorted
npm ci --workspace frontend --workspace @taxsorted/engine --workspace @taxsorted/desktop
npm run desktop:install-runtime
npm run desktop:build
npm run desktop:start`;

export default function DownloadPage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="grid items-start gap-10 lg:grid-cols-[1.35fr_0.8fr] lg:gap-16">
        <div>
          <p className="section-label flex items-center gap-2"><HardDrive size={16} aria-hidden="true" /> TaxSorted Local</p>
          <h1 className="hero-title mt-5 max-w-4xl text-ink">Your tax.<br />Your computer.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-ink-soft">
            A personal workspace for individuals, sole traders and landlords.
            Organise your records, understand your next steps and prepare your figures
            in an app that works offline.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#get-the-app" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-deep">
              Get the local app <ArrowDownToLine size={16} aria-hidden="true" />
            </a>
            <a href="#your-data" className="inline-flex min-h-12 items-center rounded-full border border-line-strong bg-surface px-6 py-3 text-sm font-semibold text-ink hover:border-accent">
              Understand your data
            </a>
          </div>
          <p className="mt-5 text-sm leading-6 text-ink-soft">Free and open-source. No account needed for local tools.</p>
        </div>
        <aside aria-label="How the local app works" className="rounded-[2rem] border border-line bg-surface p-7 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent"><FolderOpen size={24} aria-hidden="true" /></div>
          <h2 className="mt-6 font-display text-2xl font-semibold tracking-tight text-ink">A workspace you keep.</h2>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-ink-soft">
            {[
              "Your working records are saved in the app’s profile on this computer.",
              "The app blocks network requests. No cloud sync or automatic updates.",
              "Export your work when you choose to back it up or share it.",
            ].map((item) => <li key={item} className="flex items-start gap-3"><Check size={17} className="mt-1 shrink-0 text-accent" aria-hidden="true" /><span>{item}</span></li>)}
          </ul>
          <p className="mt-6 border-t border-line pt-5 text-sm leading-6 text-ink-soft">
            Local storage is not an encrypted vault. Protect your computer and keep your own backups.
          </p>
        </aside>
      </header>

      <section id="get-the-app" aria-labelledby="install-title" className="mt-20 scroll-mt-28">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="section-label">01 · Get set up</p>
            <h2 id="install-title" className="section-title mt-4 text-ink">One app, on your own computer.</h2>
          </div>
          <p className="rounded-full border border-warm/35 bg-warm/5 px-4 py-2 text-sm font-medium text-ink">Local preview</p>
        </div>
        <p className="mt-5 max-w-3xl leading-7 text-ink-soft">
          Installer packages are not published yet. You can build this preview from source now;
          the intended download formats are listed below. Public installers need platform testing
          and release signing before they are ready to recommend.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {platforms.map(({ name, format, detail, icon: Icon }) => (
            <article key={name} className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
              <Icon size={27} className="text-accent" aria-hidden="true" />
              <h3 className="mt-5 font-display text-2xl font-semibold text-ink">{name}</h3>
              <p className="mt-2 text-sm font-medium text-ink">{format}</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{detail}</p>
              <p className="mt-6 border-t border-line pt-4 text-sm text-ink-soft">Download not published yet</p>
            </article>
          ))}
        </div>
        <div className="mt-6 rounded-3xl border border-line bg-paper p-6 sm:p-8">
          <h3 className="font-display text-2xl font-semibold text-ink">Build a personal copy</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
            For people comfortable running a few commands: start in a checkout of the TaxSorted
            source, with Node.js 22 and npm installed. Create a separate project, install its
            dependencies, then build and open the app. Dependency installation needs an internet
            connection; using the built app does not.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-2xl border border-line bg-surface p-5 text-xs leading-7 text-ink sm:text-sm"><code>{scaffoldCommands}</code></pre>
          <p className="mt-4 text-sm leading-6 text-ink-soft">
            The scaffold copies source files and excludes app profiles and known private paths.
            Copies run by the same operating-system account share the app’s existing profile.
            Use separate computer accounts for different people’s private records. Build an
            installer on each target operating system; each platform needs its own testing.
          </p>
        </div>
      </section>

      <section aria-labelledby="tools-title" className="mt-20">
        <p className="section-label">02 · Made for the work in front of you</p>
        <h2 id="tools-title" className="section-title mt-4 text-ink">Start locally. Keep making progress.</h2>
        <div className="hairline-grid mt-8 grid overflow-hidden rounded-[2rem] border border-line sm:grid-cols-2 lg:grid-cols-4">
          {localTools.map((tool) => (
            <article key={tool.name} className="flex flex-col items-start bg-surface p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Works offline</p>
              <h3 className="mt-4 font-display text-2xl font-semibold text-ink">{tool.name}</h3>
              <p className="mt-3 mb-6 text-sm leading-6 text-ink-soft">{tool.detail}</p>
              <Link href={tool.href} className="mt-auto inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-accent underline underline-offset-4">Open tool <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
        <div className="mt-6 rounded-3xl border border-line p-6 sm:p-8">
          <h3 className="font-display text-xl font-semibold text-ink">Online connections are outside this preview.</h3>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-ink-soft">
            TaxSorted Account sign-in, HMRC connections and submissions, provider sync, and live
            public data need online services and are unavailable in the local app. Use manual
            entry or CSV import for your records. Preparing figures does not file a return.
            Guides and rules are the versions bundled with the app; updating them requires a
            newer build.
          </p>
        </div>
      </section>

      <section id="your-data" aria-labelledby="data-title" className="mt-20 scroll-mt-28 rounded-[2rem] border border-line bg-surface p-6 sm:p-9">
        <p className="section-label">03 · Your data</p>
        <h2 id="data-title" className="section-title mt-4 text-ink">Know where your work lives.</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">Saved on this computer</h3>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              The app keeps money records, saved Passport drafts, checklists and preferences in
              its own local app profile. This is separate from taxsorted.io in your browser.
              Existing website data is not moved into the app automatically. It has no cloud
              backup, sync or automatic update service.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Books backups are password-protected by default. TaxSorted does not encrypt the
              live app profile, Passport exports or other ordinary exports. Your operating
              system’s account controls and disk protection still matter.
            </p>
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">Bring your work, keep a backup</h3>
            <ol className="mt-3 list-decimal space-y-3 ps-5 text-sm leading-6 text-ink-soft">
              <li>In your existing browser, open Money records → Backups and download a password-protected Books backup. Keep its password separately; TaxSorted cannot reset it.</li>
              <li>In the app’s Backups page, choose that backup and unlock its preview. Save a protected copy of the current Books, review the contents and confirm the restore. Restoring replaces the Books already in that app.</li>
              <li>Export your Passport separately as JSON or an adviser handover. Passport exports are portable copies; Passport import is not available yet.</li>
            </ol>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Keep backups somewhere you control before removing the app profile or moving to
              another computer. A Books backup does not include Passport drafts, receipt
              attachments, checklist progress or account sign-in details.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-sm font-semibold text-accent">
          <Link href="/books/workspace/backups" className="inline-flex min-h-11 items-center underline underline-offset-4">Back up or restore Books →</Link>
          <Link href="/books/workspace" className="inline-flex min-h-10 items-center underline underline-offset-4">Open Money records →</Link>
          <Link href="/passport" className="inline-flex min-h-10 items-center underline underline-offset-4">Open Passport →</Link>
          <Link href="/trust" className="inline-flex min-h-10 items-center underline underline-offset-4">All product boundaries →</Link>
        </div>
      </section>
    </div>
  );
}
