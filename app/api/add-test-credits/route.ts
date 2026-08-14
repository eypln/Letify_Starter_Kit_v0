import { NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    console.log("Add test credits endpoint called");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { userId, credits } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin' || profile.status === 'denied') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    if (!userId || !credits) {
      return NextResponse.json({ error: "Missing userId or credits" }, { status: 400 });
    }

    const creditAmount = Number(credits);
    if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
      return NextResponse.json({ error: "Credits must be a positive number" }, { status: 400 });
    }
    
    // Use the addCredits function from lib
    const { addCredits } = await import('@/lib/billing');
    
    const result = await addCredits(userId, creditAmount, {
      reason: "test_add",
      payment_intent_id: `test_payment_${Date.now()}`,
      invoice_id: undefined
    });
    
    console.log("Add credits result:", result);
    
    if (!result.success) {
      console.error("Add test credits failed:", result.error);
      return NextResponse.json({ error: "Failed to add credits" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error("Add test credits error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}