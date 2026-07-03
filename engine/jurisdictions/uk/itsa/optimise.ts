// Honest optimisers: four statutory reliefs a Self Assessment taxpayer can actually choose
// between — trading/property allowances, Rent-a-Room, and Marriage Allowance. Every
// `Suggestion` states plainly whether the relief helps THIS taxpayer's own numbers, never a
// generic "you could save tax" nudge, and nothing here strays beyond what the relief itself
// is for (commons line: reliefs are education, never schemes).
//
// RENT-A-ROOM INTERPRETATION: `applies` means "Rent-a-Room fully shelters this income", i.e.
// gross <= the relevant limit (£7,500, halved to £3,750 when shared). Under the limit, relief
// is automatic and `applies` is true. OVER the limit, relief stops being automatic — the
// taxpayer must actively elect between the Rent-a-Room method (tax gross less the flat limit)
// and the ordinary method (tax gross less actual expenses), and which one wins depends on
// their own expenses. In that regime `applies` is `false` (nothing is automatically
// sheltered any more) and `why` lays out both figures so the taxpayer can make the election
// themselves — this function does not pick a side once the automatic exemption is gone.

import type { Pence, TaxYear } from './types'
import { configFor } from './config'

export interface Suggestion {
  id: string
  title: string
  saving: Pence | null
  applies: boolean
  why: string
  trap?: string
  cite: string
}

const round = (n: number): Pence => Math.round(n)
const gbp = (pence: Pence): string => `£${(pence / 100).toLocaleString('en-GB')}`

/**
 * The £1,000 trading income allowance vs actual expenses. At or below £1,000 gross, the
 * income qualifies for full relief and does not need to be reported to HMRC at all. Above
 * that, the allowance is only worth claiming if it beats actual expenses — you cannot claim
 * both, and the allowance can never be used to create a loss (it is capped at gross income).
 */
export function tradingAllowanceCheck(grossTradingIncome: Pence, actualExpenses: Pence, taxYear: TaxYear): Suggestion {
  const config = configFor(taxYear)
  const allowance = config.tradingAllowance.value

  if (grossTradingIncome <= allowance) {
    return {
      id: 'trading-allowance',
      title: 'Trading income allowance — full relief',
      saving: Math.max(0, grossTradingIncome - actualExpenses),
      applies: true,
      why: `Your gross trading income of ${gbp(grossTradingIncome)} is at or below the ${gbp(allowance)} trading allowance, so it qualifies for full relief — you don't need to tell HMRC about it or pay any tax on it at all.`,
      trap: 'If your actual expenses were higher than this income, full relief still applies automatically to the income — but it means you cannot instead report a loss to set against other income. Talk to us first if that is your situation.',
      cite: config.tradingAllowance.source,
    }
  }

  const applies = allowance > actualExpenses
  return {
    id: 'trading-allowance',
    title: 'Trading income allowance',
    saving: applies ? allowance - actualExpenses : null,
    applies,
    why: applies
      ? `Claiming the ${gbp(allowance)} trading allowance instead of your ${gbp(actualExpenses)} actual expenses gives you a bigger deduction — ${gbp(allowance - actualExpenses)} more taken off your gross income of ${gbp(grossTradingIncome)}.`
      : `Your actual expenses of ${gbp(actualExpenses)} already beat the ${gbp(allowance)} trading allowance, so claiming the allowance would give you a smaller deduction — stick with actual expenses.`,
    trap: 'You can claim the trading allowance or your actual expenses, never both — and the allowance can never be used to create a loss.',
    cite: config.tradingAllowance.source,
  }
}

/**
 * The £1,000 property income allowance vs actual expenses. Same shape as the trading
 * allowance, but claiming it means also giving up your ACTUAL costs — including residential
 * finance costs, which would otherwise earn the Section 24 20% finance-cost tax credit. The
 * trap on every branch carries all three caveats: allowance and expenses are mutually
 * exclusive; the allowance can never create a loss (stressed when expenses exceed gross,
 * where the actual method would produce a carry-forward loss the allowance gives up); and
 * claiming it forfeits the Section 24 credit.
 */
