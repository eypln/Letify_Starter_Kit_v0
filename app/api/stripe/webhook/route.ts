import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { addCredits } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unix saniyeyi ISO'ya çevirir; sayı yoksa "şimdi" döner (NOT NULL kolonları korur). */
const toIso = (n: unknown): string =>
  typeof n === "number" && Number.isFinite(n)
    ? new Date(n * 1000).toISOString()
    : new Date().toISOString();

/** Supabase service-role client (RLS'i baypas eder). */
const supa = () => {
  console.log("Creating Supabase client with:", {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE
  });
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE! // DİKKAT: anon key değil!
  );
};

/** user_id ↔ stripe_customer_id eşleşmesini garanti eder. */
async function ensureMap(userId: string, customerId?: string | null) {
  console.log("ensureMap called with:", { userId, customerId });
  if (!userId || !customerId) {
    console.log("Skipping ensureMap - missing userId or customerId");
    return;
  }
  const { error } = await supa()
    .from("billing_customers")
    .upsert({ user_id: userId, stripe_customer_id: customerId! }, { onConflict: "user_id" });
  if (error) {
    console.error("upsert map error:", error);
  } else {
    console.log("Successfully upserted map");
  }
}

/** Kullanıcıyı çeşitli yöntemlerle arar */
async function findUserByVariousMethods(
  customerId: string | null,
  metadataUserId: string | null,
  clientReferenceId: string | null
): Promise<string | null> {
  console.log("findUserByVariousMethods called with:", { customerId, metadataUserId, clientReferenceId });
  
  // 1. Önce metadata.user_id ile ara
  if (metadataUserId) {
    console.log("Checking user by metadata user_id");
    // Kullanıcı gerçekten var mı diye kontrol et
    const supabase = supa();
    const { data, error } = await supabase
      .from("billing_customers")
      .select("user_id")
      .eq("user_id", metadataUserId)
      .maybeSingle();
    
    if (!error && data) {
      console.log("Found user by metadata user_id:", metadataUserId);
      return metadataUserId;
    } else {
      console.log("User not found by metadata user_id:", metadataUserId, "error:", error);
    }
  }
  
  // 2. client_reference_id ile ara
  if (clientReferenceId) {
    console.log("Checking user by client_reference_id");
    const supabase = supa();
    const { data, error } = await supabase
      .from("billing_customers")
      .select("user_id")
      .eq("user_id", clientReferenceId)
      .maybeSingle();
    
    if (!error && data) {
      console.log("Found user by client_reference_id:", clientReferenceId);
      return clientReferenceId;
    } else {
      console.log("User not found by client_reference_id:", clientReferenceId, "error:", error);
    }
  }
  
  // 3. stripe_customer_id ile ara
  if (customerId) {
    console.log("Checking user by stripe_customer_id");
    const supabase = supa();
    const { data, error } = await supabase
      .from("billing_customers")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    
    if (!error && data) {
      console.log("Found user by stripe_customer_id:", customerId);
      return data.user_id;
    } else {
      console.log("User not found by stripe_customer_id:", customerId, "error:", error);
    }
  }
  
  console.log("User not found by any method");
  return null;
}

/** price.id'den plan (mini/full) çıkarımı – metadata yoksa fallback */
function inferPlanType(
  fallbackFromMetadata: unknown,
  priceId?: string | null
): "mini" | "full" {
  if (fallbackFromMetadata === "mini" || fallbackFromMetadata === "full") {
    return fallbackFromMetadata;
  }
  const fullIds = new Set(
    [process.env.STRIPE_PRICE_FULL_MONTHLY, process.env.STRIPE_PRICE_FULL_YEARLY].filter(
      Boolean
    ) as string[]
  );
  return priceId && fullIds.has(priceId) ? "full" : "mini";
}

/** price.recurring.interval'dan cycle çıkarımı */
function inferCycle(interval?: "day" | "week" | "month" | "year" | null): "monthly" | "yearly" {
  return interval === "year" ? "yearly" : "monthly";
}

