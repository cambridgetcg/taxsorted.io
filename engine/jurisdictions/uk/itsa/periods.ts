// MTD ITSA quarterly reporting periods, deadlines, and the current penalty position.
//
// Quarterly updates are cumulative from the start of the tax year (or, under the calendar
// election, from the start of the calendar-aligned Q1) — `cumulativeStart` is the same for
// all four quarters of a given election. Deadlines are the 7th of the month following the
// period end, fixed by election (standard and calendar share the same four deadline dates —
// only the period edges move).
//
// CAVEAT: deadlines below are built to gov.uk's published 7th-of-month dates. M2 reads the
// live Obligations API rather than trusting these — treat this file as the documented
// fallback/default, not the source of truth once the API is wired.

import type { TaxYear } from './types'

export interface Quarter {
  index: 1 | 2 | 3 | 4
  periodStart: string      // ISO yyyy-mm-dd
  periodEnd: string        // ISO yyyy-mm-dd
  cumulativeStart: string  // ISO yyyy-mm-dd; same across all 4 quarters of an election
  deadline: string         // ISO yyyy-mm-dd
}

const PENALTIES_SOURCE = 'https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax'

function startYearOf(taxYear: TaxYear): number {
  const [start] = taxYear.split('-')
  return parseInt(start, 10)
}

/**
 * The four quarterly periods for a tax year, under the standard (6th-of-month) or calendar
 * (1st-of-month) quarter election. Deadlines are identical between elections — only the
 * period boundaries shift. Checked against SI 2026/336 Tables 1 and 2 for 2026-27 only: for a
 * later year the first period can start differently when the election changed from the year
 * before (regs 12(2)(a) and 13(2)(a)), and that transition is not modelled here.
 */
export function quartersFor(taxYear: TaxYear, election: 'standard' | 'calendar'): Quarter[] {
  const y0 = startYearOf(taxYear)
  const y1 = y0 + 1

  const deadlines = [`${y0}-08-07`, `${y0}-11-07`, `${y1}-02-07`, `${y1}-05-07`]

  const edges = election === 'standard'
    ? [
        { periodStart: `${y0}-04-06`, periodEnd: `${y0}-07-05` },
        { periodStart: `${y0}-07-06`, periodEnd: `${y0}-10-05` },
        { periodStart: `${y0}-10-06`, periodEnd: `${y1}-01-05` },
        { periodStart: `${y1}-01-06`, periodEnd: `${y1}-04-05` },
      ]
    : [
        { periodStart: `${y0}-04-01`, periodEnd: `${y0}-06-30` },
        { periodStart: `${y0}-07-01`, periodEnd: `${y0}-09-30` },
        { periodStart: `${y0}-10-01`, periodEnd: `${y0}-12-31` },
        { periodStart: `${y1}-01-01`, periodEnd: `${y1}-03-31` },
      ]

  const cumulativeStart = edges[0].periodStart

  return edges.map((edge, i) => ({
    index: (i + 1) as 1 | 2 | 3 | 4,
    periodStart: edge.periodStart,
    periodEnd: edge.periodEnd,
    cumulativeStart,
    deadline: deadlines[i],
  }))
}

/**
 * The quarter a date falls in, or null if the date is outside the tax year's four periods
 * (ISO yyyy-mm-dd strings sort lexicographically, so plain comparison is enough here).
 */
export function quarterForDate(date: string, taxYear: TaxYear, election: 'standard' | 'calendar'): Quarter | null {
  const quarters = quartersFor(taxYear, election)
  return quarters.find((q) => date >= q.periodStart && date <= q.periodEnd) ?? null
}

/**
 * The quarterly-update penalty-points position for a tax year. For 2026-27, HMRC's penalties
 * guidance says there are no penalties for missing a quarterly-update deadline, but late-payment
 * penalties and the 31 January return deadline are unaffected; the statutory basis is not
 * admitted here. For quarterly updates in tax years after 2026-27 the guidance describes a
 * points-based regime, and the note is a summary, not a penalty calculation. Years before
 * 2026-27 are not modelled: the function still returns the later-year branch for them, so
 * callers should not pass one.
 */
export function penaltyPosition(taxYear: TaxYear): { quarterlyPoints: boolean; note: string; source: string } {
  if (taxYear === '2026-27') {
    return {
      quarterlyPoints: false,
      note: 'No penalty points for late quarterly updates in 2026-27: HMRC says there are no penalties for missing a 2026-27 quarterly-update deadline. Every update must still be sent before the tax return can be submitted. Late payment penalties still apply under their own timing rules, and the tax-return deadline is separate.',
      source: PENALTIES_SOURCE,
    }
  }
  return {
    quarterlyPoints: true,
    note: 'Points-based regime for tax years after 2026-27: 1 penalty point per missed quarterly update deadline; a £200 penalty applies once 4 points are reached. This is not a full penalty position: missed tax-return deadlines also earn points, once at the threshold a further £200 penalty applies each time another submission deadline is missed, the threshold can differ (2 points if you become exempt in 2027-28), and late payment penalties are separate.',
    source: PENALTIES_SOURCE,
  }
}
