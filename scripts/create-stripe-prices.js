#!/usr/bin/env node

// Script to create Stripe products and prices for Letify
// Run with: node scripts/create-stripe-prices.js

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...\n');

  try {
    // 1. Create Mini Plan
    console.log('Creating Mini Plan...');
    const miniProduct = await stripe.products.create({
      name: 'Mini Plan',
      description: 'Great for small businesses - Link 2 profiles, unlimited posts, 15 reels/stories',
    });

    const miniMonthly = await stripe.prices.create({
      product: miniProduct.id,
      unit_amount: 3900, // €39.00
      currency: 'eur',
      recurring: { interval: 'month' },
      nickname: 'Mini Monthly',
    });

    const miniYearly = await stripe.prices.create({
      product: miniProduct.id,
      unit_amount: 39600, // €396.00 (€33/month * 12)
      currency: 'eur',
      recurring: { interval: 'year' },
      nickname: 'Mini Yearly',
    });

    // 2. Create Full Plan
    console.log('Creating Full Plan...');
    const fullProduct = await stripe.products.create({
      name: 'Full Plan',
      description: 'Perfect for growing teams - Link 5 profiles, unlimited posts, 30 reels, advanced analytics',
    });

    const fullMonthly = await stripe.prices.create({
      product: fullProduct.id,
      unit_amount: 8900, // €89.00
      currency: 'eur',
      recurring: { interval: 'month' },
      nickname: 'Full Monthly',
    });

    const fullYearly = await stripe.prices.create({
      product: fullProduct.id,
      unit_amount: 91200, // €912.00 (€76/month * 12)
      currency: 'eur',
      recurring: { interval: 'year' },
      nickname: 'Full Yearly',
    });

    // 3. Create Credit Packages
    console.log('Creating Credit Packages...');
    
    const creditAmounts = [10, 20, 50, 100, 200];
    const creditPrices = {};

    for (const amount of creditAmounts) {
      const product = await stripe.products.create({
        name: `${amount} Credits`,
        description: `Purchase ${amount} credits for generating content`,
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: amount * 100, // €10 = 1000 cents, €20 = 2000 cents, etc.
        currency: 'eur',
        nickname: `${amount} Credits`,
      });

      creditPrices[amount] = price.id;
    }

    // Output the results
    console.log('\n✅ All products and prices created successfully!\n');
    console.log('Add these to your .env.local file:\n');
    console.log('# Subscription Plans');
    console.log(`STRIPE_PRICE_MINI_MONTHLY=${miniMonthly.id}`);
    console.log(`STRIPE_PRICE_MINI_YEARLY=${miniYearly.id}`);
    console.log(`STRIPE_PRICE_FULL_MONTHLY=${fullMonthly.id}`);
    console.log(`STRIPE_PRICE_FULL_YEARLY=${fullYearly.id}`);
    console.log('\n# Credit Packages');
    console.log(`STRIPE_PRICE_CREDIT_10=${creditPrices[10]}`);
    console.log(`STRIPE_PRICE_CREDIT_20=${creditPrices[20]}`);
    console.log(`STRIPE_PRICE_CREDIT_50=${creditPrices[50]}`);
    console.log(`STRIPE_PRICE_CREDIT_100=${creditPrices[100]}`);
    console.log(`STRIPE_PRICE_CREDIT_200=${creditPrices[200]}`);

  } catch (error) {
    console.error('❌ Error creating Stripe products:', error.message);
    process.exit(1);
  }
}

createStripeProducts();