export function propertyAllowanceCheck(
  grossPropertyIncome: Pence,
  actualExpenses: Pence,
  residentialFinanceCosts: Pence,
  taxYear: TaxYear,
): Suggestion {
  const config = configFor(taxYear)
  const allowance = config.propertyAllowance.value
  const s24Rate = config.s24CreditRate.value
  const lostCredit = round(s24Rate * residentialFinanceCosts)

  // Every branch's trap carries all three caveats: (a) allowance and actual expenses are
  // mutually exclusive; (b) the allowance can never create a loss — stressed when expenses
  // exceed gross, because the actual method WOULD produce a loss to carry forward against
  // future property profits and claiming the allowance gives that loss up; (c) claiming the
  // allowance forfeits the Section 24 residential-finance-cost credit.
  const lossCaveat = actualExpenses > grossPropertyIncome
    ? `and it can never create a loss — under actual expenses you would have a ${gbp(actualExpenses - grossPropertyIncome)} loss to carry forward against future property profits, and claiming the allowance gives that loss up. `
    : 'and it can never be used to create a loss. '
  const s24Caveat = residentialFinanceCosts > 0
    ? `It also forfeits the Section 24 residential finance cost credit — ${s24Rate * 100}% of your ${gbp(residentialFinanceCosts)} finance costs, worth up to ${gbp(lostCredit)}. Weigh that lost credit before choosing the allowance (${config.s24CreditRate.source}).`
    : `It also forfeits the Section 24 residential finance cost credit if you have residential mortgage or loan interest — worth remembering if you take one on later (${config.s24CreditRate.source}).`
  const propertyTrap = `You can claim the property allowance or your actual expenses, never both, ${lossCaveat}${s24Caveat}`

  if (grossPropertyIncome <= allowance) {
    return {
      id: 'property-allowance',
      title: 'Property income allowance — full relief',
      saving: Math.max(0, grossPropertyIncome - actualExpenses),
      applies: true,
      why: `Your gross property income of ${gbp(grossPropertyIncome)} is at or below the ${gbp(allowance)} property allowance, so it qualifies for full relief.`,
      trap: propertyTrap,
      cite: config.propertyAllowance.source,
    }
  }

  const applies = allowance > actualExpenses
  return {
    id: 'property-allowance',
    title: 'Property income allowance',
    saving: applies ? allowance - actualExpenses : null,
    applies,
    why: applies
      ? `Claiming the ${gbp(allowance)} property allowance instead of your ${gbp(actualExpenses)} actual expenses gives you a bigger deduction — ${gbp(allowance - actualExpenses)} more taken off your gross income of ${gbp(grossPropertyIncome)}.`
      : `Your actual expenses of ${gbp(actualExpenses)} already beat the ${gbp(allowance)} property allowance, so claiming the allowance would give you a smaller deduction.`,
    trap: propertyTrap,
    cite: config.propertyAllowance.source,
  }
}

/**
 * Rent-a-Room relief. See the file header for the "applies means fully shelters"
 * interpretation: `applies` is true only when gross income is at or under the relevant limit,
 * in which case relief is automatic and the income is entirely tax-free. Over the limit,
 * relief is no longer automatic — this function reports the two competing figures (Rent-a-
 * Room method vs actual-expenses method) in `why` and leaves the election to the taxpayer, so
 * `applies` stays false even when the Rent-a-Room method would in fact come out lower.
 */
