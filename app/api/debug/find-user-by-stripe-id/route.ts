import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("Find user by Stripe ID endpoint called");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { stripeCustomerId } = body;
    
    if (!stripeCustomerId) {
      return NextResponse.json({ error: "Missing stripeCustomerId" }, { status: 400 });
    }
    
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    
    // Find user by Stripe customer ID
    const { data, error } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle();
    
    if (error) {
      console.error("Error finding user by Stripe ID:", error);
      return NextResponse.json({ error: "Error finding user", details: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ stripeCustomerId, user: data || null }, { status: 200 });
  } catch (error) {
    console.error("Find user by Stripe ID error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}