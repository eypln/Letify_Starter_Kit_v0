import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

async function addUserCredits(userId: string, creditsToAdd: number) {
  console.log(`Adding ${creditsToAdd} credits to user: ${userId}`);
  
  // 1. billing_credit_ledger tablosuna kayıt ekle
  const { data: ledgerData, error: ledgerError } = await supabase
    .from('billing_credit_ledger')
    .insert({ 
      user_id: userId, 
      delta: creditsToAdd, 
      reason: "manual_add",
      stripe_payment_intent_id: null,
      stripe_invoice_id: null
    });
  
  if (ledgerError) {
    console.error('Error inserting into billing_credit_ledger:', ledgerError);
    return;
  }
  
  console.log('Successfully inserted into billing_credit_ledger:', ledgerData);
  
  // 2. increment_credits fonksiyonunu çağır
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('increment_credits', { 
      p_user_id: userId, 
      p_delta: creditsToAdd 
    });
  
  if (rpcError) {
    console.error('Error calling increment_credits:', rpcError);
    return;
  }
  
  console.log('Successfully called increment_credits:', rpcData);
  
  // 3. Kullanıcının yeni kredi bakiyesini kontrol et
  const { data: customerData, error: customerError } = await supabase
    .from('billing_customers')
    .select('credits')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (customerError) {
    console.error('Error fetching customer data:', customerError);
    return;
  }
  
  console.log('User\'s new credit balance:', customerData?.credits);
}

// Kullanıcı ID'sini ve eklenecek kredi miktarını komut satırından al
const userId = process.argv[2];
const creditsToAdd = parseInt(process.argv[3] || '0');

if (!userId || isNaN(creditsToAdd) || creditsToAdd <= 0) {
  console.error('Please provide user ID and positive credit amount as arguments');
  process.exit(1);
}

addUserCredits(userId, creditsToAdd);