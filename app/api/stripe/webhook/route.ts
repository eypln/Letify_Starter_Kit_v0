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
const supa = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE! // DİKKAT: anon key değil!
  );

/** user_id ↔ stripe_customer_id eşleşmesini garanti eder. */
async function ensureMap(userId: string, customerId?: string | null) {
  if (!userId || !customerId) return;
  const { error } = await supa()
    .from("billing_customers")
    .upsert({ user_id: userId, stripe_customer_id: customerId! }, { onConflict: "user_id" });
  if (error) console.error("upsert map error:", error);
}

/** Krediyi ledger’a yazar ve bakiye artırır. */
async function addCredits(
  userId: string,
  creditsToAdd: number,
  meta: { pi?: string | null; inv?: string | null }
) {
  if (!creditsToAdd || creditsToAdd <= 0) return;
  const s = supa();

  const { error: e1 } = await s.from("billing_credit_ledger").insert({
    user_id: userId,
    delta: creditsToAdd,
    reason: "purchase",
    stripe_payment_intent_id: meta.pi ?? null,
    stripe_invoice_id: meta.inv ?? null,
  });
  if (e1) {
    console.error("insert ledger error:", e1);
    return;
  }

  const { data: bc, error: selErr } = await s
    .from("billing_customers")
    .select("credits")
    .eq("user_id", userId)
    .maybeSingle();
  if (selErr) {
    console.error("select credits error:", selErr);
    return;
  }

  const nextCredits = (bc?.credits ?? 0) + creditsToAdd;
  const { error: e2 } = await s
    .from("billing_customers")
    .upsert({ user_id: userId, credits: nextCredits }, { onConflict: "user_id" });
  if (e2) console.error("upsert credits error:", e2);
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
    // --- Signature + raw body
    const sig = req.headers.get("stripe-signature") || "";
    const raw = await req.text();
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing signature/secret" }, { status: 400 });
    }

    // --- Event doğrula
    const event: Stripe.Event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // =========================================================
    // 1) CHECKOUT COMPLETED (kredi + abonelik)
    // =========================================================
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;

      const customerId = (s.customer as string) || null;

      // user_id tespiti: metadata -> client_reference_id -> map lookup
      let userId =
        (s.metadata?.user_id as string) ||
        (s.client_reference_id as string) ||
        null;

      if (!userId && customerId) {
        const { data } = await supa()
          .from("billing_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        userId = data?.user_id || null;
      }

      if (userId && customerId) await ensureMap(userId, customerId);

      // ---- KREDİ (mode=payment)
      if (s.mode === "payment" && userId) {
        // Önce metadata.amount (varsa), yoksa amount_total/100
        let creditsToAdd = Number(s.metadata?.amount ?? 0);
        if (!Number.isFinite(creditsToAdd) || creditsToAdd <= 0) {
          creditsToAdd =
            typeof s.amount_total === "number" ? Math.round(s.amount_total / 100) : 0;
        }
        await addCredits(userId, creditsToAdd, {
          pi: String(s.payment_intent ?? ""),
          inv: (s.invoice as string) || null,
        });
      }

      // ---- ABONELİK (mode=subscription)
      if (s.mode === "subscription" && s.subscription && userId) {
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

      return NextResponse.json({ received: true }, { status: 200 });
    }

    // =========================================================
    // 2) PAYMENT INTENT SUCCEEDED (kredi için ek güvence)
    // =========================================================
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const customerId = (pi.customer as string) || null;

      // user_id: metadata.user_id -> map lookup
      let userId = (pi.metadata?.user_id as string) || null;
      if (!userId && customerId) {
        const { data } = await supa()
          .from("billing_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        userId = data?.user_id || null;
      }

      if (userId && customerId) await ensureMap(userId, customerId);

      if (userId) {
        const cents = (pi.amount_received ?? pi.amount ?? 0) as number;
        const creditsToAdd = Math.round(cents / 100);
        await addCredits(userId, creditsToAdd, { pi: pi.id, inv: null });
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    // =========================================================
    // 3) SUBSCRIPTION STATUS UPDATE (updated/deleted)
    // =========================================================
    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;

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

      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Diğer tüm eventler: 200
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("webhook fatal:", err);
    // Stripe tekrar denemesin diye 200 dönüyoruz
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
