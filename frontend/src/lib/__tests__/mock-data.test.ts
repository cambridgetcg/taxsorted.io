import { describe, it, expect } from 'vitest'
import { mockEntity, mockEntities, mockDashboardData } from '../mock-data'

describe('Mock Data', () => {
  describe('mockEntity', () => {
    it('has required entity fields', () => {
      expect(mockEntity.id).toBeDefined()
      expect(mockEntity.name).toBeDefined()
      expect(mockEntity.type).toBeDefined()
    })

    it('has valid entity type', () => {
      const validTypes = [
        'private-limited-company', 'llp', 'sole-trader',
        'partnership', 'charity', 'trust', 'public-limited-company'
      ]
      expect(validTypes).toContain(mockEntity.type)
    })

    it('has identifiers', () => {
      expect(mockEntity.identifiers).toBeDefined()
      expect(typeof mockEntity.identifiers).toBe('object')
    })

    it('has attributes', () => {
      expect(mockEntity.attributes).toBeDefined()
      expect(typeof mockEntity.attributes.vatRegistered).toBe('boolean')
    })
  })

  describe('mockEntities', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(mockEntities)).toBe(true)
      expect(mockEntities.length).toBeGreaterThan(0)
    })

    it('all entities have unique IDs', () => {
      const ids = mockEntities.map(e => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('includes the primary mock entity', () => {
      expect(mockEntities.find(e => e.id === mockEntity.id)).toBeDefined()
    })
  })

  describe('mockDashboardData', () => {
    it('has entity reference', () => {
      expect(mockDashboardData.entity).toBeDefined()
      expect(mockDashboardData.entity.id).toBeDefined()
    })

    it('has attention filings array', () => {
      expect(Array.isArray(mockDashboardData.attentionFilings)).toBe(true)
    })

    it('has upcoming deadlines', () => {
      expect(Array.isArray(mockDashboardData.upcomingDeadlines)).toBe(true)
    })

    it('has compliance data', () => {
      expect(mockDashboardData.complianceScore).toBeDefined()
    })

    it('has HMRC connections', () => {
      expect(Array.isArray(mockDashboardData.connections)).toBe(true)
    })
  })
})
