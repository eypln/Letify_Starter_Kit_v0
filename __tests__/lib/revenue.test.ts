import {
  isValidRevenueDate,
  parseRevenueDate,
  REVENUE_DATE_MAX_YEAR,
  REVENUE_DATE_MIN_YEAR,
} from '@/lib/revenue-date-validation'
import { getRevenueRentBasis } from '@/lib/revenue-calculations'

describe('Revenue date validation', () => {
  it('accepts empty optional dates', () => {
    expect(isValidRevenueDate(null)).toBe(true)
    expect(isValidRevenueDate(undefined)).toBe(true)
    expect(isValidRevenueDate('')).toBe(true)
  })

  it('accepts dates within the supported year range', () => {
    expect(isValidRevenueDate(`${REVENUE_DATE_MIN_YEAR}-01-01`)).toBe(true)
    expect(isValidRevenueDate(`${REVENUE_DATE_MAX_YEAR}-12-31`)).toBe(true)
  })

  it('rejects invalid and out-of-range dates', () => {
    expect(isValidRevenueDate('not-a-date')).toBe(false)
    expect(isValidRevenueDate(`${REVENUE_DATE_MIN_YEAR - 1}-12-31`)).toBe(false)
    expect(isValidRevenueDate(`${REVENUE_DATE_MAX_YEAR + 1}-01-01`)).toBe(false)
  })

  it('parses valid dates and returns null for invalid dates', () => {
    expect(parseRevenueDate('2030-06-15')?.toISOString()).toContain('2030-06-15')
    expect(parseRevenueDate('invalid')).toBeNull()
    expect(parseRevenueDate(null)).toBeNull()
  })
})

describe('Revenue rent basis', () => {
  it('uses twenty percent of rent for shortlet deals', () => {
    expect(getRevenueRentBasis('shortlet', 1000)).toBe(200)
  })

  it('uses the full rent for non-shortlet deals', () => {
    expect(getRevenueRentBasis('longlet', 1000)).toBe(1000)
    expect(getRevenueRentBasis(null, 1000)).toBe(1000)
  })

  it('treats missing rent as zero', () => {
    expect(getRevenueRentBasis('shortlet', null)).toBe(0)
    expect(getRevenueRentBasis(undefined, undefined)).toBe(0)
  })
})