export function rentARoomCheck(grossRoomIncome: Pence, actualExpenses: Pence, shared: boolean, taxYear: TaxYear): Suggestion {
  const config = configFor(taxYear)
  const limit = shared ? config.rentARoomShared.value : config.rentARoom.value
  const limitCite = shared ? config.rentARoomShared.source : config.rentARoom.source
  const sharedNote = shared ? ' (halved because you share the income with someone else)' : ''

  if (grossRoomIncome <= limit) {
    return {
      id: 'rent-a-room',
      title: 'Rent-a-Room relief',
      saving: Math.max(0, grossRoomIncome - actualExpenses),
      applies: true,
      why: `Your income of ${gbp(grossRoomIncome)} is at or below the ${gbp(limit)} Rent-a-Room limit${sharedNote}, so relief is automatic — the whole amount is tax-free and there is nothing to elect.`,
      trap: 'If your actual expenses were higher than this income, you can elect to opt out and be taxed under the normal rules instead, to record a loss — but you must actively choose that; otherwise the automatic exemption applies.',
      cite: limitCite,
    }
  }

  const reliefMethodTaxable = grossRoomIncome - limit
  const actualMethodTaxable = Math.max(0, grossRoomIncome - actualExpenses)
  const betterMethod = reliefMethodTaxable <= actualMethodTaxable ? 'Rent-a-Room' : 'actual expenses'

  return {
    id: 'rent-a-room',
    title: 'Rent-a-Room relief',
    saving: null,
    applies: false,
    why: `Your income of ${gbp(grossRoomIncome)} is over the ${gbp(limit)} Rent-a-Room limit${sharedNote}, so relief is no longer automatic — you must choose. The Rent-a-Room method taxes ${gbp(reliefMethodTaxable)} (income less the flat ${gbp(limit)} limit); the actual-expenses method taxes ${gbp(actualMethodTaxable)} (income less your ${gbp(actualExpenses)} expenses). The ${betterMethod} method comes out lower here, but you still have to elect for it — it is not automatic once you're over the limit.`,
    trap: 'Once you elect for one method for a tax year you are bound to it for that year; you can change your election for a later year.',
    cite: limitCite,
  }
}

/**
 * Marriage Allowance: a spouse or civil partner with unused Personal Allowance can transfer a
 * fixed slice of it to a partner who is a basic-rate taxpayer. Applies only when BOTH hold:
 * the transferring partner's income is below the Personal Allowance (so they have allowance
 * spare to give away), and the recipient's own income keeps them a basic-rate taxpayer — at
 * or below Personal Allowance + basic rate band, the point where total income tips into
 * higher rate.
 */
export function marriageAllowanceCheck(myTaxableIncome: Pence, partnerTaxableIncome: Pence, taxYear: TaxYear): Suggestion {
  const config = configFor(taxYear)
  const pa = config.personalAllowance.value
  const basicRateUpperThreshold = pa + config.basicRateBand.value
  const transferable = config.marriageAllowanceTransferable.value
  const saving = round(transferable * config.basicRate.value)

  const partnerHasSpareAllowance = partnerTaxableIncome < pa
  const iAmBasicRate = myTaxableIncome <= basicRateUpperThreshold
  const applies = partnerHasSpareAllowance && iAmBasicRate

  // When it doesn't apply, `why` names EVERY failing condition, not just the first — a couple
  // where both conditions fail should see both problems in one reading.
  let why: string
  if (applies) {
    why = `Your partner's income of ${gbp(partnerTaxableIncome)} is below the ${gbp(pa)} Personal Allowance, so ${gbp(transferable)} of their unused allowance can transfer to you. Your income of ${gbp(myTaxableIncome)} keeps you a basic-rate taxpayer, so the transfer is worth ${gbp(saving)} a year to the two of you together.`
  } else {
    const problems: string[] = []
    if (!partnerHasSpareAllowance) {
      problems.push(`your partner's income of ${gbp(partnerTaxableIncome)} is at or above the ${gbp(pa)} Personal Allowance, so they have no unused allowance to transfer`)
    }
    if (!iAmBasicRate) {
      problems.push(`your income of ${gbp(myTaxableIncome)} is above the ${gbp(basicRateUpperThreshold)} basic-rate threshold, so you are a higher (or additional) rate taxpayer and Marriage Allowance can only be received by a basic-rate taxpayer`)
    }
    why = `Marriage Allowance does not apply here: ${problems.join('; and ')}.`
  }

  return {
    id: 'marriage-allowance',
    title: 'Marriage Allowance',
    saving: applies ? saving : null,
    applies,
    why,
    cite: config.marriageAllowanceTransferable.source,
  }
}
