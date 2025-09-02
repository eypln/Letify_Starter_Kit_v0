import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe, PRICES } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/billing';
import { createClient } from '@/lib/supabase/server';

const CheckoutSchema = z.object({
  plan: z.enum(['mini', 'full']),
  billing: z.enum(['monthly', 'yearly']).default('monthly'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = CheckoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { plan, billing, successUrl, cancelUrl } = validation.data;

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const customerId = await getOrCreateStripeCustomer(
      user.id,
      profile?.email || user.email
    );

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICES.subscription[plan][billing],
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_WEBAPP_URL}/dashboard/subscription?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_WEBAPP_URL}/dashboard/subscription?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_type: plan,
        billing_cycle: billing,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_type: plan,
          billing_cycle: billing,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}