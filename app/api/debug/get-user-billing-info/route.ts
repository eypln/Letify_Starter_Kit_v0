import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("Get user billing info endpoint called");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    
    // Get user billing customers info
    const { data: billingCustomers, error: billingError } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId);
    
    if (billingError) {
      console.error("Error getting billing customers:", billingError);
      return NextResponse.json({ error: "Error getting billing customers", details: billingError.message }, { status: 500 });
    }
    
    // Get all billing customers with the same user_id to check for duplicates
    const { data: allBillingCustomers, error: allBillingError } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId);
    
    if (allBillingError) {
      console.error("Error getting all billing customers:", allBillingError);
    }
    
    // Check for any records with different stripe_customer_id in the past
    const { data: allCustomerRecords, error: allCustomerError } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId);
    
    if (allCustomerError) {
      console.error("Error getting all customer records:", allCustomerError);
    }
    
    // Check for any billing payments with different customer references
    const { data: allPayments, error: allPaymentsError } = await supabase
      .from('billing_payments')
      .select('stripe_payment_intent_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (allPaymentsError) {
      console.error("Error getting all payments:", allPaymentsError);
    }
    
    // Check for any credit ledger entries with different customer references
    const { data: allLedger, error: allLedgerError } = await supabase
      .from('billing_credit_ledger')
      .select('stripe_payment_intent_id, stripe_invoice_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (allLedgerError) {
      console.error("Error getting all ledger entries:", allLedgerError);
    }
    
    // Also check if there are any other users with the same stripe_customer_id
    if (billingCustomers && billingCustomers.length > 0) {
      const stripeCustomerId = billingCustomers[0].stripe_customer_id;
      const { data: otherUsers, error: otherUsersError } = await supabase
        .from('billing_customers')
        .select('*')
        .eq('stripe_customer_id', stripeCustomerId)
        .neq('user_id', userId);
      
      if (otherUsersError) {
        console.error("Error checking for other users with same stripe customer ID:", otherUsersError);
      }
      
      if (otherUsers && otherUsers.length > 0) {
        console.log("WARNING: Other users found with the same stripe customer ID:", otherUsers);
      }
    }
    
    // Get user credit transactions
    const { data: creditTransactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (transactionsError) {
      console.error("Error getting credit transactions:", transactionsError);
      return NextResponse.json({ error: "Error getting credit transactions", details: transactionsError.message }, { status: 500 });
    }
    
    // Get user billing payments
    const { data: billingPayments, error: paymentsError } = await supabase
      .from('billing_payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (paymentsError) {
      console.error("Error getting billing payments:", paymentsError);
      return NextResponse.json({ error: "Error getting billing payments", details: paymentsError.message }, { status: 500 });
    }
    
    // Get user billing credit ledger
    const { data: creditLedger, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (ledgerError) {
      console.error("Error getting credit ledger:", ledgerError);
      return NextResponse.json({ error: "Error getting credit ledger", details: ledgerError.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      userId, 
      billingCustomers: billingCustomers || [],
      allBillingCustomers: allBillingCustomers || [],
      allCustomerRecords: allCustomerRecords || [],
      allPayments: allPayments || [],
      allLedger: allLedger || [],
      creditTransactions: creditTransactions || [],
      billingPayments: billingPayments || [],
      creditLedger: creditLedger || []
    }, { status: 200 });
  } catch (error) {
    console.error("Get user billing info error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}