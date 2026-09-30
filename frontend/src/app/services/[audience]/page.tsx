import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { AUDIENCES, getAudience, servicesForAudience, allServicesForAudience } from "@/lib/tax-services";
import { ServiceCard } from "@/components/services/service-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const dynamicParams = false;
export function generateStaticParams() { return AUDIENCES.map(({ id }) => ({ audience: id })); }

type Props = { params: Promise<{ audience: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { audience: id } = await params;
  const audience = getAudience(id);
  return { title: audience ? `${audience.name} — tax services | TaxSorted` : "Service not found | TaxSorted", description: audience?.description };
}

const INTRO = {
  individuals: { title: "Make sense of your personal tax.", outcome: "Understand your income, check the parts that apply to you, and collect what you need for a conversation or a return.", points: ["Check personal income interactions", "Keep a tax summary you can hand over", "Find help with mistakes or payments"] },
  "sole-traders": { title: "Less admin. Clearer business records.", outcome: "From your first money movement to a reviewed quarter, work through the steps for your self-employed business.", points: ["Check your Making Tax Digital position", "Review income and costs in one place", "Prepare figures from checked records"] },
  landlords: { title: "Your property income, organised.", outcome: "Keep UK rental income and costs together, separate from a sole trade, and understand your next tax step.", points: ["Check your Making Tax Digital position", "Keep a separate UK property record", "Review totals before preparing a quarter"] },
  advisers: { title: "A clearer starting point, together.", outcome: "Help someone understand their position and prepare a portable handover for review. Start with the same checks and evidence they can see.", points: ["Use the same source-linked checks", "Ask for a deliberate export or handover", "See unknowns and limits alongside the facts"] },
  organisations: { title: "Find the right route for your organisation.", outcome: "Understand the tax identity of a company, partnership, charity or trust, then see the guidance and tools currently available.", points: ["Explore how legal form affects tax", "Find organisation-specific guidance", "See which preparation tools are supported"] },
} as const;

export default async function AudiencePage({ params }: Props) {
  const { audience: id } = await params;
  const audience = getAudience(id);
  if (!audience) notFound();
  const intro = INTRO[audience.id];
  const services = servicesForAudience(audience.id);
  const relatedServices = allServicesForAudience(audience.id).filter((service) => !audience.serviceIds.includes(service.id));
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Breadcrumbs items={[{ href: "/services", label: "Services" }]} current={audience.name} />
      <header className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-start lg:gap-16">
        <div>
          <p className="section-label">For {audience.name.toLowerCase()} · UK</p>
          <h1 className="hero-title mt-5 text-ink">{intro.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">{intro.outcome}</p>
          <Link href={`/checkup?for=${audience.id}`} className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-deep">{["individuals", "sole-traders", "landlords"].includes(audience.id) ? "Open my tax year" : "Build my checklist"}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          <p className="mt-3 text-sm text-ink-soft">No account needed to explore or start a checklist.</p>
        </div>
        <aside className="rounded-2xl border border-line bg-surface p-6 sm:p-7">
          <h2 className="font-semibold text-ink">What you can do here</h2>
          <ul className="mt-5 space-y-4">{intro.points.map((point) => <li key={point} className="flex gap-3 text-sm leading-6 text-ink-soft"><Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />{point}</li>)}</ul>
          <p className="mt-6 border-t border-line pt-5 text-sm leading-6 text-ink-soft">{audience.scope}</p>
        </aside>
      </header>
      <section aria-labelledby="steps-title" className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="section-label">Your services</p><h2 id="steps-title" className="mt-3 font-display text-3xl font-semibold text-ink">Start where you need help.</h2></div>
          <p className="max-w-sm text-sm leading-6 text-ink-soft">Use these in order, or jump straight to the task you came for. Each tool shows its own scope.</p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{services.map((service, index) => <ServiceCard key={service.id} service={service} number={index + 1} />)}</div>
      </section>
      {relatedServices.length > 0 ? <section aria-labelledby="related-title" className="mt-12">
        <h2 id="related-title" className="font-display text-2xl font-semibold text-ink">Also useful for your situation</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{relatedServices.map((service) => <ServiceCard key={service.id} service={service} />)}</div>
      </section> : null}
      <section aria-labelledby="also-title" className="mt-12 rounded-2xl border border-line bg-surface-muted p-6">
        <h2 id="also-title" className="font-semibold text-ink">Another part of your tax to sort?</h2>
        <nav aria-label="Other situations" className="mt-2 flex flex-wrap gap-x-6 gap-y-1">{AUDIENCES.filter((item) => item.id !== audience.id).map((item) => <Link key={item.id} href={`/services/${item.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline decoration-line-strong underline-offset-4">{item.name} →</Link>)}</nav>
      </section>
    </div>
  );
}
