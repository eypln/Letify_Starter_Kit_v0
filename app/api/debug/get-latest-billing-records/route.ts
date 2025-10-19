import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    console.log("Get latest billing records endpoint called");
    
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    
    // Get latest billing_customers records
    const { data: customers, error: customersError } = await supabase
      .from('billing_customers')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (customersError) {
      console.error("Error getting billing customers:", customersError);
    }
    
    // Get latest billing_payments records
    const { data: payments, error: paymentsError } = await supabase
      .from('billing_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (paymentsError) {
      console.error("Error getting billing payments:", paymentsError);
    }
    
    // Get latest billing_credit_ledger records
    const { data: ledger, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (ledgerError) {
      console.error("Error getting billing credit ledger:", ledgerError);
    }
    
    // Get latest credit_transactions records
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (transactionsError) {
      console.error("Error getting credit transactions:", transactionsError);
    }
    
    // Get latest billing_subscriptions records
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (subscriptionsError) {
      console.error("Error getting billing subscriptions:", subscriptionsError);
    }
    
    return NextResponse.json({ 
      billing_customers: customers || [],
      billing_payments: payments || [],
      billing_credit_ledger: ledger || [],
      credit_transactions: transactions || [],
      billing_subscriptions: subscriptions || []
    }, { status: 200 });
  } catch (error) {
    console.error("Get latest billing records error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}