export function inferPlanType(
  metadataPlan: unknown,
  priceId?: string | null,
  env: NodeJS.ProcessEnv = process.env
): 'mini' | 'full' {
  if (metadataPlan === 'mini' || metadataPlan === 'full') {
    return metadataPlan
  }

  const fullPriceIds = new Set(
    [env.STRIPE_PRICE_FULL_MONTHLY, env.STRIPE_PRICE_FULL_YEARLY].filter(Boolean)
  )

  return priceId && fullPriceIds.has(priceId) ? 'full' : 'mini'
}

export function calculateCredits(
  metadataAmount: unknown,
  amountTotal: number | null | undefined
): number {
  const parsedMetadataAmount = Number(metadataAmount ?? 0)
  if (Number.isFinite(parsedMetadataAmount) && parsedMetadataAmount > 0) {
    return parsedMetadataAmount
  }

  return typeof amountTotal === 'number'
    ? Math.round(amountTotal / 100)
    : 0
}
