import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

async function syncUserData(userId: string) {
  console.log(`Syncing data for user: ${userId}`);
  
  // 1. billing_subscriptions tablosundan kullanıcı verilerini al
  const { data: subscriptionData, error: subscriptionError } = await supabase
    .from('billing_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .limit(1);
  
  if (subscriptionError) {
    console.error('Error fetching subscription data:', subscriptionError);
    return;
  }
  
  if (!subscriptionData || subscriptionData.length === 0) {
    console.log('No subscription data found for user');
    return;
  }
  
  const correctCustomerId = subscriptionData[0].stripe_customer_id;
  console.log('Correct customer ID from subscription:', correctCustomerId);
  
  // 2. billing_customers tablosundaki veriyi kontrol et
  const { data: customerData, error: customerError } = await supabase
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (customerError) {
    console.error('Error fetching customer data:', customerError);
    return;
  }
  
  if (!customerData) {
    console.log('No customer data found, creating new entry');
    const { error: insertError } = await supabase
      .from('billing_customers')
      .insert({
        user_id: userId,
        stripe_customer_id: correctCustomerId
      });
    
    if (insertError) {
      console.error('Error inserting customer data:', insertError);
    } else {
      console.log('Successfully inserted customer data');
    }
    return;
  }
  
  const currentCustomerId = customerData.stripe_customer_id;
  console.log('Current customer ID in billing_customers:', currentCustomerId);
  
  // 3. Eğer farklıysa, billing_customers tablosunu güncelle
  if (currentCustomerId !== correctCustomerId) {
    console.log('Customer IDs do not match, updating billing_customers table');
    const { error: updateError } = await supabase
      .from('billing_customers')
      .update({ stripe_customer_id: correctCustomerId })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Error updating customer data:', updateError);
    } else {
      console.log('Successfully updated customer data');
    }
  } else {
    console.log('Customer IDs already match, no update needed');
  }
}

// Kullanıcı ID'sini komut satırından al
const userId = process.argv[2];
if (!userId) {
  console.error('Please provide a user ID as argument');
  process.exit(1);
}

syncUserData(userId);