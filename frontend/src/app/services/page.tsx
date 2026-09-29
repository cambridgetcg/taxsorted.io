import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, House, UserRound, UsersRound, Building2 } from "lucide-react";
import { AUDIENCES } from "@/lib/tax-services";
import { ServiceDirectory } from "./service-directory";

export const metadata: Metadata = {
  title: "Tax services for people, businesses and advisers | TaxSorted",
  description: "Find the right UK tax check, money records, planning tool or handover. Start with your situation and see what each service can do today.",
};

const ICONS = { individuals: UserRound, "sole-traders": BriefcaseBusiness, landlords: House, advisers: UsersRound, organisations: Building2 };

export default function ServicesPage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-3xl">
        <p className="section-label">TaxSorted services · United Kingdom</p>
        <h1 className="hero-title mt-5 text-ink">What would you like to sort?</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">Understand what applies to you, organise your records, and prepare your next step. Choose your situation to see a useful starting point.</p>
      </header>
      <section aria-labelledby="audience-title" className="mt-10">
        <h2 id="audience-title" className="text-sm font-semibold text-ink">Start with you</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {AUDIENCES.slice(0, 3).map((audience) => {
            const Icon = ICONS[audience.id];
            return (
              <Link key={audience.id} href={`/services/${audience.id}`} className="group flex flex-col rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent hover:bg-accent-soft">
                <Icon aria-hidden="true" className="h-7 w-7 text-accent" />
                <h3 className="mt-5 text-xl font-semibold text-ink">{audience.name}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{audience.description}</p>
                <span className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-accent">Explore services<ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-line px-5 py-3 text-sm">
          <span className="text-ink-soft">Helping someone else?</span>
          {AUDIENCES.slice(3).map((audience) => <Link key={audience.id} href={`/services/${audience.id}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent underline decoration-line-strong underline-offset-4">{audience.name}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>)}
        </div>
        <p className="mt-4 text-sm leading-6 text-ink-soft">More than one situation fits? You can use more than one path. Business and property records stay separate.</p>
      </section>
      <ServiceDirectory />
      <aside className="mt-12 grid gap-5 rounded-2xl bg-accent-soft p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <div>
          <h2 className="text-xl font-semibold text-ink">Know what happens to your work.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">Money records stay in this browser; make a backup before moving devices. Tax checks explain their scope. Preparing figures does not file a return: HMRC submission is currently a test service.</p>
        </div>
        <Link href="/trust" className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">How TaxSorted works →</Link>
      </aside>
    </div>
  );
}
