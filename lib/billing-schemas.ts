import { z } from 'zod'

export const SubscriptionCheckoutSchema = z.object({
  plan: z.enum(['mini', 'full']),
  cycle: z.enum(['monthly', 'yearly']).default('monthly'),
})

export const BillingPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
})

export const CreditsCheckoutSchema = z.object({
  credits: z.enum(['10', '20', '50', '100', '200']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})
