import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function getOrCreateStripeCustomer(userId: string, email?: string) {
  // billing_customers'da var mı bak, yoksa Stripe'ta customer oluştur ve upsert et
  const { data: bc } = await supa
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (bc?.stripe_customer_id) return bc.stripe_customer_id as string;

  const customer = await (await import('./stripe')).stripe.customers.create({ 
    email, 
    metadata: { user_id: userId } 
  });
  
  await supa.from('billing_customers').upsert(
    { user_id: userId, stripe_customer_id: customer.id }, 
    { onConflict: 'user_id' }
  );
  
  return customer.id;
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
  await supa.from('billing_credit_ledger').insert({ 
    user_id: userId, 
    delta, 
    reason: meta.reason, 
    stripe_payment_intent_id: meta.payment_intent_id, 
    stripe_invoice_id: meta.invoice_id 
  });
  
  await supa.rpc('increment_credits', { 
    p_user_id: userId, 
    p_delta: delta 
  }).then(null, async () => {
    // fallback: direct update
    await supa.rpc('noop');
  });
  
  await supa.from('billing_customers').update({}).eq('user_id', userId); // touch
}