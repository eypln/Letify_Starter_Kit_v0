import { NextResponse } from "next/server";

// Import the webhook handler
import { POST as webhookHandler } from "@/app/api/stripe/webhook/route";

export async function POST(req: Request) {
  try {
    console.log("=== Simulate Webhook Endpoint Called ===");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { eventType, eventData } = body;
    
    if (!eventType) {
      return NextResponse.json({ error: "Missing eventType parameter" }, { status: 400 });
    }
    
    // Create a mock Stripe event
    const mockEvent = {
      id: `evt_test_${Date.now()}`,
      object: "event",
      api_version: "2020-08-27",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: eventData || {}
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: `req_test_${Date.now()}`,
        idempotency_key: null
      },
      type: eventType
    };
    
    // Create a mock request to simulate what Stripe sends
    const mockRequest = new Request('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
        'content-type': 'application/json',
        'user-agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)'
      },
      body: JSON.stringify(mockEvent),
    });
    
    console.log("Simulating webhook event:", { eventType, eventData });
    
    // Call the actual webhook handler
    const response = await webhookHandler(mockRequest);
    
    console.log("Webhook handler response:", response);
    
    console.log("=== Simulate Webhook Completed ===");
    return NextResponse.json({ 
      success: true,
      eventType,
      response: await response.json()
    }, { status: 200 });
  } catch (error) {
    console.error("Simulate webhook error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}