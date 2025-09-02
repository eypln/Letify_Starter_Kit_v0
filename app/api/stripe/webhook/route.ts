import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { addCredits } from '@/lib/billing';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        if (!userId) {
          console.error('No user_id in session metadata');
          break;
        }

        if (session.mode === 'subscription') {
          // Handle subscription checkout
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          await supabase.from('billing_subscriptions').upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: (subscription as any).cancel_at_period_end,
            plan_type: session.metadata?.plan_type as 'mini' | 'full',
            billing_cycle: session.metadata?.billing_cycle as 'monthly' | 'yearly' || 'monthly',
          }, { onConflict: 'stripe_subscription_id' });

        } else if (session.mode === 'payment' && session.metadata?.type === 'credits') {
          // Handle credit purchase
          const creditAmount = parseInt(session.metadata.credit_amount || '0');
          const paymentIntent = session.payment_intent as string;

          await supabase.from('billing_payments').upsert({
            user_id: userId,
            stripe_payment_intent_id: paymentIntent,
            amount_cents: session.amount_total || 0,
            currency: session.currency || 'eur',
            status: 'succeeded',
            credit_amount: creditAmount,
          }, { onConflict: 'stripe_payment_intent_id' });

          // Add credits to user's account
          await addCredits(userId, creditAmount, {
            reason: `Credit purchase: ${creditAmount} credits`,
            payment_intent_id: paymentIntent,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          console.error('No user_id in subscription metadata');
          break;
        }

        await supabase.from('billing_subscriptions').update({
          status: subscription.status,
          current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          cancel_at_period_end: (subscription as any).cancel_at_period_end,
        }).eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) {
          console.error('No user_id in subscription metadata');
          break;
        }

        await supabase.from('billing_subscriptions').update({
          status: 'canceled',
        }).eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update payment status if it exists
        await supabase.from('billing_payments').update({
          status: 'succeeded',
        }).eq('stripe_payment_intent_id', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        await supabase.from('billing_payments').update({
          status: 'failed',
        }).eq('stripe_payment_intent_id', paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}