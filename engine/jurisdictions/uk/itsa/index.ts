// UK Income Tax Self Assessment (ITSA) engine — the brain for MTD-mandated quarterly
// reporting, eligibility checks, liability estimation, and honest tax relief planning.
//
// Every taxpayer and every year is versioned config (Dated/pick), never constants.
// Money is in integer pence; dates are ISO yyyy-mm-dd strings. Plain words everywhere.

export * from './types'
export * from './config'
export * from './categories'
export * from './periods'
export * from './aggregate'
export * from './eligibility'
export * from './simplified'
export * from './estimate'
export * from './optimise'
