import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("=== Get All Billing Data Endpoint Called ===");
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
    
    // 1. Get user's billing customer data
    console.log("1. Getting user's billing customer data...");
    const { data: billingCustomer, error: customerError } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (customerError) {
      console.error("Error getting billing customer:", customerError);
    }
    
    console.log("Billing customer data:", billingCustomer);
    
    // 2. Get all billing customer entries for this user (to check for duplicates)
    console.log("2. Getting all billing customer entries...");
    const { data: allBillingCustomers, error: allCustomersError } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId);
    
    if (allCustomersError) {
      console.error("Error getting all billing customers:", allCustomersError);
    }
    
    // 3. Get user's billing subscriptions
    console.log("3. Getting user's billing subscriptions...");
    const { data: billingSubscriptions, error: subscriptionsError } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (subscriptionsError) {
      console.error("Error getting billing subscriptions:", subscriptionsError);
    }
    
    // 4. Get user's credit transactions
    console.log("4. Getting user's credit transactions...");
    const { data: creditTransactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (transactionsError) {
      console.error("Error getting credit transactions:", transactionsError);
    }
    
    // 5. Get user's billing payments
    console.log("5. Getting user's billing payments...");
    const { data: billingPayments, error: paymentsError } = await supabase
      .from('billing_payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (paymentsError) {
      console.error("Error getting billing payments:", paymentsError);
    }
    
    // 6. Get user's billing credit ledger entries
    console.log("6. Getting user's billing credit ledger entries...");
    const { data: creditLedger, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (ledgerError) {
      console.error("Error getting credit ledger:", ledgerError);
    }
    
    // 7. Get user's profile data
    console.log("7. Getting user's profile data...");
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (profileError) {
      console.error("Error getting profile data:", profileError);
    }
    
    console.log("=== Get All Billing Data Completed Successfully ===");
    return NextResponse.json({ 
      userId,
      billingCustomer: billingCustomer || null,
      allBillingCustomers: allBillingCustomers || [],
      billingSubscriptions: billingSubscriptions || [],
      creditTransactions: creditTransactions || [],
      billingPayments: billingPayments || [],
      creditLedger: creditLedger || [],
      profile: profileData || null
    }, { status: 200 });
  } catch (error) {
    console.error("Get all billing data error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}