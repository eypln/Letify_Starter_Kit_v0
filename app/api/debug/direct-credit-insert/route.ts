import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("=== Direct Credit Insert Endpoint Called ===");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { userId, creditsToAdd, description } = body;
    
    if (!userId || !creditsToAdd) {
      return NextResponse.json({ error: "Missing required parameters: userId and creditsToAdd" }, { status: 400 });
    }
    
    // Create Supabase client with service role key
    console.log("Creating Supabase client...");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    
    // 1. Insert directly into credit_transactions
    console.log("1. Inserting directly into credit_transactions...");
    const transactionInsertData = { 
      user_id: userId, 
      amount: creditsToAdd, 
      type: "purchase",
      description: description || `Direct purchase of ${creditsToAdd} credits`,
      stripe_payment_intent_id: null,
      metadata: {
        source: "direct_insert",
        credits_purchased: creditsToAdd,
        inserted_at: new Date().toISOString()
      }
    };
    
    console.log("Transaction insert data:", transactionInsertData);
    
    const { data: transactionData, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert(transactionInsertData);
    
    if (transactionError) {
      console.error("Transaction insert error:", transactionError);
      return NextResponse.json({ error: "Transaction insert failed", details: transactionError.message }, { status: 500 });
    }
    
    console.log("Transaction insert success:", transactionData);
    
    // 2. Update user's credit balance in billing_customers
    console.log("2. Updating user's credit balance in billing_customers...");
    const { data: updateData, error: updateError } = await supabase
      .from('billing_customers')
      .update({ credits: supabase.rpc('increment_credits', { p_user_id: userId, p_delta: creditsToAdd }) })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error("Credit balance update error:", updateError);
      // Try alternative approach
      console.log("Trying alternative approach to update credit balance...");
      
      // First get current credits
      const { data: userData, error: userError } = await supabase
        .from('billing_customers')
        .select('credits')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (userError) {
        console.error("Failed to get user data:", userError);
        return NextResponse.json({ error: "Failed to get user data", details: userError.message }, { status: 500 });
      }
      
      if (!userData) {
        console.log("User not found in billing_customers, creating entry...");
        const { error: insertError } = await supabase
          .from('billing_customers')
          .insert({ 
            user_id: userId, 
            stripe_customer_id: 'direct_insert_customer',
            credits: creditsToAdd 
          });
        
        if (insertError) {
          console.error("Failed to create user entry:", insertError);
          return NextResponse.json({ error: "Failed to create user entry", details: insertError.message }, { status: 500 });
        }
      } else {
        // Update existing user's credits
        const newCredits = (userData.credits || 0) + creditsToAdd;
        const { error: updateError2 } = await supabase
          .from('billing_customers')
          .update({ credits: newCredits })
          .eq('user_id', userId);
        
        if (updateError2) {
          console.error("Credit balance update error (alternative):", updateError2);
          return NextResponse.json({ error: "Credit balance update failed", details: updateError2.message }, { status: 500 });
        }
        
        console.log("Credit balance updated successfully to:", newCredits);
      }
    } else {
      console.log("Credit balance update success:", updateData);
    }
    
    console.log("=== Direct Credit Insert Completed Successfully ===");
    return NextResponse.json({ 
      success: true, 
      data: { 
        transactionData
      } 
    }, { status: 200 });
  } catch (error) {
    console.error("Direct credit insert error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}