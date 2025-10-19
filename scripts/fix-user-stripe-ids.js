// Script to fix user's Stripe customer IDs
// This script updates all records for a user to use the correct Stripe customer ID

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserStripeIds(userId, correctStripeCustomerId, oldStripeCustomerId) {
  console.log(`Fixing Stripe customer IDs for user ${userId}`);
  console.log(`Correct ID: ${correctStripeCustomerId}`);
  console.log(`Old ID: ${oldStripeCustomerId}`);
  
  try {
    // 1. Update billing_subscriptions table
    console.log('Updating billing_subscriptions...');
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('billing_subscriptions')
      .update({ stripe_customer_id: correctStripeCustomerId })
      .eq('user_id', userId)
      .eq('stripe_customer_id', oldStripeCustomerId);
    
    if (subscriptionError) {
      console.error('Error updating billing_subscriptions:', subscriptionError);
    } else {
      console.log('Successfully updated billing_subscriptions');
    }
    
    // 2. Check if there are any other tables that might reference the old Stripe customer ID
    // For now, we're only updating billing_subscriptions since that's the only table we found
    
    console.log('Stripe customer ID fix completed');
  } catch (error) {
    console.error('Error fixing Stripe customer IDs:', error);
  }
}

// Get command line arguments
const userId = process.argv[2];
const correctStripeCustomerId = process.argv[3];
const oldStripeCustomerId = process.argv[4];

if (!userId || !correctStripeCustomerId || !oldStripeCustomerId) {
  console.log('Usage: node fix-user-stripe-ids.js <userId> <correctStripeCustomerId> <oldStripeCustomerId>');
  process.exit(1);
}

fixUserStripeIds(userId, correctStripeCustomerId, oldStripeCustomerId);