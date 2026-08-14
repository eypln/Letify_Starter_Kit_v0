jest.mock('@supabase/supabase-js', () => {
  const supabase = {
    from: jest.fn(),
    rpc: jest.fn(),
  }
  return {
    createClient: jest.fn().mockReturnValue(supabase),
    __mockSupabase: supabase,
  }
})

jest.mock('@/lib/stripe', () => ({
  stripe: {
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
}))

import { addCredits, getOrCreateStripeCustomer } from '@/lib/billing'

const mockSupabase = jest.requireMock('@supabase/supabase-js').__mockSupabase
const mockStripe = jest.requireMock('@/lib/stripe').stripe

function ledgerInsert(result: { error: unknown }) {
  return {
    insert: jest.fn().mockResolvedValue(result),
  }
}

describe('Billing credit helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.rpc.mockResolvedValue({ error: null })
  })

  it('returns a failure without calling RPC when ledger insertion fails', async () => {
    mockSupabase.from.mockReturnValue(ledgerInsert({ error: new Error('ledger failure') }))

    const result = await addCredits('user-1', 10, { reason: 'purchase' })

    expect(result.success).toBe(false)
    expect(mockSupabase.rpc).not.toHaveBeenCalled()
  })

  it('returns a failure when increment RPC fails', async () => {
    mockSupabase.from.mockReturnValue(ledgerInsert({ error: null }))
    mockSupabase.rpc.mockResolvedValueOnce({ error: new Error('rpc failure') })

    const result = await addCredits('user-1', 10, {
      reason: 'purchase',
      payment_intent_id: 'pi-1',
      invoice_id: 'inv-1',
    })

    expect(result.success).toBe(false)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_credits', {
      p_user_id: 'user-1',
      p_delta: 10,
    })
  })

  it('returns success after ledger insert and increment RPC', async () => {
    mockSupabase.from.mockReturnValue(ledgerInsert({ error: null }))

    const result = await addCredits('user-1', 25, { reason: 'bonus' })

    expect(result).toEqual({ success: true })
    expect(mockSupabase.from).toHaveBeenCalledWith('billing_credit_ledger')
    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_credits', {
      p_user_id: 'user-1',
      p_delta: 25,
    })
  })

  it('returns a failure when the billing client throws', async () => {
    mockSupabase.from.mockImplementationOnce(() => {
      throw new Error('client failure')
    })

    const result = await addCredits('user-1', 5, { reason: 'purchase' })

    expect(result.success).toBe(false)
  })

  it('reuses an existing valid Stripe customer', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_existing' },
        error: null,
      }),
    })
    mockStripe.customers.retrieve.mockResolvedValue({ id: 'cus_existing' })

    await expect(getOrCreateStripeCustomer('user-1', 'user@example.com')).resolves.toBe('cus_existing')
    expect(mockStripe.customers.create).not.toHaveBeenCalled()
  })

  it('creates and maps a Stripe customer when none exists', async () => {
    mockSupabase.from
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }))
      .mockImplementationOnce(() => ({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      }))
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' })

    await expect(getOrCreateStripeCustomer('user-1', 'user@example.com')).resolves.toBe('cus_new')
    expect(mockStripe.customers.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      metadata: { user_id: 'user-1' },
    })
  })

  it('replaces an invalid existing Stripe customer', async () => {
    mockSupabase.from
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { stripe_customer_id: 'cus_invalid' },
          error: null,
        }),
      }))
      .mockImplementationOnce(() => ({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      }))
    mockStripe.customers.retrieve.mockRejectedValue(new Error('customer missing'))
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_replacement' })

    await expect(getOrCreateStripeCustomer('user-1')).resolves.toBe('cus_replacement')
    expect(mockStripe.customers.create).toHaveBeenCalled()
  })

  it('propagates Stripe customer creation failures', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })
    mockStripe.customers.create.mockRejectedValue(new Error('Stripe unavailable'))

    await expect(getOrCreateStripeCustomer('user-1')).rejects.toThrow('Stripe unavailable')
  })
})
