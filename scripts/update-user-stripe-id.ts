import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

async function updateUserStripeId(userId: string, correctStripeId: string) {
  console.log(`Updating Stripe ID for user: ${userId}`);
  
  // billing_customers tablosundaki eski test ID'yi doğru ID ile güncelle
  const { data, error } = await supabase
    .from('billing_customers')
    .update({ stripe_customer_id: correctStripeId })
    .eq('user_id', userId)
    .eq('stripe_customer_id', 'cus_test123'); // Sadece eski test ID'yi güncelle
  
  if (error) {
    console.error('Error updating customer data:', error);
    return;
  }
  
  console.log('Successfully updated customer data:', data);
  
  // Kontrol et
  const { data: checkData, error: checkError } = await supabase
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId);
  
  if (checkError) {
    console.error('Error checking customer data:', checkError);
    return;
  }
  
  console.log('Current customer data:', checkData);
}

// Kullanıcı ID'sini ve doğru Stripe ID'sini komut satırından al
const userId = process.argv[2];
const correctStripeId = process.argv[3];

if (!userId || !correctStripeId) {
  console.error('Please provide user ID and correct Stripe ID as arguments');
  process.exit(1);
}

updateUserStripeId(userId, correctStripeId);