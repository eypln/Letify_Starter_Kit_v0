import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("=== Add Credits Direct Endpoint Called ===");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { userId, creditsToAdd, description } = body;
    
    if (!userId || !creditsToAdd) {
      return NextResponse.json({ error: "Missing required parameters: userId and creditsToAdd" }, { status: 400 });
    }
    
    // Validate creditsToAdd is a positive number
    const credits = Number(creditsToAdd);
    if (isNaN(credits) || credits <= 0) {
      return NextResponse.json({ error: "creditsToAdd must be a positive number" }, { status: 400 });
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
      .select('credits')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log("User data:", userData);
    if (userError) {
      console.error("User check error:", userError);
      return NextResponse.json({ error: "User check failed", details: userError.message }, { status: 500 });
    }
    
    // 2. If user doesn't exist, create entry
    if (!userData) {
      console.log("User not found in billing_customers, creating entry...");
      const { error: insertError } = await supabase
        .from('billing_customers')
        .insert({ 
          user_id: userId, 
          stripe_customer_id: 'direct_add_credits',
          credits: 0 
        });
      
      if (insertError) {
        console.error("Failed to create user entry:", insertError);
        return NextResponse.json({ error: "Failed to create user entry", details: insertError.message }, { status: 500 });
      }
      
      console.log("User entry created successfully");
    }
    
    // 3. Add credits to user's balance using increment_credits function
    console.log("2. Adding credits to user's balance...");
    const { error: rpcError } = await supabase
      .rpc('increment_credits', { 
        p_user_id: userId, 
        p_delta: credits 
      });
    
    if (rpcError) {
      console.error("RPC call error:", rpcError);
      return NextResponse.json({ error: "Failed to add credits", details: rpcError.message }, { status: 500 });
    }
    
    console.log("Credits added successfully");
    
    // 4. Add entry to credit_transactions table
    console.log("3. Adding entry to credit_transactions table...");
    const { data: transactionData, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: credits,
        type: "bonus",
        description: description || `Direct credit addition of ${credits} credits`,
        metadata: {
          source: "debug_endpoint",
          added_via: "direct_add_credits_endpoint",
          timestamp: new Date().toISOString()
        }
      });
    
    if (transactionError) {
      console.error("Transaction insert error:", transactionError);
      // This is not critical, continue
    } else {
      console.log("Transaction entry added:", transactionData);
    }
    
    // 5. Add entry to billing_credit_ledger table
    console.log("4. Adding entry to billing_credit_ledger table...");
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .insert({
        user_id: userId,
        delta: credits,
        reason: "bonus",
        stripe_payment_intent_id: null,
        stripe_invoice_id: null
      });
    
    if (ledgerError) {
      console.error("Ledger insert error:", ledgerError);
      // This is not critical, continue
    } else {
      console.log("Ledger entry added:", ledgerData);
    }
    
    console.log("=== Add Credits Direct Completed Successfully ===");
    return NextResponse.json({ 
      success: true,
      userId,
      creditsAdded: credits,
      message: `Successfully added ${credits} credits to user ${userId}`
    }, { status: 200 });
  } catch (error) {
    console.error("Add credits direct error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}