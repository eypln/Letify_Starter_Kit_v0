import { pickSubscriptionPrice } from '@/lib/billing-pricing'

describe('Subscription pricing', () => {
  it('prefers the requested mini monthly price', () => {
    expect(pickSubscriptionPrice('mini', 'monthly', {
      STRIPE_PRICE_MINI_MONTHLY: 'mini-monthly',
      STRIPE_PRICE_MINI_YEARLY: 'mini-yearly',
    })).toBe('mini-monthly')
  })

  it('falls back to mini yearly when monthly is unavailable', () => {
    expect(pickSubscriptionPrice('mini', 'monthly', {
      STRIPE_PRICE_MINI_YEARLY: 'mini-yearly',
    })).toBe('mini-yearly')
  })

  it('prefers the requested full yearly price', () => {
    expect(pickSubscriptionPrice('full', 'yearly', {
      STRIPE_PRICE_FULL_MONTHLY: 'full-monthly',
      STRIPE_PRICE_FULL_YEARLY: 'full-yearly',
    })).toBe('full-yearly')
  })

  it('falls back to full monthly when yearly is unavailable', () => {
    expect(pickSubscriptionPrice('full', 'yearly', {
      STRIPE_PRICE_FULL_MONTHLY: 'full-monthly',
    })).toBe('full-monthly')
  })

  it('returns undefined when the selected plan has no prices', () => {
    expect(pickSubscriptionPrice('mini', 'monthly', {})).toBeUndefined()
    expect(pickSubscriptionPrice('full', 'yearly', {})).toBeUndefined()
  })
})
