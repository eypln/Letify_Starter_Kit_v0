import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Mock the webhook handler function
async function handleCheckoutSessionCompleted(session: any) {
  console.log("=== MOCK WEBHOOK HANDLER ===");
  console.log("Session data:", session);
  
  // Simulate the webhook processing
  const testData = {
    type: "checkout.session.completed",
    data: {
      object: session
    }
  };
  
  // Import and call the actual webhook handler
  try {
    // We'll create a mock request to simulate what the webhook receives
    const mockRequest = new Request('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
        'content-type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    // Dynamically import the webhook handler
    const webhookModule = await import('@/app/api/stripe/webhook/route');
    if (webhookModule && typeof webhookModule.POST === 'function') {
      console.log("Calling actual webhook handler...");
      const response = await webhookModule.POST(mockRequest);
      console.log("Webhook handler response:", response);
      return response;
    } else {
      console.error("Webhook handler not found");
      return NextResponse.json({ error: "Webhook handler not found" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error calling webhook handler:", error);
    return NextResponse.json({ error: "Error calling webhook handler", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    console.log("=== Test Webhook Event Endpoint Called ===");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { sessionId } = body;
    
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
    }
    
    // Retrieve the Stripe session
    console.log("Retrieving Stripe session:", sessionId);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log("Session data retrieved:", {
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
    
    // Process the session as if it came from a webhook
    const response = await handleCheckoutSessionCompleted(session);
    
    console.log("=== Test Webhook Event Completed ===");
    return response;
  } catch (error) {
    console.error("Test webhook event error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}