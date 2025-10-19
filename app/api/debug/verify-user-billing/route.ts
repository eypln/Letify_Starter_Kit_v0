import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("=== Verify User Billing Endpoint Called ===");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }
    
    // Create Supabase client with service role key
    console.log("Creating Supabase client...");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    
    // 1. Verify user exists in billing_customers
    console.log("1. Verifying user in billing_customers...");
    const { data: billingCustomer, error: customerError } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (customerError) {
      console.error("Error checking billing customer:", customerError);
      return NextResponse.json({ error: "Error checking billing customer", details: customerError.message }, { status: 500 });
    }
    
    const userExists = !!billingCustomer;
    console.log("User exists in billing_customers:", userExists);
    
    // 2. If user doesn't exist, create entry
    if (!userExists) {
      console.log("Creating user entry in billing_customers...");
      const { error: insertError } = await supabase
        .from('billing_customers')
        .insert({ 
          user_id: userId, 
          stripe_customer_id: 'verify_user_billing',
          credits: 0 
        });
      
      if (insertError) {
        console.error("Failed to create user entry:", insertError);
        return NextResponse.json({ error: "Failed to create user entry", details: insertError.message }, { status: 500 });
      }
      
      console.log("User entry created successfully");
    }
    
    // 3. Check all billing tables for user data
    console.log("2. Checking all billing tables for user data...");
    
    // Check billing_payments
    const { data: billingPayments, error: paymentsError } = await supabase
      .from('billing_payments')
      .select('count')
      .eq('user_id', userId);
    
    const paymentsCount = paymentsError ? 0 : (billingPayments[0]?.count || 0);
    console.log("Billing payments count:", paymentsCount);
    
    // Check billing_credit_ledger
    const { data: creditLedger, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .select('count')
      .eq('user_id', userId);
    
    const ledgerCount = ledgerError ? 0 : (creditLedger[0]?.count || 0);
    console.log("Credit ledger count:", ledgerCount);
    
    // Check credit_transactions
    const { data: creditTransactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('count')
      .eq('user_id', userId);
    
    const transactionsCount = transactionsError ? 0 : (creditTransactions[0]?.count || 0);
    console.log("Credit transactions count:", transactionsCount);
    
    // Check billing_subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('billing_subscriptions')
      .select('count')
      .eq('user_id', userId);
    
    const subscriptionsCount = subscriptionsError ? 0 : (subscriptions[0]?.count || 0);
    console.log("Billing subscriptions count:", subscriptionsCount);
    
    // 4. Get current credit balance
    console.log("3. Getting current credit balance...");
    const { data: currentCustomer, error: currentError } = await supabase
      .from('billing_customers')
      .select('credits')
      .eq('user_id', userId)
      .maybeSingle();
    
    const currentCredits = currentError ? 0 : (currentCustomer?.credits || 0);
    console.log("Current credits:", currentCredits);
    
    console.log("=== Verify User Billing Completed Successfully ===");
    return NextResponse.json({ 
      userId,
      userExists: true,
      currentCredits,
      tableCounts: {
        billing_payments: paymentsCount,
        billing_credit_ledger: ledgerCount,
        credit_transactions: transactionsCount,
        billing_subscriptions: subscriptionsCount
      },
      message: "User billing verification completed successfully"
    }, { status: 200 });
  } catch (error) {
    console.error("Verify user billing error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}