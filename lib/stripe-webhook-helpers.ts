export function toIso(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : new Date().toISOString();
}

export function inferCycle(interval?: string | null): 'monthly' | 'yearly' {
  return (interval ?? '').toLowerCase() === 'year' ? 'yearly' : 'monthly';
}
