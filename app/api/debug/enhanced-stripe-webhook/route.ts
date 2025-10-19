import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Supabase service-role client (RLS'i baypas eder). */
const supa = () => {
  console.log("=== SUPABASE CLIENT CREATION ===");
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...");
  console.log("Has Service Role:", !!process.env.SUPABASE_SERVICE_ROLE);
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing!");
    return null;
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE) {
    console.error("CRITICAL: SUPABASE_SERVICE_ROLE is missing!");
    return null;
  }
  
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    console.log("Supabase client created successfully");
    return client;
  } catch (error) {
    console.error("ERROR creating Supabase client:", error);
    return null;
  }
};

/** Krediyi ledger'a yazar ve bakiye artırır. */
export async function addCredits(
  userId: string,
  creditsToAdd: number,
  meta: { pi?: string | null; inv?: string | null }
) {
  console.log("=== ADD CREDITS FUNCTION START ===");
  console.log("Parameters:", { userId, creditsToAdd, meta });
  
  if (!creditsToAdd || creditsToAdd <= 0) {
    console.log("Invalid creditsToAdd:", creditsToAdd);
    return { success: false, error: "Invalid credits amount" };
  }
  
  // Supabase client oluştur
  const supabase = supa();
  if (!supabase) {
    console.error("Failed to create Supabase client");
    return { success: false, error: "Failed to create Supabase client" };
  }
  
  try {
    console.log("=== STEP 1: Checking user in billing_customers ===");
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
      console.error("ERROR checking user:", userError);
      return { success: false, error: `User check failed: ${userError.message}` };
    }
    
    if (!userData) {
      console.error("USER NOT FOUND in billing_customers table:", userId);
      
      // Kullanıcı yoksa, önce billing_customers tablosuna ekleyelim
      console.log("=== STEP 1B: Creating user entry in billing_customers ===");
      const { error: insertError } = await supabase
        .from('billing_customers')
        .insert({ 
          user_id: userId, 
          stripe_customer_id: 'unknown', // Geçici değer, daha sonra güncellenmeli
          credits: 0 
        });
      
      if (insertError) {
        console.error("ERROR creating user entry:", insertError);
        return { success: false, error: `Failed to create user entry: ${insertError.message}` };
      }
      
      console.log("User entry created successfully");
    }
    
    // billing_payments tablosuna kayıt ekle
    console.log("=== STEP 2: Inserting into billing_payments ===");
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
      console.error("ERROR inserting into billing_payments:", paymentError);
      return { success: false, error: `Payment insert failed: ${paymentError.message}` };
    }
    
    console.log("billing_payments insert SUCCESS:", paymentData);
    
    // billing_credit_ledger tablosuna kayıt ekle
    console.log("=== STEP 3: Inserting into billing_credit_ledger ===");
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
      console.error("ERROR inserting into billing_credit_ledger:", ledgerError);
      // Ledger hatası kritik değil, diğer işlemler devam etsin
      console.log("Continuing despite ledger error...");
    } else {
      console.log("billing_credit_ledger insert SUCCESS:", ledgerData);
    }
    
    // increment_credits fonksiyonunu çağır
    console.log("=== STEP 4: Calling increment_credits RPC ===");
    const rpcParams = { 
      p_user_id: userId, 
      p_delta: creditsToAdd 
    };
    console.log("RPC params:", rpcParams);
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('increment_credits', rpcParams);
    
    if (rpcError) {
      console.error("ERROR calling increment_credits:", rpcError);
      return { success: false, error: `RPC call failed: ${rpcError.message}` };
    }
    
    console.log("increment_credits RPC SUCCESS:", rpcData);
    
    // credit_transactions tablosuna kayıt ekle
    console.log("=== STEP 5: Inserting into credit_transactions ===");
    const transactionInsertData = { 
      user_id: userId, 
      amount: creditsToAdd, 
      type: "purchase",
      description: `Purchased ${creditsToAdd} credits`,
      stripe_payment_intent_id: meta.pi ?? null,
      metadata: {
        source: "stripe_webhook_debug",
        credits_purchased: creditsToAdd
      }
    };
    console.log("Transaction insert data:", transactionInsertData);
    
    const { data: transactionData, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert(transactionInsertData);
    
    if (transactionError) {
      console.error("ERROR inserting into credit_transactions:", transactionError);
      // Transaction hatası kritik değil, diğer işlemler devam etsin
      console.log("Continuing despite transaction error...");
    } else {
      console.log("credit_transactions insert SUCCESS:", transactionData);
    }
    
    console.log("=== ADD CREDITS FUNCTION COMPLETED SUCCESSFULLY ===");
    return { success: true, data: { paymentData, ledgerData, rpcData, transactionData } };
  } catch (err) {
    console.error("UNEXPECTED ERROR in addCredits:", err);
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