export async function POST(req: Request) {
  try {
    console.log("=== STRIPE WEBHOOK RECEIVED - START ===");
    console.log("Timestamp:", new Date().toISOString());
    
    // Log request headers
    console.log("Request headers:");
    for (const [key, value] of req.headers.entries()) {
      if (key.toLowerCase().includes('stripe') || key.toLowerCase().includes('signature')) {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    // Log environment variables for debugging
    console.log("Environment variables check:", {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE,
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + "...",
      serviceRolePreview: process.env.SUPABASE_SERVICE_ROLE?.substring(0, 20) + "...",
    });
    
    // --- Signature + raw body
    const sig = req.headers.get("stripe-signature") || "";
    const raw = await req.text();
    console.log("Raw request data:", { 
      hasSignature: !!sig,
      signatureLength: sig.length,
      signaturePreview: sig ? `${sig.substring(0, 50)}...` : "NO_SIGNATURE",
      rawLength: raw.length,
      hasRawData: !!raw,
      rawPreview: raw.substring(0, 100) + (raw.length > 100 ? "..." : "")
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
      } catch (err) {
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
          apiVersion: event.api_version,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        const error = err as Error;
        console.error("=== WEBHOOK SIGNATURE VERIFICATION FAILED ===");
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        console.error("Request details:", {
          signature: sig,
          rawBodyLength: raw.length,
          secretLength: process.env.STRIPE_WEBHOOK_SECRET?.length
        });
        return NextResponse.json({ error: `Webhook signature verification failed: ${error.message}` }, { status: 400 });
      }
    }

    console.log("=== PROCESSING EVENT TYPE:", event.type, "===");

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
        amount_total: s.amount_total,
        currency: s.currency,
        status: s.status
      });

      // PRODUCTION LOGGING: Log all session details for debugging
      console.log("=== PRODUCTION DEBUG: Full session object ===");
      console.log("Session ID:", s.id);
      console.log("Mode:", s.mode);
      console.log("Customer ID:", s.customer);
      console.log("Metadata:", JSON.stringify(s.metadata, null, 2));
      console.log("Client Reference ID:", s.client_reference_id);
      console.log("Payment Intent:", s.payment_intent);
      console.log("Amount Total:", s.amount_total);
      console.log("Status:", s.status);
      console.log("=== END PRODUCTION DEBUG ===");

      // PRODUCTION LOGGING: Log all session details for debugging
      console.log("=== PRODUCTION DEBUG: Full session object ===");
      console.log("Session ID:", s.id);
      console.log("Mode:", s.mode);
      console.log("Customer ID:", s.customer);
      console.log("Metadata:", JSON.stringify(s.metadata, null, 2));
      console.log("Client Reference ID:", s.client_reference_id);
      console.log("Payment Intent:", s.payment_intent);
      console.log("Amount Total:", s.amount_total);
      console.log("Status:", s.status);
      console.log("=== END PRODUCTION DEBUG ===");

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

      // PRODUCTION LOGGING: Log user identification process
      console.log("=== PRODUCTION DEBUG: User Identification Process ===");
      console.log("1. Metadata user_id:", s.metadata?.user_id);
      console.log("2. Client reference ID:", s.client_reference_id);
      console.log("3. Initial userId result:", userId);
      console.log("4. Customer ID from session:", customerId);

      // Eğer metadata ve client_reference_id ile userId bulunamadıysa, 
      // genişletilmiş arama yöntemlerini kullan
      if (!userId) {
        console.log("Attempting extended user search");
        userId = await findUserByVariousMethods(customerId, s.metadata?.user_id as string || null, s.client_reference_id as string || null);
      }

      // Eğer hala userId bulunamadıysa ve customerId varsa, 
      // stripe_customer_id ile kullanıcıyı aramaya çalış
      if (!userId && customerId) {
        console.log("Looking up user_id by customer_id");
        const { data } = await supa()
          .from("billing_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        userId = data?.user_id || null;
        console.log("User lookup result", { userId, data });
        
        // Eğer hala userId bulunamadıysa, kullanıcıyla ilişkili diğer customer ID'leri kontrol et
        if (!userId) {
          console.log("User not found with current customer ID, checking for user in other records");
          // Bu durumda daha detaylı loglama yapabiliriz
          console.log("WARNING: User not found with customer ID", customerId);
        }
      }

      // Kullanıcı mapping'ini garanti et
      if (userId && customerId) {
        console.log("Ensuring customer mapping");
        await ensureMap(userId, customerId);
      } else if (!userId && customerId) {
        // Kritik hata: Kullanıcı bulunamadı ama customer ID var
        console.error("CRITICAL ERROR: User not found for Stripe customer ID", customerId);
        console.error("Session data:", {
          sessionId: s.id,
          customerId: customerId,
          metadata: s.metadata,
          clientReferenceId: s.client_reference_id,
          paymentIntent: s.payment_intent
        });
        
        // Bu durumda admin'e bildirim gönderilebilir veya daha ayrıntılı loglama yapılabilir
        // Şimdilik sadece logluyoruz
      }

      // ---- KREDİ (mode=payment)
      if (s.mode === "payment" && userId) {
        console.log("=== PROCESSING CREDIT PAYMENT ===");
        console.log("Processing credit payment for user:", userId, "session:", s.id);
        
        // DUPLICATE CHECK: Aynı payment_intent_id ile daha önce process edilmiş mi kontrol et
        const paymentIntentId = String(s.payment_intent ?? "");
        if (paymentIntentId) {
          console.log("Checking for duplicate payment_intent_id:", paymentIntentId);
          const { data: existingEntry, error: checkError } = await supa()
            .from('billing_credit_ledger')
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntentId)
            .limit(1);
            
          console.log("Duplicate check result:", { data: existingEntry, error: checkError, dataLength: existingEntry?.length });
            
          if (checkError) {
            console.error("Error checking for duplicate payment:", checkError);
          } else if (existingEntry && existingEntry.length > 0) {
            console.log("DUPLICATE PAYMENT DETECTED: Payment already processed for payment_intent_id:", paymentIntentId);
            console.log("Existing entry:", existingEntry[0]);
            console.log("Skipping duplicate credit processing");
            return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
          } else {
            console.log("No duplicate found, proceeding with credit processing");
          }
        }
        
        // PRODUCTION LOGGING: Log credit processing start
        console.log("=== PRODUCTION DEBUG: Credit Processing Start ===");
        console.log("User ID:", userId);
        console.log("Session ID:", s.id);
        console.log("Session Mode:", s.mode);
        console.log("Payment Intent:", s.payment_intent);
        
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
        
        // PRODUCTION LOGGING: Log credit calculation
        console.log("=== PRODUCTION DEBUG: Credit Calculation ===");
        console.log("Metadata credit_amount:", s.metadata?.credit_amount);
        console.log("Amount total:", s.amount_total);
        console.log("Credits to add:", creditsToAdd);
        
        // Log environment variables to check if they're set
        console.log("Environment check:", {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          serviceRole: !!process.env.SUPABASE_SERVICE_ROLE
        });
        
        const result = await addCredits(userId, creditsToAdd, {
          reason: "purchase",
          payment_intent_id: String(s.payment_intent ?? ""),
          invoice_id: (s.invoice as string) || undefined,
        });
        
        // PRODUCTION LOGGING: Log addCredits result
        console.log("=== PRODUCTION DEBUG: addCredits Result ===");
        console.log("addCredits called with:", { userId, creditsToAdd, reason: "purchase" });
        console.log("addCredits result:", result);
        
        if (!result.success) {
          console.error("FAILED to add credits:", result.error);
          // Log detailed error information
          if (result.error && typeof result.error === 'object') {
            console.error("Error details:", result.error);
          }
          // PRODUCTION LOGGING: Log failure details
          console.log("=== PRODUCTION DEBUG: Credit Addition FAILED ===");
          console.log("Error:", result.error);
        } else {
          console.log("SUCCESSFULLY added credits for user:", userId);
          // PRODUCTION LOGGING: Log success details
          console.log("=== PRODUCTION DEBUG: Credit Addition SUCCESS ===");
          console.log("Credits added successfully for user:", userId);
        }
      } else {
        console.log("Skipping credit processing", { mode: s.mode, userId, hasUserId: !!userId, hasPaymentIntent: !!s.payment_intent });
        if (!userId) {
          console.log("UserId is missing - cannot process credit purchase");
          // PRODUCTION LOGGING: Log missing user ID
          console.log("=== PRODUCTION DEBUG: MISSING USER ID ===");
          console.log("Cannot process credit purchase - userId is null/undefined");
          console.log("Session data:", {
            id: s.id,
            customer: s.customer,
            metadata: s.metadata,
            clientReferenceId: s.client_reference_id
          });
        }
        if (s.mode !== "payment") {
          console.log("Mode is not payment - current mode:", s.mode);
        }
      }

      // ---- ABONELİK (mode=subscription)
      if (s.mode === "subscription" && s.subscription && userId) {
        console.log("Processing subscription for user:", userId);
        const sub = await stripe.subscriptions.retrieve(String(s.subscription));

        const item = sub.items.data[0];
        const price = item?.price;
        const plan: "mini" | "full" = inferPlanType(s.metadata?.plan, price?.id);
        const cycle: "monthly" | "yearly" = inferCycle(price?.recurring?.interval ?? null);

        // Upsert: unique(stripe_subscription_id) olduğu için onConflict kullanıyoruz
        const { error: eSub } = await supa()
          .from("billing_subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_subscription_id: sub.id,
              stripe_customer_id: String(sub.customer),
              status: sub.status,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              current_period_start: toIso((sub as any).current_period_start),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              current_period_end: toIso((sub as any).current_period_end),
              cancel_at_period_end: Boolean(sub.cancel_at_period_end),
              plan_type: plan,
              billing_cycle: cycle,
            },
            { onConflict: "stripe_subscription_id" }
          );
        if (eSub) console.error("upsert billing_subscriptions error:", eSub);

        // Profiles tablosunu da güncelle
        const { error: eProfile } = await supa()
          .from("profiles")
          .update({
            subscription_tier: plan,
            subscription_status: sub.status === 'active' ? 'active' : 'inactive',
          })
          .eq("user_id", userId);
        if (eProfile) {
          console.error("update profiles subscription error:", eProfile);
        } else {
          console.log("Successfully updated profiles subscription_tier and subscription_status");
        }
      }

      console.log("=== STRIPE WEBHOOK PROCESSING COMPLETED SUCCESSFULLY ===");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // =========================================================
    // 2) PAYMENT INTENT SUCCEEDED (kredi için ek güvence)
    // =========================================================
    if (event.type === "payment_intent.succeeded") {
      console.log("=== PROCESSING payment_intent.succeeded ===");
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log("Payment intent data:", { 
        id: pi.id, 
        amount: pi.amount,
        amount_received: pi.amount_received,
        customer: pi.customer,
        metadata: pi.metadata
      });
      
      const customerId = (pi.customer as string) || null;

      // user_id: metadata.user_id -> map lookup
      let userId = (pi.metadata?.user_id as string) || null;
      console.log("Payment intent user identification", { userId, customerId, metadata: pi.metadata });
      
      if (!userId && customerId) {
        console.log("Looking up user_id by customer_id for payment intent");
        const { data } = await supa()
          .from("billing_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        userId = data?.user_id || null;
        console.log("Payment intent user lookup result", { userId, data });
      }

      if (userId && customerId) {
        console.log("Ensuring customer mapping for payment intent");
        await ensureMap(userId, customerId);
      }

      // Kredi ekleme işlemi sadece checkout.session.completed eventinde yapılır
      console.log("Skipping credit addition in payment_intent.succeeded. Only handled in checkout.session.completed.");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // =========================================================
    // 3) SUBSCRIPTION STATUS UPDATE (updated/deleted)
    // =========================================================
    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      console.log("=== PROCESSING subscription update/delete ===");
      const sub = event.data.object as Stripe.Subscription;
      console.log("Subscription data:", { 
        id: sub.id, 
        status: sub.status,
        customer: sub.customer
      });

      const plan: "mini" | "full" = inferPlanType(null, sub.items.data[0]?.price?.id ?? null);
      const cycle: "monthly" | "yearly" = inferCycle(sub.items.data[0]?.price?.recurring?.interval ?? null);

      const { error: eUpd } = await supa()
        .from("billing_subscriptions")
        .upsert(
          {
            user_id: null as unknown as string, // user_id bilinmiyorsa upsert yine id üzerinden çalışır
            stripe_subscription_id: sub.id,
            stripe_customer_id: String(sub.customer),
            status: sub.status,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            current_period_start: toIso((sub as any).current_period_start),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            current_period_end: toIso((sub as any).current_period_end),
            cancel_at_period_end: Boolean(sub.cancel_at_period_end),
            plan_type: plan,
            billing_cycle: cycle,
          },
          { onConflict: "stripe_subscription_id" }
        );
      if (eUpd) console.error("update subscription error:", eUpd);

      // user_id'yi bul ve profiles tablosunu güncelle
      const { data: billingData } = await supa()
        .from("billing_subscriptions")
        .select("user_id, plan_type")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle();

      if (billingData?.user_id) {
        console.log("Updating profiles for user:", billingData.user_id);
        const { error: eProfile } = await supa()
          .from("profiles")
          .update({
            subscription_tier: billingData.plan_type,
            subscription_status: sub.status === 'active' ? 'active' : 'inactive',
          })
          .eq("user_id", billingData.user_id);
        if (eProfile) {
          console.error("update profiles subscription error:", eProfile);
        } else {
          console.log("Successfully updated profiles subscription_tier and subscription_status");
        }
      } else {
        console.log("No user_id found for subscription:", sub.id);
      }

      console.log("Subscription update processing completed");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Diğer tüm eventler: 200
    console.log("Unhandled event type", { eventType: event.type });
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("=== WEBHOOK FATAL ERROR ===", err);
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
