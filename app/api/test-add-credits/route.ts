import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Supabase service-role client (RLS'i baypas eder). */
const supa = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE! // DİKKAT: anon key değil!
  );

/** Krediyi ledger'a yazar ve bakiye artırır. */
async function addCredits(
  userId: string,
  creditsToAdd: number,
  meta: { pi?: string | null; inv?: string | null }
) {
  console.log("TEST addCredits called with:", { userId, creditsToAdd, meta });
  if (!creditsToAdd || creditsToAdd <= 0) {
    console.log("Invalid creditsToAdd:", creditsToAdd);
    return { success: false, error: "Invalid credits amount" };
  }
  
  try {
    // Doğrudan Supabase client kullan
    const supabase = supa();
    
    // billing_payments tablosuna kayıt ekle
    console.log("Inserting into billing_payments...");
    const { data: paymentData, error: paymentError } = await supabase
      .from('billing_payments')
      .insert({ 
        user_id: userId, 
        stripe_payment_intent_id: meta.pi ?? 'unknown',
        amount_cents: creditsToAdd * 100, // varsayım: 1 kredi = 1 EUR
        status: 'succeeded',
        credit_amount: creditsToAdd,
        currency: 'eur'
      })
      .select();
    
    if (paymentError) {
      console.error("Error inserting into billing_payments:", paymentError);
      return { success: false, error: paymentError };
    }
    
    console.log("billing_payments insert success:", paymentData);
    
    // billing_credit_ledger tablosuna kayıt ekle
    console.log("Inserting into billing_credit_ledger...");
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .insert({ 
        user_id: userId, 
        delta: creditsToAdd, 
        reason: "manual_test",
        stripe_payment_intent_id: meta.pi ?? null,
        stripe_invoice_id: meta.inv ?? null
      });
    
    if (ledgerError) {
      console.error("Error inserting into billing_credit_ledger:", ledgerError);
      return { success: false, error: ledgerError };
    }
    
    console.log("billing_credit_ledger insert success:", ledgerData);
    
    // increment_credits fonksiyonunu çağır
    console.log("Calling increment_credits RPC...");
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('increment_credits', { 
        p_user_id: userId, 
        p_delta: creditsToAdd 
      });
    
    if (rpcError) {
      console.error("Error calling increment_credits:", rpcError);
      return { success: false, error: rpcError };
    }
    
    console.log("increment_credits RPC success:", rpcData);
    
    return { success: true, data: { paymentData, ledgerData, rpcData } };
  } catch (err) {
    console.error("Unexpected error in test addCredits:", err);
    return { success: false, error: err };
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST for state-changing test operations" },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function POST(req: Request) {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await authClient
      .from('profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin' || profile.status === 'denied') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const credits = searchParams.get('credits');
    
    if (!userId || !credits) {
      return NextResponse.json({ error: "Missing userId or credits parameter" }, { status: 400 });
    }
    
    const creditsToAdd = Number(credits);
    if (!Number.isFinite(creditsToAdd) || creditsToAdd <= 0) {
      return NextResponse.json({ error: "Invalid credits parameter" }, { status: 400 });
    }
    
    console.log("Test add credits request:", { userId, creditsToAdd });
    
    const result = await addCredits(userId, creditsToAdd, {
      pi: "test_payment_intent_" + Date.now(),
      inv: null
    });
    
    if (!result.success) {
      console.error("Test add credits failed:", result.error);
      return NextResponse.json({ error: "Failed to add credits" }, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Test add credits error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}