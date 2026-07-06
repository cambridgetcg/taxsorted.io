import { describe, it, expect } from 'vitest'
import { ROLES, HMRC_CHANNELS, STALENESS_DAYS, staleEntries } from '../contacts'

// Domains that appear as `sourceUrl` in the live-verified corpus
// (regs/research/gov/{treasury,hmrc-anatomy,parliament,transparency-tools}.md).
// gov.uk (and its many subdomains) + parliament.uk (and its subdomains) cover
// the official government sources; the remaining hostnames are the named
// civic tools / independent bodies the corpus also verified directly.
const TOOL_HOSTNAMES = [
  'writetothem.com',
  'theyworkforyou.com',
  'whatdotheyknow.com',
  'mysociety.org',
  'nao.org.uk',
  'ico.org.uk',
  'ombudsman.org.uk',
  'obr.uk',
]

function isAllowedSourceUrl(url: string): boolean {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return false
  }
  if (host === 'gov.uk' || host.endsWith('.gov.uk')) return true
  if (host === 'parliament.uk' || host.endsWith('.parliament.uk')) return true
  return TOOL_HOSTNAMES.some((t) => host === t || host.endsWith(`.${t}`))
}

const ALL_ENTRIES = [...ROLES, ...HMRC_CHANNELS]

describe('gov/contacts data module', () => {
  it('has 15-25 roles and 8-15 HMRC channels', () => {
    expect(ROLES.length).toBeGreaterThanOrEqual(15)
    expect(ROLES.length).toBeLessThanOrEqual(25)
    expect(HMRC_CHANNELS.length).toBeGreaterThanOrEqual(8)
    expect(HMRC_CHANNELS.length).toBeLessThanOrEqual(15)
  })

  it('every entry has a sourceUrl on an official gov.uk/parliament.uk domain or a named civic tool', () => {
    for (const entry of ALL_ENTRIES) {
      expect(entry.sourceUrl.startsWith('https://')).toBe(true)
      expect(isAllowedSourceUrl(entry.sourceUrl)).toBe(true)
    }
  })

  it('every entry has a verifiedOn that parses as an ISO date', () => {
    for (const entry of ALL_ENTRIES) {
      expect(entry.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(new Date(entry.verifiedOn).getTime())).toBe(false)
    }
  })

  it('every role holder carries an asOf date', () => {
    for (const role of ROLES) {
      if (role.holder) {
        expect(role.holder.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(role.holder.name.length).toBeGreaterThan(0)
      }
    }
  })

  it('every role and channel has a non-empty id unique within its collection', () => {
    const roleIds = ROLES.map((r) => r.id)
    const channelIds = HMRC_CHANNELS.map((c) => c.id)
    expect(new Set(roleIds).size).toBe(roleIds.length)
    expect(new Set(channelIds).size).toBe(channelIds.length)
    for (const id of [...roleIds, ...channelIds]) {
      expect(id.length).toBeGreaterThan(0)
    }
  })

  describe('staleEntries', () => {
    it('is empty on the verification date', () => {
      expect(staleEntries('2026-07-06')).toEqual([])
    })

    it('flags every entry once STALENESS_DAYS has passed', () => {
      expect(STALENESS_DAYS).toBe(90)
      const stale = staleEntries('2026-11-01')
      expect(stale.length).toBe(ALL_ENTRIES.length)
      const staleIds = new Set(stale.map((s) => s.id))
      for (const entry of ALL_ENTRIES) {
        expect(staleIds.has(entry.id)).toBe(true)
      }
    })
  })

  describe('required entries (per the gov-pillar plan)', () => {
    it('includes the Exchequer Secretary to the Treasury, noted as the tax minister', () => {
      const exSec = ROLES.find((r) => r.role === 'Exchequer Secretary to the Treasury')
      expect(exSec).toBeTruthy()
      expect(exSec?.whatTheyDo.toLowerCase()).toContain('tax minister')
      expect(exSec?.holder?.name).toBe('Daniel Tomlinson MP')
    })

    it('includes the HMRC CEO / First Permanent Secretary', () => {
      const ceo = ROLES.find((r) => r.role.includes('First Permanent Secretary'))
      expect(ceo).toBeTruthy()
      expect(ceo?.holder?.name).toBe('John-Paul Marks CB')
    })

    it('includes the Adjudicator\'s Office', () => {
      const adjudicator = ROLES.find((r) => r.role.toLowerCase().includes('adjudicator'))
      expect(adjudicator).toBeTruthy()
      expect(adjudicator?.body).toBe('independent')
    })

    it('includes the Treasury Select Committee chair route', () => {
      const chair = ROLES.find((r) => r.role.toLowerCase().includes('treasury committee'))
      expect(chair).toBeTruthy()
      expect(chair?.body).toBe('parliament')
    })

    it('includes the Self Assessment helpline channel', () => {
      const sa = HMRC_CHANNELS.find(
        (c) => c.audience.toLowerCase().includes('self assessment') && c.channel.toLowerCase().includes('phone'),
      )
      expect(sa).toBeTruthy()
      expect(sa?.details).toContain('0300 200 3310')
    })

    it('includes the Extra Support Team channel for people who need extra help', () => {
      const extraSupport = HMRC_CHANNELS.find((c) => c.channel.toLowerCase().includes('extra support'))
      expect(extraSupport).toBeTruthy()
    })
  })

  it('carries no personal contact data — only office routes', () => {
    // No entry should surface a personal (non-office) email address; the only
    // emails present should be departmental/committee inboxes, never a named
    // individual's personal address.
    for (const entry of ALL_ENTRIES) {
      const haystack = JSON.stringify(entry)
      expect(haystack).not.toMatch(/[a-z0-9._-]+@(gmail|yahoo|hotmail|outlook|icloud)\.[a-z.]+/i)
    }
  })
})
