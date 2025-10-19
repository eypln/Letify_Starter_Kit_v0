import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("Get user credits endpoint called");
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
    
    // Get user credits
    const { data, error } = await supabase
      .from('billing_customers')
      .select('credits')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error getting user credits:", error);
      return NextResponse.json({ error: "Error getting user credits", details: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ userId, credits: data?.credits || 0 }, { status: 200 });
  } catch (error) {
    console.error("Get user credits error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}