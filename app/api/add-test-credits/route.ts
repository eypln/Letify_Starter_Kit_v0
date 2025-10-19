import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    console.log("Add test credits endpoint called");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { userId, credits } = body;
    
    if (!userId || !credits) {
      return NextResponse.json({ error: "Missing userId or credits" }, { status: 400 });
    }
    
    // Use the addCredits function from webhook
    const { addCredits } = await import('../stripe/webhook/route');
    
    const result = await addCredits(userId, credits, {
      pi: `test_payment_${Date.now()}`,
      inv: null
    });
    
    console.log("Add credits result:", result);
    
    if (!result.success) {
      return NextResponse.json({ error: "Failed to add credits", details: result.error }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error("Add test credits error:", error);
    // Handle import error specifically
    if (error instanceof Error && error.message.includes('addCredits is not a function')) {
      return NextResponse.json({ error: "Import error", details: "Could not import addCredits function" }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}