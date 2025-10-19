import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("Fix user Stripe mapping endpoint called");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { userId, stripeCustomerId } = body;
    
    if (!userId || !stripeCustomerId) {
      return NextResponse.json({ error: "Missing userId or stripeCustomerId" }, { status: 400 });
    }
    
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    
    // Update user's Stripe customer ID
    const { data, error } = await supabase
      .from('billing_customers')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error("Error updating user Stripe ID:", error);
      return NextResponse.json({ error: "Error updating user Stripe ID", details: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "User Stripe customer ID updated successfully",
      userId,
      stripeCustomerId,
      updatedRecord: data
    }, { status: 200 });
  } catch (error) {
    console.error("Fix user Stripe mapping error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}