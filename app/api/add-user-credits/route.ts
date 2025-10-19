import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supa = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, credits } = await request.json();
    
    if (!userId || !credits) {
      return NextResponse.json({ error: 'User ID and credits are required' }, { status: 400 });
    }
    
    console.log(`Adding ${credits} credits to user: ${userId}`);
    
    const supabase = supa();
    
    // 1. billing_credit_ledger tablosuna kayıt ekle
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .insert({ 
        user_id: userId, 
        delta: credits, 
        reason: "manual_add",
        stripe_payment_intent_id: null,
        stripe_invoice_id: null
      });
    
    if (ledgerError) {
      console.error('Error inserting into billing_credit_ledger:', ledgerError);
      return NextResponse.json({ error: 'Error inserting into billing_credit_ledger' }, { status: 500 });
    }
    
    console.log('Successfully inserted into billing_credit_ledger:', ledgerData);
    
    // 2. increment_credits fonksiyonunu çağır
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('increment_credits', { 
        p_user_id: userId, 
        p_delta: credits 
      });
    
    if (rpcError) {
      console.error('Error calling increment_credits:', rpcError);
      return NextResponse.json({ error: 'Error calling increment_credits' }, { status: 500 });
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
      return NextResponse.json({ error: 'Error fetching customer data' }, { status: 500 });
    }
    
    console.log('User\'s new credit balance:', customerData?.credits);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Credits added successfully',
      newBalance: customerData?.credits
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}