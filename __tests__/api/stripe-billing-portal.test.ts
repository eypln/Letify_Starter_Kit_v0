jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number } = {}) => ({
      status: init.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
  RateLimitPresets: { STRICT: 'strict' },
}))

jest.mock('@/lib/supabase/server', () => {
  const supabase = {
    auth: { getUser: jest.fn() },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }
  return {
    createClient: jest.fn().mockResolvedValue(supabase),
    __mockSupabase: supabase,
  }
})

jest.mock('@/lib/stripe', () => {
  const stripe = {
    billingPortal: { sessions: { create: jest.fn() } },
  }
  return { stripe, __mockStripe: stripe }
})

jest.mock('@/lib/billing', () => ({
  getOrCreateStripeCustomer: jest.fn().mockResolvedValue('cus_test'),
}))

import { POST } from '@/app/api/stripe/billing-portal/route'

const mockSupabase = jest.requireMock('@/lib/supabase/server').__mockSupabase
const mockStripe = jest.requireMock('@/lib/stripe').__mockStripe

function request(body: unknown) {
  return { json: async () => body } as Request
}

describe('POST /api/stripe/billing-portal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null,
    })
    mockStripe.billingPortal.sessions.create.mockResolvedValue({
      url: 'https://billing.stripe.com/session/test',
    })
  })

  it('rejects unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const response = await POST(request({}))

    expect(response.status).toBe(401)
    expect(mockStripe.billingPortal.sessions.create).not.toHaveBeenCalled()
  })

  it('rejects invalid return URLs', async () => {
    const response = await POST(request({ returnUrl: 'not-a-url' }))

    expect(response.status).toBe(400)
    expect(mockStripe.billingPortal.sessions.create).not.toHaveBeenCalled()
  })

  it('creates a billing portal session for an authenticated user', async () => {
    const response = await POST(request({ returnUrl: 'https://example.com/dashboard' }))

    expect(response.status).toBe(200)
    expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_test',
      return_url: 'https://example.com/dashboard',
    })
    await expect(response.json()).resolves.toEqual({
      url: 'https://billing.stripe.com/session/test',
    })
  })
})
