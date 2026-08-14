jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) => ({
      status: init.status ?? 200,
      headers: new Map(Object.entries(init.headers ?? {})),
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import {
  clearAllRateLimits,
  clearRateLimit,
  getRateLimitStatus,
  rateLimit,
  rateLimitByIP,
} from '@/lib/rate-limit'

const mockCreateClient = jest.requireMock('@/lib/supabase/server').createClient

function request(pathname: string, headers: Record<string, string> = {}) {
  return {
    headers: { get: (name: string) => headers[name] ?? null },
    nextUrl: { pathname },
  } as unknown as import('next/server').NextRequest
}

const config = { limit: 2, window: 60, message: 'Rate limited' }

describe('rate limiting', () => {
  beforeEach(() => {
    clearAllRateLimits()
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    })
  })

  it('allows requests and tracks remaining quota for authenticated users', async () => {
    const first = await rateLimit(request('/api/test'), config)
    const second = await rateLimit(request('/api/test'), config)

    expect(first).toBeNull()
    expect(second).toBeNull()
    expect(getRateLimitStatus('user-1', '/api/test')?.count).toBe(2)
  })

  it('returns 429 with retry headers after the limit is exceeded', async () => {
    await rateLimit(request('/api/test'), config)
    await rateLimit(request('/api/test'), config)

    const response = await rateLimit(request('/api/test'), config)

    expect(response?.status).toBe(429)
    expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(response?.headers.get('Retry-After')).toBeDefined()
    await expect(response?.json()).resolves.toMatchObject({
      error: 'Rate limited',
    })
  })

  it('uses the first forwarded IP for anonymous requests', async () => {
    const ipRequest = request('/api/public', {
      'x-forwarded-for': '203.0.113.1, 203.0.113.2',
    })

    expect(await rateLimitByIP(ipRequest, config)).toBeNull()
    expect(await rateLimitByIP(ipRequest, config)).toBeNull()
    expect((await rateLimitByIP(ipRequest, config))?.status).toBe(429)
  })

  it('can clear one identifier without clearing other limits', async () => {
    await rateLimit(request('/api/test'), config)
    clearRateLimit('user-1', '/api/test')

    expect(getRateLimitStatus('user-1', '/api/test')).toBeNull()
  })

  it('fails open when session lookup throws', async () => {
    mockCreateClient.mockRejectedValueOnce(new Error('supabase unavailable'))

    await expect(rateLimit(request('/api/fail-open'), config)).resolves.toBeNull()
  })
})
