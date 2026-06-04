// VAT return deadlines.
//
// HMRC rule: a return (and payment) is due "one calendar month and 7 days" after the
// end of the VAT period. Standard quarters end on a month-end, so:
//   period ends 31 Mar → due 7 May · period ends 30 Jun → due 7 Aug
// When HMRC's obligations API gives an explicit `due`, prefer that; this is for planning
// ahead and for showing a clear countdown.

import { addDays, addMonths, isLastDayOfMonth, lastDayOfMonth, differenceInCalendarDays, parseISO } from "date-fns";

const toDate = (d: Date | string): Date => (typeof d === "string" ? parseISO(d) : d);

/** The standard due date for a VAT period ending on `periodEnd`. */
export function vatDueDate(periodEnd: Date | string): Date {
  const end = toDate(periodEnd);
  let oneMonthOn = addMonths(end, 1);
  // Keep month-end semantics: 30 Jun + 1 month is 31 Jul (not 30 Jul), then + 7 days.
  if (isLastDayOfMonth(end)) oneMonthOn = lastDayOfMonth(oneMonthOn);
  return addDays(oneMonthOn, 7);
}

/** Whole calendar days from `today` until `due` (negative = overdue). */
export function daysUntilDue(due: Date | string, today: Date | string = new Date()): number {
  return differenceInCalendarDays(toDate(due), toDate(today));
}

export type DueStatus = "overdue" | "due-soon" | "upcoming";

/** Traffic-light status for a deadline. `due-soon` defaults to within 14 days. */
export function dueStatus(
  due: Date | string,
  opts: { today?: Date | string; soonWithinDays?: number } = {},
): DueStatus {
  const days = daysUntilDue(due, opts.today ?? new Date());
  if (days < 0) return "overdue";
  if (days <= (opts.soonWithinDays ?? 14)) return "due-soon";
  return "upcoming";
}
