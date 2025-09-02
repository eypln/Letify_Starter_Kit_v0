import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export const PRICES = {
  subscription: {
    mini: {
      monthly: process.env.STRIPE_PRICE_MINI_MONTHLY!,
      yearly: process.env.STRIPE_PRICE_MINI_YEARLY!,
    },
    full: {
      monthly: process.env.STRIPE_PRICE_FULL_MONTHLY!,
      yearly: process.env.STRIPE_PRICE_FULL_YEARLY!,
    },
  },
  credits: {
    10: process.env.STRIPE_PRICE_CREDIT_10!,
    20: process.env.STRIPE_PRICE_CREDIT_20!,
    50: process.env.STRIPE_PRICE_CREDIT_50!,
    100: process.env.STRIPE_PRICE_CREDIT_100!,
    200: process.env.STRIPE_PRICE_CREDIT_200!,
  },
} as const;

export type CreditAmount = keyof typeof PRICES.credits; // 10|20|50|100|200