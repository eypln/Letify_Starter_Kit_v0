import { createClient } from "@supabase/supabase-js";

/** Supabase service-role client (RLS'i baypas eder). */
export const supa = () => {
  console.log("=== SUPABASE CLIENT CREATION ===");
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...");
  console.log("Has Service Role:", !!process.env.SUPABASE_SERVICE_ROLE);
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing!");
    return null;
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE) {
    console.error("CRITICAL: SUPABASE_SERVICE_ROLE is missing!");
    return null;
  }
  
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    console.log("Supabase client created successfully");
    return client;
  } catch (error) {
    console.error("ERROR creating Supabase client:", error);
    return null;
  }
};

/** Krediyi ledger'a yazar ve bakiye artırır. */
export async function addCredits(
  userId: string,
  creditsToAdd: number,
  meta: { pi?: string | null; inv?: string | null }
) {
  console.log("=== ADD CREDITS FUNCTION START ===");
  console.log("Parameters:", { userId, creditsToAdd, meta });
  
  if (!creditsToAdd || creditsToAdd <= 0) {
    console.log("Invalid creditsToAdd:", creditsToAdd);
    return { success: false, error: "Invalid credits amount" };
  }

  try {
    const supabase = supa();
    if (!supabase) {
      return { success: false, error: "Supabase client initialization failed" };
    }

    // Kullanıcıyı doğrula
    console.log("=== STEP 1: Validating user ===");
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, credits_balance')
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      console.error("ERROR validating user:", userError);
      return { success: false, error: `User validation failed: ${userError?.message}` };
    }
    
    console.log("User validated:", { userId, currentBalance: userData.credits_balance });
    
    // billing_payments tablosuna kayıt ekle
    console.log("=== STEP 2: Inserting into billing_payments ===");
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
      console.error("ERROR inserting into billing_payments:", paymentError);
      return { success: false, error: `Payment insert failed: ${paymentError.message}` };
    }
    
    console.log("billing_payments insert SUCCESS:", paymentData);
    
    // billing_credit_ledger tablosuna kayıt ekle
    console.log("=== STEP 3: Inserting into billing_credit_ledger ===");
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
      console.error("ERROR inserting into billing_credit_ledger:", ledgerError);
      // Ledger hatası kritik değil, diğer işlemler devam etsin
      console.log("Continuing despite ledger error...");
    } else {
      console.log("billing_credit_ledger insert SUCCESS:", ledgerData);
    }
    
    // increment_credits fonksiyonunu çağır
    console.log("=== STEP 4: Calling increment_credits RPC ===");
    const rpcParams = { 
      p_user_id: userId, 
      p_delta: creditsToAdd 
    };
    console.log("RPC params:", rpcParams);
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('increment_credits', rpcParams);
    
    if (rpcError) {
      console.error("ERROR calling increment_credits:", rpcError);
      return { success: false, error: `RPC call failed: ${rpcError.message}` };
    }
    
    console.log("increment_credits RPC SUCCESS:", rpcData);
    
    // credit_transactions tablosuna kayıt ekle
    console.log("=== STEP 5: Inserting into credit_transactions ===");
    const transactionInsertData = { 
      user_id: userId, 
      amount: creditsToAdd, 
      type: "purchase",
      description: `Purchased ${creditsToAdd} credits`,
      stripe_payment_intent_id: meta.pi ?? null,
      metadata: {
        source: "stripe_webhook_debug",
        credits_purchased: creditsToAdd
      }
    };
    console.log("Transaction insert data:", transactionInsertData);
    
    const { data: transactionData, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert(transactionInsertData);
    
    if (transactionError) {
      console.error("ERROR inserting into credit_transactions:", transactionError);
      // Transaction hatası kritik değil, diğer işlemler devam etsin
      console.log("Continuing despite transaction error...");
    } else {
      console.log("credit_transactions insert SUCCESS:", transactionData);
    }
    
    console.log("=== ADD CREDITS FUNCTION COMPLETED SUCCESSFULLY ===");
    return { success: true, data: { paymentData, ledgerData, rpcData, transactionData } };
  } catch (err) {
    console.error("UNEXPECTED ERROR in addCredits:", err);
    // Log detailed error information
    if (err instanceof Error) {
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
    }
    return { success: false, error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
