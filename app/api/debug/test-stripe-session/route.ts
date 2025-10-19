import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    console.log("=== Test Stripe Session Endpoint Called ===");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { sessionId } = body;
    
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
    }
    
    // Retrieve the Stripe session
    console.log("Retrieving Stripe session:", sessionId);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log("Session data:", {
      id: session.id,
      mode: session.mode,
      payment_intent: session.payment_intent,
      customer: session.customer,
      metadata: session.metadata,
      client_reference_id: session.client_reference_id,
      amount_total: session.amount_total,
      currency: session.currency,
      status: session.status
    });
    
    // Extract user identification information
    const customerId = (session.customer as string) || null;
    const userId = 
      (session.metadata?.user_id as string) ||
      (session.client_reference_id as string) ||
      null;
    
    console.log("User identification:", { 
      userId, 
      customerId, 
      metadata: session.metadata, 
      clientReferenceId: session.client_reference_id 
    });
    
    return NextResponse.json({ 
      sessionId: session.id,
      mode: session.mode,
      userId,
      customerId,
      metadata: session.metadata,
      clientReferenceId: session.client_reference_id,
      amountTotal: session.amount_total,
      currency: session.currency,
      status: session.status
    }, { status: 200 });
  } catch (error) {
    console.error("Test Stripe session error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}