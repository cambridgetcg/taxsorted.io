"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { AUDIENCES, SERVICES, allServicesForAudience, type AudienceId } from "@/lib/tax-services";
import { ServiceCard } from "@/components/services/service-card";

export function ServiceDirectory() {
  const [audience, setAudience] = useState<AudienceId | "all">("all");
  const [query, setQuery] = useState("");
  const candidates = audience === "all" ? SERVICES : allServicesForAudience(audience);
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const services = candidates.filter((service) => words.every((word) => `${service.name} ${service.description} ${service.boundary}`.toLocaleLowerCase().includes(word)));

  return (
    <section aria-labelledby="directory-title" className="mt-16 border-t border-line pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">Find a service</p>
          <h2 id="directory-title" className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">A useful tool for the task in front of you.</h2>
        </div>
        <Link href="/checkup" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">Help me choose →</Link>
      </div>
      <div className="mt-6 grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-[1fr_16rem]">
        <div>
          <label htmlFor="service-search" className="text-sm font-medium text-ink">What do you need help with?</label>
          <div className="relative mt-2">
            <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-3.5 h-5 w-5 text-ink-faint" />
            <input id="service-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try records, income, VAT or handover" className="min-h-12 w-full rounded-xl border border-line-strong bg-paper py-2 pe-3 ps-10 text-base text-ink placeholder:text-ink-faint" />
          </div>
        </div>
        <div>
          <label htmlFor="service-audience" className="text-sm font-medium text-ink">Who is this for?</label>
          <select id="service-audience" value={audience} onChange={(event) => setAudience(event.target.value as AudienceId | "all")} className="mt-2 min-h-12 w-full rounded-xl border border-line-strong bg-paper px-3 text-base text-ink">
            <option value="all">Everyone</option>
            {AUDIENCES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      </div>
      <div className="my-4 flex min-h-11 items-center justify-between gap-3 text-sm text-ink-soft">
        <p role="status" aria-live="polite">{services.length} {services.length === 1 ? "service" : "services"}{query.trim() ? ` matching “${query.trim()}”` : " available to explore"}</p>
        {query || audience !== "all" ? <button type="button" onClick={() => { setQuery(""); setAudience("all"); }} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 font-medium text-accent underline underline-offset-4"><X aria-hidden="true" className="h-4 w-4" />Clear filters</button> : null}
      </div>
      {services.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{services.map((service) => <ServiceCard key={service.id} service={service} />)}</div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line-strong p-8 text-center">
          <h3 className="text-lg font-semibold text-ink">No services match those filters.</h3>
          <p className="mt-2 text-sm text-ink-soft">Try a shorter search or choose Everyone. The checklist can also help you find a starting point.</p>
          <Link href="/checkup" className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">Find my next step →</Link>
        </div>
      )}
    </section>
  );
}
