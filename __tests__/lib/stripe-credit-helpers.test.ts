import { calculateCredits, inferPlanType } from '@/lib/stripe-credit-helpers'

describe('Stripe credit helpers', () => {
  it('prefers valid metadata plan values', () => {
    expect(inferPlanType('full', 'price-mini', {})).toBe('full')
    expect(inferPlanType('mini', 'price-full', {})).toBe('mini')
  })

  it('falls back to configured full price IDs', () => {
    const env = {
      STRIPE_PRICE_FULL_MONTHLY: 'price-full-monthly',
      STRIPE_PRICE_FULL_YEARLY: 'price-full-yearly',
    }

    expect(inferPlanType(undefined, 'price-full-monthly', env)).toBe('full')
    expect(inferPlanType(undefined, 'price-mini', env)).toBe('mini')
    expect(inferPlanType(undefined, null, env)).toBe('mini')
  })

  it('uses a positive metadata credit amount first', () => {
    expect(calculateCredits('50', 1000)).toBe(50)
    expect(calculateCredits(20, 1000)).toBe(20)
  })

  it('falls back to amount total in cents', () => {
    expect(calculateCredits('', 5050)).toBe(51)
    expect(calculateCredits('invalid', 1000)).toBe(10)
  })

  it('returns zero when neither credit source is usable', () => {
    expect(calculateCredits(null, null)).toBe(0)
    expect(calculateCredits(-1, undefined)).toBe(0)
  })
})
