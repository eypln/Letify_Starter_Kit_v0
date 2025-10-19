import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("=== Get Stripe Customer ID Endpoint Called ===");
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
    
    // Get user's Stripe customer ID from billing_customers table
    console.log("Getting user's Stripe customer ID...");
    const { data: billingCustomer, error: customerError } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id, credits, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (customerError) {
      console.error("Error getting billing customer:", customerError);
      return NextResponse.json({ error: "Error getting billing customer", details: customerError.message }, { status: 500 });
    }
    
    console.log("Billing customer data:", billingCustomer);
    
    // Also check if there are multiple entries for this user
    console.log("Checking for duplicate entries...");
    const { data: allEntries, error: allEntriesError } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId);
    
    if (allEntriesError) {
      console.error("Error getting all entries:", allEntriesError);
    } else {
      console.log("All entries count:", allEntries?.length || 0);
      if (allEntries && allEntries.length > 1) {
        console.log("WARNING: Multiple entries found for user:", allEntries);
      }
    }
    
    // Check if this Stripe customer ID is used by other users
    if (billingCustomer?.stripe_customer_id) {
      console.log("Checking if Stripe customer ID is used by other users...");
      const { data: otherUsers, error: otherUsersError } = await supabase
        .from('billing_customers')
        .select('user_id')
        .eq('stripe_customer_id', billingCustomer.stripe_customer_id)
        .neq('user_id', userId);
      
      if (otherUsersError) {
        console.error("Error checking other users:", otherUsersError);
      } else {
        console.log("Other users with same Stripe customer ID:", otherUsers);
        if (otherUsers && otherUsers.length > 0) {
          console.log("WARNING: Stripe customer ID is shared with other users");
        }
      }
    }
    
    console.log("=== Get Stripe Customer ID Completed Successfully ===");
    return NextResponse.json({ 
      userId,
      stripeCustomerId: billingCustomer?.stripe_customer_id || null,
      credits: billingCustomer?.credits || 0,
      createdAt: billingCustomer?.created_at || null,
      updatedAt: billingCustomer?.updated_at || null,
      duplicateEntries: (allEntries && allEntries.length > 1) ? allEntries : null
    }, { status: 200 });
  } catch (error) {
    console.error("Get Stripe customer ID error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}