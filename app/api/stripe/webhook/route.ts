import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const sig = req.headers.get("stripe-signature") || "";
    const raw = await req.text();

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing signature/secret" }, { status: 400 });
    }
    if (!raw) return NextResponse.json({ error: "Empty body" }, { status: 400 });

    const event: Stripe.Event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE! // service role şart
    );

    // Yalnızca checkout sonrası çalışıyoruz (abonelik + kredi)
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;

      // ---- user_id’yi bul (3 yol)
      const customerId = (s.customer as string) || null;
      let userId =
        (s.metadata?.user_id as string) ||
        (s.client_reference_id as string) ||
        null;

      if (!userId && customerId) {
        const { data: mapRow, error: mapErr } = await supa
          .from("billing_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (mapErr) console.error("lookup by customer error:", mapErr);
        userId = mapRow?.user_id || null;
      }

      // ---- user↔customer mapping'i garanti et
      if (userId && customerId) {
        const { error: upMapErr } = await supa
          .from("billing_customers")
          .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: "user_id" });
        if (upMapErr) console.error("upsert map error:", upMapErr);
      }

      // ---- KREDİ işlemi: mode=payment
      if (s.mode === "payment" && userId) {
        // 1) Önce metadata.amount (varsa)
        let creditsToAdd = Number(s.metadata?.amount ?? 0);

        // 2) Yoksa STRIPE toplamını kullan (amount_total: cents)
        if (!Number.isFinite(creditsToAdd) || creditsToAdd <= 0) {
          if (typeof s.amount_total === "number") {
            creditsToAdd = Math.round(s.amount_total / 100); // 1 birim para = 1 kredi (EUR/USD fark etmeksizin)
          } else {
            creditsToAdd = 0;
          }
        }

        if (creditsToAdd > 0) {
          // Ledger kaydı
          const { error: ledErr } = await supa.from("billing_credit_ledger").insert({
            user_id: userId,
            delta: creditsToAdd,
            reason: "purchase",
            stripe_payment_intent_id: String(s.payment_intent ?? ""),
            stripe_invoice_id: (s.invoice as string) || null,
          });
          if (ledErr) console.error("insert ledger error:", ledErr);

          // Bakiye artır
          const { data: bc, error: selErr } = await supa
            .from("billing_customers")
            .select("credits")
            .eq("user_id", userId)
            .maybeSingle();
          if (selErr) console.error("select credits error:", selErr);

          const nextCredits = (bc?.credits ?? 0) + creditsToAdd;
          const { error: upCredErr } = await supa
            .from("billing_customers")
            .upsert({ user_id: userId, credits: nextCredits }, { onConflict: "user_id" });
          if (upCredErr) console.error("upsert credits error:", upCredErr);
        } else {
          console.log("[WEBHOOK] payment completed but creditsToAdd=0 (no metadata.amount & no amount_total)");
        }
      }

      // Abonelik (mode=subscription) için şu an yalnızca mapping yapıyoruz.
      // İstersen ileride billing_subscriptions / billing_payments tablolarını da burada doldururuz.
    }

    // Her durumda 200
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("webhook fatal:", err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
