import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("Get transactions endpoint called");
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
    
    // Get user transactions
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error("Error getting user transactions:", error);
      return NextResponse.json({ error: "Error getting user transactions", details: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ userId, transactions: data || [] }, { status: 200 });
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}