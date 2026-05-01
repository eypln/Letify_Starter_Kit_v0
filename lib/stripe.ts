import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Stripe v22 removed LatestApiVersion type export; use library default API version.
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