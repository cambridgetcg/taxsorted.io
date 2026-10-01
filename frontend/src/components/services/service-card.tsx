import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { SERVICE_AVAILABILITY_LABELS, type TaxService } from "@/lib/tax-services";

export const SERVICE_STATUS = {
  available: "bg-accent-soft text-accent-deep",
  guidance: "bg-surface-muted text-ink-soft",
  sandbox: "bg-amber-50 text-amber-900",
} as const;

export function ServiceCard({ service, number }: { service: TaxService; number?: number }) {
  const status = SERVICE_STATUS[service.availability];
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-line-strong">
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status}`}>{SERVICE_AVAILABILITY_LABELS[service.availability]}</span>
        {number !== undefined ? <span aria-hidden="true" className="font-mono text-sm text-ink-faint">{String(number).padStart(2, "0")}</span> : <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-ink-faint" />}
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">{service.name}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{service.description}</p>
      <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-ink-soft">{service.boundary}</p>
      <Link href={service.href} className="mt-auto inline-flex min-h-11 items-center gap-2 pt-4 text-sm font-semibold text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep">
        {service.action}<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
      </Link>
    </article>
  );
}
