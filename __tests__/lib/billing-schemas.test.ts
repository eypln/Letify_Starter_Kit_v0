import {
  BillingPortalSchema,
  CreditsCheckoutSchema,
  SubscriptionCheckoutSchema,
} from '@/lib/billing-schemas'

describe('Billing request schemas', () => {
  it('accepts subscription plans and defaults the billing cycle', () => {
    expect(SubscriptionCheckoutSchema.parse({ plan: 'mini' })).toEqual({
      plan: 'mini',
      cycle: 'monthly',
    })
    expect(SubscriptionCheckoutSchema.parse({ plan: 'full', cycle: 'yearly' })).toEqual({
      plan: 'full',
      cycle: 'yearly',
    })
  })

  it('rejects invalid subscription plans and cycles', () => {
    expect(SubscriptionCheckoutSchema.safeParse({ plan: 'enterprise' }).success).toBe(false)
    expect(SubscriptionCheckoutSchema.safeParse({ plan: 'mini', cycle: 'weekly' }).success).toBe(false)
  })

  it('accepts only supported credit amounts and valid redirect URLs', () => {
    expect(CreditsCheckoutSchema.safeParse({
      credits: '50',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    }).success).toBe(true)
    expect(CreditsCheckoutSchema.safeParse({ credits: '15' }).success).toBe(false)
    expect(CreditsCheckoutSchema.safeParse({ credits: '50', successUrl: 'not-a-url' }).success).toBe(false)
  })

  it('allows an omitted billing portal return URL but rejects invalid URLs', () => {
    expect(BillingPortalSchema.parse({})).toEqual({})
    expect(BillingPortalSchema.safeParse({ returnUrl: 'https://example.com/dashboard' }).success).toBe(true)
    expect(BillingPortalSchema.safeParse({ returnUrl: 'invalid' }).success).toBe(false)
  })
})
