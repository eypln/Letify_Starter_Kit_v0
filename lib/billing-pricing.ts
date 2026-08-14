export type SubscriptionPlan = 'mini' | 'full';
export type BillingCycle = 'monthly' | 'yearly';

export function pickSubscriptionPrice(
  plan: SubscriptionPlan,
  cycle: BillingCycle,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const prices = plan === 'mini'
    ? {
        yearly: env.STRIPE_PRICE_MINI_YEARLY,
        monthly: env.STRIPE_PRICE_MINI_MONTHLY,
      }
    : {
        yearly: env.STRIPE_PRICE_FULL_YEARLY,
        monthly: env.STRIPE_PRICE_FULL_MONTHLY,
      };

  return cycle === 'yearly'
    ? prices.yearly || prices.monthly
    : prices.monthly || prices.yearly;
}
