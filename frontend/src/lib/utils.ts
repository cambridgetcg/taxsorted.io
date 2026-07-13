import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatReference(ref: string, maxLength = 12): string {
  if (ref.length <= maxLength) return ref;
  return `${ref.slice(0, maxLength - 3)}...`;
}

/** A VAT period as "Jan – Mar 2024". One definition, imported everywhere. */
export function formatPeriod(start: string, end: string): string {
  const startMonth = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(start));
  const endMonth = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(end));
  return `${startMonth} – ${endMonth}`;
}
