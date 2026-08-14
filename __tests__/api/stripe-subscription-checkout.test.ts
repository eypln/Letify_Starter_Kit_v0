jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number } = {}) => ({
      status: init.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ get: jest.fn() }),
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

jest.mock('@supabase/supabase-js', () => {
  const serviceClient = {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_existing' },
        error: null,
      }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    })),
  }
  return {
    createClient: jest.fn().mockReturnValue(serviceClient),
    __mockServiceClient: serviceClient,
  }
})

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
  RateLimitPresets: { STRICT: 'strict' },
}))

jest.mock('@/lib/stripe', () => {
  const stripe = {
    customers: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
  }
  return { stripe, __mockStripe: stripe }
})

jest.mock('@/lib/activity', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/stripe/checkout/subscription/route'

const mockUserClient = { auth: { getUser: jest.fn() } }
const mockServiceClient = jest.requireMock('@supabase/supabase-js').__mockServiceClient
const mockStripe = jest.requireMock('@/lib/stripe').__mockStripe
jest.requireMock('@supabase/ssr').createServerClient.mockReturnValue(mockUserClient)

function request(body: unknown) {
  return { json: async () => body } as Request
}

describe('POST /api/stripe/checkout/subscription', () => {
  const originalPrices = {
    miniMonthly: process.env.STRIPE_PRICE_MINI_MONTHLY,
    miniYearly: process.env.STRIPE_PRICE_MINI_YEARLY,
    fullMonthly: process.env.STRIPE_PRICE_FULL_MONTHLY,
    fullYearly: process.env.STRIPE_PRICE_FULL_YEARLY,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_WEBAPP_URL = 'https://app.example.com'
    process.env.STRIPE_PRICE_MINI_MONTHLY = 'price_mini_monthly'
    process.env.STRIPE_PRICE_MINI_YEARLY = 'price_mini_yearly'
    process.env.STRIPE_PRICE_FULL_MONTHLY = 'price_full_monthly'
    process.env.STRIPE_PRICE_FULL_YEARLY = 'price_full_yearly'
    mockUserClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
    })
    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/session/test',
    })
  })

  afterAll(() => {
    process.env.STRIPE_PRICE_MINI_MONTHLY = originalPrices.miniMonthly
    process.env.STRIPE_PRICE_MINI_YEARLY = originalPrices.miniYearly
    process.env.STRIPE_PRICE_FULL_MONTHLY = originalPrices.fullMonthly
    process.env.STRIPE_PRICE_FULL_YEARLY = originalPrices.fullYearly
  })

  it('rejects unauthenticated requests', async () => {
    mockUserClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } })

    const response = await POST(request({ plan: 'mini' }))

    expect(response.status).toBe(401)
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('rejects invalid subscription input before billing calls', async () => {
    const response = await POST(request({ plan: 'enterprise', cycle: 'weekly' }))

    expect(response.status).toBe(400)
    expect(mockStripe.customers.create).not.toHaveBeenCalled()
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('returns service unavailable when the selected price is missing', async () => {
    delete process.env.STRIPE_PRICE_MINI_MONTHLY
    delete process.env.STRIPE_PRICE_MINI_YEARLY

    const response = await POST(request({ plan: 'mini' }))

    expect(response.status).toBe(503)
    expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('creates a subscription checkout for an existing Stripe customer', async () => {
    const response = await POST(request({ plan: 'full', cycle: 'yearly' }))

    expect(response.status).toBe(200)
    expect(mockStripe.customers.create).not.toHaveBeenCalled()
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription',
      customer: 'cus_existing',
      line_items: [{ price: 'price_full_yearly', quantity: 1 }],
      client_reference_id: 'user-1',
      metadata: {
        type: 'subscription',
        user_id: 'user-1',
        plan: 'full',
        billing_cycle: 'yearly',
      },
    }))
    await expect(response.json()).resolves.toEqual({
      url: 'https://checkout.stripe.com/session/test',
    })
  })
})
