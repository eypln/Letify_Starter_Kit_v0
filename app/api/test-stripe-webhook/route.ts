import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Supabase service-role client (RLS'i baypas eder). */
const supa = () => {
  console.log("Creating Supabase client with:", {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE
  });
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE! // DİKKAT: anon key değil!
  );
};

/** Krediyi ledger’a yazar ve bakiye artırır. */
async function addCredits(
  userId: string,
  creditsToAdd: number,
  meta: { pi?: string | null; inv?: string | null }
) {
  console.log("WEBHOOK addCredits called with:", { userId, creditsToAdd, meta });
  console.log("Validating credits amount:", { 
    creditsToAdd, 
    isNumber: typeof creditsToAdd === 'number', 
    isFinite: Number.isFinite(creditsToAdd),
    isPositive: creditsToAdd > 0 
  });
  
  if (!creditsToAdd || creditsToAdd <= 0) {
    console.log("Invalid creditsToAdd:", creditsToAdd);
    return { success: false, error: "Invalid credits amount" };
  }
  
  try {
    // Doğrudan Supabase client kullan
    const supabase = supa();
    console.log("Supabase client created");
    
    // Check if user exists in billing_customers table
    console.log("Checking if user exists in billing_customers table");
    const { data: userData, error: userError } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log("User check result:", { userData, userError });
    
    if (userError) {
      console.error("Error checking user:", userError);
      return { success: false, error: userError };
    }
    
    if (!userData) {
      console.error("User not found in billing_customers table:", userId);
      return { success: false, error: "User not found in billing_customers table" };
    }
    
    // billing_payments tablosuna kayıt ekle
    console.log("Inserting into billing_payments...");
    const paymentInsertData = { 
      user_id: userId, 
      stripe_payment_intent_id: meta.pi ?? 'unknown',
      amount_cents: creditsToAdd * 100, // varsayım: 1 kredi = 1 EUR
      status: 'succeeded',
      credit_amount: creditsToAdd,
      currency: 'eur'
    };
    console.log("Payment insert data:", paymentInsertData);
    
    const { data: paymentData, error: paymentError } = await supabase
      .from('billing_payments')
      .insert(paymentInsertData)
      .select();
    
    if (paymentError) {
      console.error("Error inserting into billing_payments:", paymentError);
      return { success: false, error: paymentError };
    }
    
    console.log("billing_payments insert success:", paymentData);
    
    // billing_credit_ledger tablosuna kayıt ekle
    console.log("Inserting into billing_credit_ledger...");
    const ledgerInsertData = { 
      user_id: userId, 
      delta: creditsToAdd, 
      reason: "purchase",
      stripe_payment_intent_id: meta.pi ?? null,
      stripe_invoice_id: meta.inv ?? null
    };
    console.log("Ledger insert data:", ledgerInsertData);
    
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .insert(ledgerInsertData);
    
    if (ledgerError) {
      console.error("Error inserting into billing_credit_ledger:", ledgerError);
      return { success: false, error: ledgerError };
    }
    
    console.log("billing_credit_ledger insert success:", ledgerData);
    
    // increment_credits fonksiyonunu çağır
    console.log("Calling increment_credits RPC...");
    const rpcParams = { 
      p_user_id: userId, 
      p_delta: creditsToAdd 
    };
    console.log("RPC params:", rpcParams);
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('increment_credits', rpcParams);
    
    if (rpcError) {
      console.error("Error calling increment_credits:", rpcError);
      return { success: false, error: rpcError };
    }
    
    console.log("increment_credits RPC success:", rpcData);
    
    // credit_transactions tablosuna kayıt ekle
    console.log("Inserting into credit_transactions...");
    const transactionInsertData = { 
      user_id: userId, 
      amount: creditsToAdd, 
      type: "purchase",
      description: `Purchased ${creditsToAdd} credits`,
      stripe_payment_intent_id: meta.pi ?? null,
      metadata: {
        source: "stripe_webhook",
        credits_purchased: creditsToAdd
      }
    };
    console.log("Transaction insert data:", transactionInsertData);
    
    const { data: transactionData, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert(transactionInsertData);
    
    if (transactionError) {
      console.error("Error inserting into credit_transactions:", transactionError);
      // Transaction hatası kritik değil, diğer işlemler devam etsin
    } else {
      console.log("credit_transactions insert success:", transactionData);
    }
    
    return { success: true, data: { paymentData, ledgerData, rpcData, transactionData } };
  } catch (err) {
    console.error("Unexpected error in webhook addCredits:", err);
    // Log detailed error information
    if (err instanceof Error) {
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
    }
    return { success: false, error: err };
  }
}

export async function POST(req: Request) {
  try {
    console.log("Manual webhook test endpoint called");
    const body = await req.json();
    console.log("Test body:", JSON.stringify(body, null, 2));
    
    // Extract required parameters from body
    const { userId, creditsToAdd, meta } = body;
    
    if (!userId || !creditsToAdd) {
      return NextResponse.json({ error: "Missing required parameters: userId and creditsToAdd" }, { status: 400 });
    }
    
    // Call the addCredits function directly
    console.log("Calling addCredits with:", { userId, creditsToAdd, meta });
    const result = await addCredits(userId, creditsToAdd, meta || {});
    
    console.log("addCredits result:", result);
    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error("Manual webhook test error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}