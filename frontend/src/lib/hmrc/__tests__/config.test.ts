import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildVATUrl, buildAuthorizationUrl, getHMRCConfig, HMRC_CONFIG } from '../config'

describe('HMRC Config', () => {
  describe('getHMRCConfig', () => {
    it('defaults to sandbox in non-production', () => {
      vi.stubEnv('NODE_ENV', 'test')
      vi.stubEnv('NEXT_PUBLIC_HMRC_USE_PRODUCTION', '')
      const config = getHMRCConfig()
      expect(config.baseUrl.api).toBe(HMRC_CONFIG.sandbox.api)
      expect(config.isProduction).toBe(false)
    })

    it('uses sandbox API URL in test environment', () => {
      const config = getHMRCConfig()
      expect(config.baseUrl.api).toContain('test-api.service.hmrc.gov.uk')
    })

    it('includes all VAT endpoint keys', () => {
      const config = getHMRCConfig()
      expect(config.vat).toHaveProperty('obligations')
      expect(config.vat).toHaveProperty('submitReturn')
      expect(config.vat).toHaveProperty('viewReturn')
      expect(config.vat).toHaveProperty('liabilities')
      expect(config.vat).toHaveProperty('payments')
      expect(config.vat).toHaveProperty('penalties')
    })
  })

  describe('buildVATUrl', () => {
    it('builds obligations URL with VRN', () => {
      const url = buildVATUrl('obligations', { vrn: '123456789' })
      expect(url).toContain('/organisations/vat/123456789/obligations')
      expect(url).toContain('test-api.service.hmrc.gov.uk')
    })

    it('builds viewReturn URL with VRN and periodKey', () => {
      const url = buildVATUrl('viewReturn', { vrn: '123456789', periodKey: '23AA' })
      expect(url).toContain('/organisations/vat/123456789/returns/23AA')
    })

    it('builds submitReturn URL with VRN', () => {
      const url = buildVATUrl('submitReturn', { vrn: '987654321' })
      expect(url).toContain('/organisations/vat/987654321/returns')
    })

    it('builds liabilities URL correctly', () => {
      const url = buildVATUrl('liabilities', { vrn: '123456789' })
      expect(url).toContain('/organisations/vat/123456789/liabilities')
    })

    it('builds payments URL correctly', () => {
      const url = buildVATUrl('payments', { vrn: '123456789' })
      expect(url).toContain('/organisations/vat/123456789/payments')
    })

    it('builds penalties URL correctly', () => {
      const url = buildVATUrl('penalties', { vrn: '123456789' })
      expect(url).toContain('/organisations/vat/123456789/penalties')
    })

    it('does not leave {vrn} placeholder unresolved', () => {
      const url = buildVATUrl('obligations', { vrn: 'GB123' })
      expect(url).not.toContain('{vrn}')
    })

    it('does not leave {periodKey} placeholder when provided', () => {
      const url = buildVATUrl('viewReturn', { vrn: 'GB123', periodKey: '23AA' })
      expect(url).not.toContain('{periodKey}')
    })
  })

  describe('buildAuthorizationUrl', () => {
    it('builds valid OAuth URL', () => {
      const url = buildAuthorizationUrl(
        'client-123',
        'https://taxsorted.io/auth/callback',
        'state-abc'
      )
      expect(url).toContain('response_type=code')
      expect(url).toContain('client_id=client-123')
      expect(url).toContain('redirect_uri=')
      expect(url).toContain('state=state-abc')
    })

    it('includes default VAT scopes', () => {
      const url = buildAuthorizationUrl('client', 'https://example.com', 'state')
      expect(url).toContain('read%3Avat')  // URL-encoded "read:vat"
    })

    it('accepts custom scopes', () => {
      const url = buildAuthorizationUrl('client', 'https://example.com', 'state', ['read:vat'])
      expect(url).toContain('scope=read%3Avat')
    })

    it('points to HMRC auth endpoint', () => {
      const url = buildAuthorizationUrl('client', 'https://example.com', 'state')
      expect(url).toContain('hmrc.gov.uk')
      expect(url).toContain('/oauth/authorize')
    })
  })

  describe('HMRC_CONFIG constants', () => {
    it('has correct token TTLs', () => {
      expect(HMRC_CONFIG.tokens.accessTokenTTL).toBe(4 * 60 * 60)
      expect(HMRC_CONFIG.tokens.refreshTokenTTL).toBeGreaterThan(HMRC_CONFIG.tokens.accessTokenTTL)
    })

    it('has correct rate limit settings', () => {
      expect(HMRC_CONFIG.rateLimit.requestsPerSecond).toBe(3)
      expect(HMRC_CONFIG.rateLimit.maxRetries).toBe(3)
    })

    it('has both sandbox and production URLs', () => {
      expect(HMRC_CONFIG.sandbox.api).not.toBe(HMRC_CONFIG.production.api)
      expect(HMRC_CONFIG.production.api).not.toContain('test-')
    })
  })
})
