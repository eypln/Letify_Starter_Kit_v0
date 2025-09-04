import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { plan: "mini" | "full"; cycle?: "monthly" | "yearly" };

function pickPrice(plan: "mini" | "full", cycle: "monthly" | "yearly") {
  const env = process.env;
  if (plan === "mini") {
    const yearly = env.STRIPE_PRICE_MINI_YEARLY;
    const monthly = env.STRIPE_PRICE_MINI_MONTHLY;
    return cycle === "yearly" ? (yearly || monthly) : (monthly || yearly);
  } else {
    const yearly = env.STRIPE_PRICE_FULL_YEARLY;
    const monthly = env.STRIPE_PRICE_FULL_MONTHLY;
    return cycle === "yearly" ? (yearly || monthly) : (monthly || yearly);
  }
}

export async function POST(req: Request) {
  try {
    // 1) Auth: kullanıcıyı cookie üzerinden al (client token'a gerek yok)
    const cookieStore = cookies();
    const supaUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (key) => cookieStore.get(key)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    );
    const { data: { user } } = await supaUser.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    const plan = body.plan;
    const cycle = body.cycle ?? "monthly";

    // 2) Stripe customer'ı bul/oluştur + Supabase'te map'le
    const svc = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE! // service-role şart
    );

    let stripeCustomerId: string | null = null;
    const { data: bc } = await svc
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    stripeCustomerId = bc?.stripe_customer_id ?? null;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
      stripeCustomerId = customer.id;
      const { error: mapErr } = await svc
        .from("billing_customers")
        .upsert({ user_id: user.id, stripe_customer_id: stripeCustomerId, credits: 0 }, { onConflict: "user_id" });
      if (mapErr) console.error("upsert billing_customers map error:", mapErr);
    }

    // 3) Price ID seç (yearly yoksa monthly'e düş)
    const PRICE = pickPrice(plan, cycle);
    if (!PRICE) {
      return NextResponse.json({ error: "Missing Stripe Price ID(s). Check .env.local" }, { status: 400 });
    }

    // 4) Checkout Session (metadata'lar kritik)
    const meta = { type: "subscription", user_id: user.id, plan, billing_cycle: cycle };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId!,
      line_items: [{ price: PRICE, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: meta,
      subscription_data: { metadata: meta },
      success_url: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/dashboard/subscription?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/dashboard/subscription?canceled=1`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("checkout/subscription error:", e?.message || e);
    // Hata mesajını UI'a net döndür (debug kolay olsun)
    return NextResponse.json({ error: String(e?.message || "server error") }, { status: 500 });
  }
}
