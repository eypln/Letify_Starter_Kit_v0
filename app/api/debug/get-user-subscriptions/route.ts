import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("Get user subscriptions endpoint called");
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
    
    // Get user subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    if (subscriptionsError) {
      console.error("Error getting user subscriptions:", subscriptionsError);
      return NextResponse.json({ error: "Error getting user subscriptions", details: subscriptionsError.message }, { status: 500 });
    }
    
    // Also check for subscriptions with the other Stripe customer ID
    const { data: subscriptionsWithOtherId, error: otherIdError } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('stripe_customer_id', 'cus_Sz46Bd2WeI0mIH');
    
    if (otherIdError) {
      console.error("Error checking subscriptions with other Stripe ID:", otherIdError);
    }
    
    return NextResponse.json({ 
      userId, 
      subscriptions: subscriptions || [],
      subscriptionsWithOtherId: subscriptionsWithOtherId || []
    }, { status: 200 });
  } catch (error) {
    console.error("Get user subscriptions error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}