import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("=== Check User Credits Endpoint Called ===");
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
    
    // 1. Get user's current credit balance
    console.log("1. Getting user's current credit balance...");
    const { data: billingCustomer, error: customerError } = await supabase
      .from('billing_customers')
      .select('credits, stripe_customer_id, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (customerError) {
      console.error("Error getting billing customer:", customerError);
      return NextResponse.json({ error: "Error getting billing customer", details: customerError.message }, { status: 500 });
    }
    
    console.log("Billing customer data:", billingCustomer);
    
    // 2. Get recent credit transactions
    console.log("2. Getting recent credit transactions...");
    const { data: creditTransactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (transactionsError) {
      console.error("Error getting credit transactions:", transactionsError);
    } else {
      console.log("Credit transactions count:", creditTransactions?.length || 0);
    }
    
    // 3. Get recent billing payments
    console.log("3. Getting recent billing payments...");
    const { data: billingPayments, error: paymentsError } = await supabase
      .from('billing_payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (paymentsError) {
      console.error("Error getting billing payments:", paymentsError);
    } else {
      console.log("Billing payments count:", billingPayments?.length || 0);
    }
    
    // 4. Get recent credit ledger entries
    console.log("4. Getting recent credit ledger entries...");
    const { data: creditLedger, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (ledgerError) {
      console.error("Error getting credit ledger:", ledgerError);
    } else {
      console.log("Credit ledger entries count:", creditLedger?.length || 0);
    }
    
    // 5. Check if user exists in profiles table
    console.log("5. Checking user in profiles table...");
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (profileError) {
      console.error("Error getting profile data:", profileError);
    } else {
      console.log("Profile data:", profileData);
    }
    
    console.log("=== Check User Credits Completed Successfully ===");
    return NextResponse.json({ 
      userId,
      currentCredits: billingCustomer?.credits || 0,
      stripeCustomerId: billingCustomer?.stripe_customer_id || null,
      lastUpdated: billingCustomer?.updated_at || null,
      creditTransactions: creditTransactions || [],
      billingPayments: billingPayments || [],
      creditLedger: creditLedger || [],
      profileCredits: profileData?.credits || 0
    }, { status: 200 });
  } catch (error) {
    console.error("Check user credits error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}