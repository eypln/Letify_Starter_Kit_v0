import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

async function checkUserCredits(userId: string) {
  console.log(`Checking credits for user: ${userId}`);
  
  // Kullanıcının kredi bakiyesini kontrol et
  const { data: customerData, error: customerError } = await supabase
    .from('billing_customers')
    .select('credits')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (customerError) {
    console.error('Error fetching customer data:', customerError);
    return;
  }
  
  console.log('User\'s current credit balance:', customerData?.credits);
  
  // Kullanıcının kredi geçmişi
  const { data: ledgerData, error: ledgerError } = await supabase
    .from('billing_credit_ledger')
    .select('delta, reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (ledgerError) {
    console.error('Error fetching ledger data:', ledgerError);
    return;
  }
  
  console.log('User\'s recent credit transactions:', ledgerData);
  
  // Kullanıcının ödeme geçmişi
  const { data: paymentData, error: paymentError } = await supabase
    .from('billing_payments')
    .select('amount_cents, credit_amount, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (paymentError) {
    console.error('Error fetching payment data:', paymentError);
    return;
  }
  
  console.log('User\'s recent payments:', paymentData);
}

// Kullanıcı ID'sini komut satırından al
const userId = process.argv[2];

if (!userId) {
  console.error('Please provide user ID as argument');
  process.exit(1);
}

checkUserCredits(userId);