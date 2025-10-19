import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("=== Test Credit Insert Endpoint Called ===");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { userId, creditsToAdd, paymentIntentId } = body;
    
    if (!userId || !creditsToAdd) {
      return NextResponse.json({ error: "Missing required parameters: userId and creditsToAdd" }, { status: 400 });
    }
    
    // Create Supabase client with service role key
    console.log("Creating Supabase client...");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    
    // 1. Check if user exists in billing_customers table
    console.log("1. Checking user in billing_customers table...");
    const { data: userData, error: userError } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log("User data:", userData);
    if (userError) {
      console.error("User check error:", userError);
      return NextResponse.json({ error: "User check failed", details: userError.message }, { status: 500 });
    }
    
    if (!userData) {
      console.log("User not found, creating entry...");
      const { error: insertError } = await supabase
        .from('billing_customers')
        .insert({ 
          user_id: userId, 
          stripe_customer_id: 'test_customer_id',
          credits: 0 
        });
      
      if (insertError) {
        console.error("Failed to create user entry:", insertError);
        return NextResponse.json({ error: "Failed to create user entry", details: insertError.message }, { status: 500 });
      }
      
      console.log("User entry created successfully");
    }
    
    // 2. Insert into billing_payments
    console.log("2. Inserting into billing_payments...");
    const paymentInsertData = { 
      user_id: userId, 
      stripe_payment_intent_id: paymentIntentId || 'test_payment_intent',
      amount_cents: creditsToAdd * 100,
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
      console.error("Payment insert error:", paymentError);
      return NextResponse.json({ error: "Payment insert failed", details: paymentError.message }, { status: 500 });
    }
    
    console.log("Payment insert success:", paymentData);
    
    // 3. Insert into billing_credit_ledger
    console.log("3. Inserting into billing_credit_ledger...");
    const ledgerInsertData = { 
      user_id: userId, 
      delta: creditsToAdd, 
      reason: "purchase",
      stripe_payment_intent_id: paymentIntentId || 'test_payment_intent',
      stripe_invoice_id: null
    };
    
    console.log("Ledger insert data:", ledgerInsertData);
    
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .insert(ledgerInsertData);
    
    if (ledgerError) {
      console.error("Ledger insert error:", ledgerError);
      // Ledger hatası kritik değil, diğer işlemler devam etsin
    } else {
      console.log("Ledger insert success:", ledgerData);
    }
    
    // 4. Call increment_credits RPC
    console.log("4. Calling increment_credits RPC...");
    const rpcParams = { 
      p_user_id: userId, 
      p_delta: creditsToAdd 
    };
    
    console.log("RPC params:", rpcParams);
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('increment_credits', rpcParams);
    
    if (rpcError) {
      console.error("RPC call error:", rpcError);
      return NextResponse.json({ error: "RPC call failed", details: rpcError.message }, { status: 500 });
    }
    
    console.log("RPC call success:", rpcData);
    
    // 5. Insert into credit_transactions
    console.log("5. Inserting into credit_transactions...");
    const transactionInsertData = { 
      user_id: userId, 
      amount: creditsToAdd, 
      type: "purchase",
      description: `Purchased ${creditsToAdd} credits`,
      stripe_payment_intent_id: paymentIntentId || 'test_payment_intent',
      metadata: {
        source: "debug_endpoint",
        credits_purchased: creditsToAdd
      }
    };
    
    console.log("Transaction insert data:", transactionInsertData);
    
    const { data: transactionData, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert(transactionInsertData);
    
    if (transactionError) {
      console.error("Transaction insert error:", transactionError);
      // Transaction hatası kritik değil, diğer işlemler devam etsin
    } else {
      console.log("Transaction insert success:", transactionData);
    }
    
    console.log("=== Test Credit Insert Completed Successfully ===");
    return NextResponse.json({ 
      success: true, 
      data: { 
        paymentData, 
        ledgerData, 
        rpcData, 
        transactionData 
      } 
    }, { status: 200 });
  } catch (error) {
    console.error("Test credit insert error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}