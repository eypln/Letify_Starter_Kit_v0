import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function getOrCreateStripeCustomer(userId: string, email?: string) {
  console.log("getOrCreateStripeCustomer called with:", { userId, email });
  
  // billing_customers'da var mı bak, yoksa Stripe'ta customer oluştur ve upsert et
  const { data: bc, error: selectError } = await supa
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();
  
  console.log("Billing customer lookup result:", { data: bc, error: selectError });

  if (selectError) {
    console.error("Error looking up billing customer:", selectError);
  }

  if (bc?.stripe_customer_id) {
    console.log("Found existing Stripe customer ID:", bc.stripe_customer_id);
    
    // Mevcut müşteri ID'sinin geçerli olup olmadığını kontrol edelim
    try {
      // Stripe müşteri bilgisini çekmeyi dene
      const stripe = (await import('./stripe')).stripe;
      const customer = await stripe.customers.retrieve(bc.stripe_customer_id);
      console.log("Stripe customer is valid:", customer.id);
      return bc.stripe_customer_id as string;
    } catch (error) {
      // Stripe'da müşteri bulunamadıysa, yeni bir müşteri oluştur
      console.log("Stripe customer not found, creating new one:", bc.stripe_customer_id);
    }
  }

  console.log("Creating new Stripe customer");
  try {
    const stripe = (await import('./stripe')).stripe;
    const customer = await stripe.customers.create({ 
      email, 
      metadata: { user_id: userId } 
    });
    console.log("Created Stripe customer:", customer.id);
    
    const { error: upsertError } = await supa.from('billing_customers').upsert(
      { user_id: userId, stripe_customer_id: customer.id }, 
      { onConflict: 'user_id' }
    );
    
    if (upsertError) {
      console.error("Error upserting billing customer:", upsertError);
    } else {
      console.log("Successfully upserted billing customer");
    }
    
    return customer.id;
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    throw error;
  }
}

export async function addCredits(
  userId: string, 
  delta: number, 
  meta: { 
    reason: string; 
    payment_intent_id?: string; 
    invoice_id?: string 
  }
) {
  console.log("LIB addCredits called with:", { userId, delta, meta });
  
  try {
    // billing_credit_ledger tablosuna kayıt ekle
    const { data: ledgerData, error: ledgerError } = await supa.from('billing_credit_ledger').insert({ 
      user_id: userId, 
      delta, 
      reason: meta.reason, 
      stripe_payment_intent_id: meta.payment_intent_id, 
      stripe_invoice_id: meta.invoice_id 
    });
    
    if (ledgerError) {
      console.error("Error inserting into billing_credit_ledger:", ledgerError);
      return { success: false, error: ledgerError };
    }
    
    // increment_credits fonksiyonunu çağır
    const { data: rpcData, error: rpcError } = await supa.rpc('increment_credits', { 
      p_user_id: userId, 
      p_delta: delta 
    });
    
    if (rpcError) {
      console.error("Error calling increment_credits:", rpcError);
      return { success: false, error: rpcError };
    }
    
    return { success: true };
  } catch (err) {
    console.error("Unexpected error in lib addCredits:", err);
    return { success: false, error: err };
  }
}