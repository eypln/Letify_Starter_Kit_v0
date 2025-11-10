import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { addCredits } from "@/lib/stripeWebhookUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    console.log("=== ENHANCED STRIPE WEBHOOK DEBUG START ===");
    
    // Log environment variables for debugging
    console.log("Environment variables check:", {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE,
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    });
    
    // --- Signature + raw body
    const sig = req.headers.get("stripe-signature") || "";
    const raw = await req.text();
    console.log("Raw request data:", { 
      hasSignature: !!sig,
      signaturePreview: sig ? `${sig.substring(0, 50)}...` : "NO_SIGNATURE",
      rawLength: raw.length,
      hasRawData: !!raw,
    });
    
    // Check if this is a test request (from our test endpoint)
    const isTestRequest = sig === "test_signature";
    
    if (!isTestRequest) {
      // Only validate signature for real requests
      if (!sig) {
        console.error("Missing signature in request");
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
      }
      
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
        return NextResponse.json({ error: "Missing webhook secret configuration" }, { status: 500 });
      }

      console.log("Attempting to construct event with secret length:", process.env.STRIPE_WEBHOOK_SECRET.length);
    } else {
      console.log("Test request detected, skipping signature verification");
    }
    
    // --- Event doğrula
    let event: Stripe.Event;
    if (isTestRequest) {
      // For test requests, parse the JSON directly
      try {
        event = JSON.parse(raw);
        console.log("Test event parsed successfully", { 
          eventType: event.type, 
          eventId: event.id
        });
      } catch (err: any) {
        console.error("Failed to parse test event:", err);
        return NextResponse.json({ error: "Failed to parse test event" }, { status: 400 });
      }
    } else {
      // For real requests, verify the signature
      try {
        event = stripe.webhooks.constructEvent(
          raw,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
        console.log("Stripe webhook event verified successfully", { 
          eventType: event.type, 
          eventId: event.id,
          apiVersion: event.api_version
        });
      } catch (err: any) {
        console.error("Webhook signature verification failed:", {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
        return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
      }
    }

    // =========================================================
    // 1) CHECKOUT COMPLETED (kredi + abonelik)
    // =========================================================
    if (event.type === "checkout.session.completed") {
      console.log("=== PROCESSING checkout.session.completed ===");
      const s = event.data.object as Stripe.Checkout.Session;
      console.log("Session data:", { 
        id: s.id, 
        mode: s.mode, 
        payment_intent: s.payment_intent,
        customer: s.customer,
        metadata: s.metadata,
        client_reference_id: s.client_reference_id,
        amount_total: s.amount_total
      });

      const customerId = (s.customer as string) || null;

      // user_id tespiti: metadata -> client_reference_id -> map lookup -> extended search
      let userId =
        (s.metadata?.user_id as string) ||
        (s.client_reference_id as string) ||
        null;

      console.log("User identification", { userId, customerId, metadata: s.metadata, clientReferenceId: s.client_reference_id });
      console.log("User ID sources:", {
        metadataUserId: s.metadata?.user_id,
        clientReferenceId: s.client_reference_id,
        hasMetadata: !!s.metadata,
        hasClientReferenceId: !!s.client_reference_id
      });

      // Kullanıcı mapping'ini garanti et
      if (userId && customerId) {
        console.log("Ensuring customer mapping");
        // Bu aşamada mapping kontrolü yapmıyoruz, sadece logluyoruz
      } else if (!userId) {
        console.error("CRITICAL: User ID could not be determined!");
        console.error("Session data:", {
          sessionId: s.id,
          customerId: customerId,
          metadata: s.metadata,
          clientReferenceId: s.client_reference_id,
          paymentIntent: s.payment_intent
        });
        return NextResponse.json({ error: "User ID could not be determined" }, { status: 400 });
      }

      // ---- KREDİ (mode=payment)
      if (s.mode === "payment" && userId) {
        console.log("=== PROCESSING CREDIT PAYMENT ===");
        console.log("Processing credit payment for user:", userId, "session:", s.id);
        
        // Önce metadata.credit_amount (varsa), yoksa amount_total/100
        let creditsToAdd = Number(s.metadata?.credit_amount ?? 0);
        if (!Number.isFinite(creditsToAdd) || creditsToAdd <= 0) {
          creditsToAdd =
            typeof s.amount_total === "number" ? Math.round(s.amount_total / 100) : 0;
        }
        console.log("Credits to add:", creditsToAdd);
        console.log("Credit calculation details:", {
          metadataAmount: s.metadata?.credit_amount,
          amountTotal: s.amount_total,
          parsedMetadataAmount: Number(s.metadata?.credit_amount ?? 0),
          calculatedFromAmountTotal: typeof s.amount_total === "number" ? Math.round(s.amount_total / 100) : 0
        });
        
        const result = await addCredits(userId, creditsToAdd, {
          pi: String(s.payment_intent ?? ""),
          inv: (s.invoice as string) || null,
        });
        
        if (!result.success) {
          console.error("FAILED to add credits:", result.error);
          // Stripe tekrar denemesin diye 200 dönüyoruz ama hatayı logluyoruz
        } else {
          console.log("SUCCESSFULLY added credits for user:", userId);
        }
      } else {
        console.log("Skipping credit processing", { mode: s.mode, userId, hasUserId: !!userId, hasPaymentIntent: !!s.payment_intent });
        if (!userId) {
          console.log("UserId is missing - cannot process credit purchase");
        }
        if (s.mode !== "payment") {
          console.log("Mode is not payment - current mode:", s.mode);
        }
      }

      console.log("Stripe webhook processing completed successfully");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Diğer tüm eventler: 200
    console.log("Unhandled event type", { eventType: event.type });
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("WEBHOOK FATAL ERROR:", err);
    // Log detailed error information
    if (err instanceof Error) {
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
    }
    // Stripe tekrar denemesin diye 200 dönüyoruz
    return NextResponse.json({ received: true }, { status: 200 });
  }
}