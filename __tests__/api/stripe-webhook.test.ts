jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number } = {}) => ({
      status: init.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/stripe', () => {
  const stripe = {
    webhooks: { constructEvent: jest.fn() },
    subscriptions: { retrieve: jest.fn() },
  }
  return { stripe, __mockStripe: stripe }
})

jest.mock('@/lib/billing', () => ({
  addCredits: jest.fn(),
}))

jest.mock('@supabase/supabase-js', () => {
  const supabase = { from: jest.fn() }
  return { createClient: jest.fn().mockReturnValue(supabase), __mockSupabase: supabase }
})

import { POST } from '@/app/api/stripe/webhook/route'

const mockStripe = jest.requireMock('@/lib/stripe').__mockStripe
const mockSupabase = jest.requireMock('@supabase/supabase-js').__mockSupabase
const mockAddCredits = jest.requireMock('@/lib/billing').addCredits

function request(body: string, signature = '') {
  return {
    headers: {
      get: (name: string) => name === 'stripe-signature' ? signature : null,
      entries: function* () {
        yield ['content-type', 'application/json']
      },
    },
    text: async () => body,
  } as unknown as Request
}

describe('POST /api/stripe/webhook', () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    }))
    mockAddCredits.mockResolvedValue({ success: true })
    mockStripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_test',
      customer: 'cus_test',
      status: 'active',
      cancel_at_period_end: false,
      current_period_start: 1_700_000_000,
      current_period_end: 1_702_592_000,
      items: {
        data: [{
          price: {
            id: 'price_full_monthly',
            recurring: { interval: 'month' },
          },
        }],
      },
    })
  })

  afterAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = originalSecret
  })

  it('rejects requests without a Stripe signature', async () => {
    const response = await POST(request('{}'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Missing signature' })
    expect(mockStripe.webhooks.constructEvent).not.toHaveBeenCalled()
  })

  it('returns configuration error when the webhook secret is missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET

    const response = await POST(request('{}', 't=1,v1=test'))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Missing webhook secret configuration',
    })
    expect(mockStripe.webhooks.constructEvent).not.toHaveBeenCalled()
  })

  it('rejects an invalid Stripe signature without processing the event', async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature')
    })

    const response = await POST(request('{}', 't=1,v1=invalid'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Webhook signature verification failed',
    })
    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
      '{}',
      't=1,v1=invalid',
      'whsec_test'
    )
  })

  it('rejects malformed test events', async () => {
    const response = await POST(request('{invalid-json', 'test_signature'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to parse test event',
    })
  })

  it('acknowledges valid unhandled test events', async () => {
    const response = await POST(
      request(JSON.stringify({ type: 'customer.updated', data: { object: {} } }), 'test_signature')
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
  })

  it('skips credit processing for a duplicate payment intent', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [{ id: 'ledger-1' }],
        error: null,
      }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    }))

    const response = await POST(request(JSON.stringify({
      id: 'evt_duplicate',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_duplicate',
          mode: 'payment',
          customer: 'cus_test',
          payment_intent: 'pi_duplicate',
          metadata: { user_id: 'user-1', credit_amount: '50' },
        },
      },
    }), 'test_signature'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true })
    expect(mockAddCredits).not.toHaveBeenCalled()
  })

  it('dispatches a new credit payment to addCredits', async () => {
    const response = await POST(request(JSON.stringify({
      id: 'evt_payment',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_payment',
          mode: 'payment',
          customer: 'cus_test',
          payment_intent: 'pi_payment',
          amount_total: 2000,
          metadata: { user_id: 'user-1', credit_amount: '20' },
        },
      },
    }), 'test_signature'))

    expect(response.status).toBe(200)
    expect(mockAddCredits).toHaveBeenCalledWith('user-1', 20, {
      reason: 'purchase',
      payment_intent_id: 'pi_payment',
      invoice_id: undefined,
    })
  })

  it('updates billing and profile records for an active subscription', async () => {
    process.env.STRIPE_PRICE_FULL_MONTHLY = 'price_full_monthly'
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { user_id: 'user-1', plan_type: 'full' },
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    }))

    const response = await POST(request(JSON.stringify({
      id: 'evt_subscription',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test',
          customer: 'cus_test',
          status: 'active',
          cancel_at_period_end: false,
          current_period_start: 1_700_000_000,
          current_period_end: 1_702_592_000,
          items: {
            data: [{
              price: {
                id: 'price_full_monthly',
                recurring: { interval: 'month' },
              },
            }],
          },
        },
      },
    }), 'test_signature'))

    expect(response.status).toBe(200)
    expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({ received: true })
  })

  it('acknowledges a subscription update without a mapped user', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    }))

    const response = await POST(request(JSON.stringify({
      id: 'evt_subscription_unmapped',
      type: 'customer.subscription.deleted',
      data: { object: {
        id: 'sub_test',
        customer: 'cus_test',
        status: 'canceled',
        cancel_at_period_end: false,
        items: { data: [{ price: { id: 'price_mini_monthly', recurring: { interval: 'month' } } }] },
      } },
    }), 'test_signature'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
  })
})
