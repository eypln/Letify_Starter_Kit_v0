import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

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

/** Krediyi ledger’a yazar ve bakiye artırır. */
export async function addCredits(
  userId: string,
  creditsToAdd: number,
  meta: { pi?: string | null; inv?: string | null }
): Promise<{ success: boolean; data?: any; error?: string | Error | object }> {
  console.log("=== WEBHOOK addCredits called with:", { userId, creditsToAdd, meta });
  console.log("Validating credits amount:", { 
    creditsToAdd, 
    isNumber: typeof creditsToAdd === 'number', 
    isFinite: Number.isFinite(creditsToAdd),
    isPositive: creditsToAdd > 0 
  });
  
  if (!creditsToAdd || creditsToAdd <= 0) {
    console.log("Invalid creditsToAdd:", creditsToAdd);
    return { success: false, error: "Invalid credits amount" };
  }
  
  try {
    // Doğrudan Supabase client kullan
    const supabase = supa();
    console.log("Supabase client created");
    
    // Check if user exists in billing_customers table
    console.log("Checking if user exists in billing_customers table");
    const { data: userData, error: userError } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log("User check result:", { 
      userData: userData ? { id: userData.user_id, credits: userData.credits } : null, 
      userError 
    });
    
    if (userError) {
      console.error("Error checking user:", userError);
      return { success: false, error: `User check failed: ${userError.message}` };
    }
    
    if (!userData) {
      console.error("User not found in billing_customers table:", userId);
      // Kullanıcı yoksa, önce billing_customers tablosuna ekleyelim
      console.log("Creating user entry in billing_customers");
      const { error: insertError } = await supabase
        .from('billing_customers')
        .insert({ 
          user_id: userId, 
          stripe_customer_id: 'unknown', // Geçici değer, daha sonra güncellenmeli
          credits: 0 
        });
      
      if (insertError) {
        console.error("Failed to create user entry:", insertError);
        return { success: false, error: `Failed to create user entry: ${insertError.message}` };
      }
      
      console.log("User entry created successfully");
    }
    
    // billing_payments tablosuna kayıt ekle
    console.log("Inserting into billing_payments...");
    const paymentInsertData = { 
      user_id: userId, 
      stripe_payment_intent_id: meta.pi ?? 'unknown',
      amount_cents: creditsToAdd * 100, // varsayım: 1 kredi = 1 EUR
      status: 'succeeded',
      credit_amount: creditsToAdd,
      currency: 'eur'
    };
    console.log("Payment insert data:", paymentInsertData);
    
    const { data: paymentData, error: paymentError } = await supabase
      .from('billing_payments')
      .insert(paymentInsertData)
      .select();
    
    if (paymentError) {
      console.error("Error inserting into billing_payments:", paymentError);
      return { success: false, error: `Payment insert failed: ${paymentError.message}` };
    }
    
    console.log("billing_payments insert success:", paymentData);
    
    // billing_credit_ledger tablosuna kayıt ekle
    console.log("Inserting into billing_credit_ledger...");
    const ledgerInsertData = { 
      user_id: userId, 
      delta: creditsToAdd, 
      reason: "purchase",
      stripe_payment_intent_id: meta.pi ?? null,
      stripe_invoice_id: meta.inv ?? null
    };
    console.log("Ledger insert data:", ledgerInsertData);
    
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .insert(ledgerInsertData);
    
    if (ledgerError) {
      console.error("Error inserting into billing_credit_ledger:", ledgerError);
      // Ledger hatası kritik değil, diğer işlemler devam etsin
      console.log("Continuing despite ledger error...");
    } else {
      console.log("billing_credit_ledger insert success:", ledgerData);
    }
    
    // increment_credits fonksiyonunu çağır
    console.log("Calling increment_credits RPC...");
    const rpcParams = { 
      p_user_id: userId, 
      p_delta: creditsToAdd 
    };
    console.log("RPC params:", rpcParams);
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('increment_credits', rpcParams);
    
    if (rpcError) {
      console.error("Error calling increment_credits:", rpcError);
      return { success: false, error: `RPC call failed: ${rpcError.message}` };
    }
    
    console.log("increment_credits RPC success:", rpcData);
    
    // credit_transactions tablosuna kayıt ekle
    console.log("Inserting into credit_transactions...");
    const transactionInsertData = { 
      user_id: userId, 
      amount: creditsToAdd, 
      type: "purchase",
      description: `Purchased ${creditsToAdd} credits`,
      stripe_payment_intent_id: meta.pi ?? null,
      metadata: {
        source: "stripe_webhook",
        credits_purchased: creditsToAdd
      }
    };
    console.log("Transaction insert data:", transactionInsertData);
    
    const { data: transactionData, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert(transactionInsertData);
    
    if (transactionError) {
      console.error("Error inserting into credit_transactions:", transactionError);
      // Transaction hatası kritik değil, diğer işlemler devam etsin
      console.log("Continuing despite transaction error...");
    } else {
      console.log("credit_transactions insert success:", transactionData);
    }
    
    return { success: true, data: { paymentData, ledgerData, rpcData, transactionData } };
  } catch (err) {
    console.error("Unexpected error in webhook addCredits:", err);
    // Log detailed error information
    if (err instanceof Error) {
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
    }
    return { success: false, error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` };
  }
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
          apiVersion: event.api_version,
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        console.error("=== WEBHOOK SIGNATURE VERIFICATION FAILED ===");
        console.error("Error details:", {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
        console.error("Request details:", {
          signature: sig,
          rawBodyLength: raw.length,
          secretLength: process.env.STRIPE_WEBHOOK_SECRET?.length
        });
        return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
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
        
        // Log environment variables to check if they're set
        console.log("Environment check:", {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          serviceRole: !!process.env.SUPABASE_SERVICE_ROLE
        });
        
        const result = await addCredits(userId, creditsToAdd, {
          pi: String(s.payment_intent ?? ""),
          inv: (s.invoice as string) || null,
        });
        
        if (!result.success) {
          console.error("FAILED to add credits:", result.error);
          // Log detailed error information
          if (result.error && typeof result.error === 'object') {
            console.error("Error details:", result.error);
          }
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
              current_period_start: toIso((sub as any).current_period_start),
              current_period_end: toIso((sub as any).current_period_end),
              cancel_at_period_end: Boolean(sub.cancel_at_period_end),
              plan_type: plan,
              billing_cycle: cycle,
            },
            { onConflict: "stripe_subscription_id" }
          );
        if (eSub) console.error("upsert billing_subscriptions error:", eSub);
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

      if (userId) {
        const cents = (pi.amount_received ?? pi.amount ?? 0) as number;
        const creditsToAdd = Math.round(cents / 100);
        console.log("Adding credits for payment intent:", { userId, creditsToAdd, pi: pi.id });
        const result = await addCredits(userId, creditsToAdd, { pi: pi.id, inv: null });
        
        if (!result.success) {
          console.error("Failed to add credits for payment intent:", result.error);
          // Log detailed error information
          if (result.error && typeof result.error === 'object') {
            console.error("Error details:", result.error);
          }
        } else {
          console.log("Successfully added credits for payment intent for user:", userId);
        }
      } else {
        console.log("Skipping payment intent processing", { userId, customerId });
      }

      console.log("Payment intent processing completed");
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

      const { error: eUpd } = await supa()
        .from("billing_subscriptions")
        .upsert(
          {
            user_id: null as unknown as string, // user_id bilinmiyorsa upsert yine id üzerinden çalışır
            stripe_subscription_id: sub.id,
            stripe_customer_id: String(sub.customer),
            status: sub.status,
            current_period_start: toIso((sub as any).current_period_start),
            current_period_end: toIso((sub as any).current_period_end),
            cancel_at_period_end: Boolean(sub.cancel_at_period_end),
            // plan/cycle değişmezse tekrar yazmak şart değil, ama sorun olmaz:
            plan_type: inferPlanType(null, sub.items.data[0]?.price?.id ?? null),
            billing_cycle: inferCycle(sub.items.data[0]?.price?.recurring?.interval ?? null),
          },
          { onConflict: "stripe_subscription_id" }
        );
      if (eUpd) console.error("update subscription error:", eUpd);

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
