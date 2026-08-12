export const REVENUE_DATE_MIN_YEAR = 2025;
export const REVENUE_DATE_MAX_YEAR = 2050;

export const REVENUE_DATE_MIN = new Date(REVENUE_DATE_MIN_YEAR, 0, 1);
export const REVENUE_DATE_MAX = new Date(REVENUE_DATE_MAX_YEAR, 11, 31, 23, 59, 59, 999);

export function isValidRevenueDate(value: string | null | undefined): boolean {
  if (!value) return true;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const year = date.getUTCFullYear();
  return year >= REVENUE_DATE_MIN_YEAR && year <= REVENUE_DATE_MAX_YEAR;
}

export function parseRevenueDate(value: string | null | undefined): Date | null {
  if (!value || !isValidRevenueDate(value)) return null;
  return new Date(value);
}
