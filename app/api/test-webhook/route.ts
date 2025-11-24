import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("Test webhook received");
    const body = await req.json();
    console.log("Test webhook body:", JSON.stringify(body, null, 2));
    
    // Return success response
    return NextResponse.json({ received: true, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (error) {
    console.error("Test webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // Test the actual webhook with a simulated event
  try {
    const url = new URL(req.url);
    const eventType = url.searchParams.get('type') || 'checkout.session.completed';
    
    console.log("Manual webhook test triggered", { eventType });
    
    // Create a simulated Stripe event
    const simulatedEvent = {
      id: 'evt_test_' + Date.now(),
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'cs_test_' + Date.now(),
          object: 'checkout.session',
          amount_total: 5000,
          currency: 'eur',
          customer: 'cus_test123',
          metadata: {
            user_id: 'test_user_id',
            credit_amount: '50'
          },
          mode: 'payment',
          payment_intent: 'pi_test_' + Date.now(),
          client_reference_id: 'test_user_id'
        }
      },
      livemode: false,
      pending_webhooks: 1,
      type: eventType
    };
    
    console.log("Simulated event created", simulatedEvent);
    
    // Try to send this to our actual webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/stripe/webhook`;
    console.log("Sending to webhook:", webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature' // Special test signature
      },
      body: JSON.stringify(simulatedEvent)
    });
    
    const result = await response.json();
    console.log("Webhook response:", { status: response.status, result });
    
    return NextResponse.json({ 
      message: "Manual webhook test completed",
      timestamp: new Date().toISOString(),
      sentTo: webhookUrl,
      response: result
    }, { status: 200 });
  } catch (err) {
    const error = err as Error;
    console.error("Manual webhook test error:", err);
    return NextResponse.json({ error: "Internal server error", details: error.message || 'Unknown error' }, { status: 500 });
  }
}
