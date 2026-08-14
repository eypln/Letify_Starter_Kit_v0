import { inferCycle, toIso } from '@/lib/stripe-webhook-helpers'

describe('Stripe webhook helpers', () => {
  it('maps yearly intervals to yearly billing', () => {
    expect(inferCycle('year')).toBe('yearly')
    expect(inferCycle('YEAR')).toBe('yearly')
  })

  it('maps other or missing intervals to monthly billing', () => {
    expect(inferCycle('month')).toBe('monthly')
    expect(inferCycle('week')).toBe('monthly')
    expect(inferCycle(null)).toBe('monthly')
    expect(inferCycle(undefined)).toBe('monthly')
  })

  it('converts finite Unix seconds to ISO timestamps', () => {
    expect(toIso(0)).toBe('1970-01-01T00:00:00.000Z')
    expect(toIso(1_700_000_000)).toBe('2023-11-14T22:13:20.000Z')
  })

  it('uses a current timestamp for invalid values', () => {
    const before = Date.now()
    const result = new Date(toIso(Number.NaN)).getTime()
    const after = Date.now()

    expect(result).toBeGreaterThanOrEqual(before)
    expect(result).toBeLessThanOrEqual(after)
  })
})
