import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe, PRICES, CreditAmount } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/billing';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';

const CheckoutSchema = z.object({
  credits: z.enum(['10', '20', '50', '100', '200']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    console.log("Stripe checkout credits POST request received");
    
    // Try to get user from cookie-based auth first
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log("Cookie auth session:", session, "error:", sessionError);

    if (sessionError || !session || !session.user) {
      console.error("Unauthorized: No valid session found");
      // Detaylı hata mesajı
      if (sessionError) {
        console.error("Session error details:", sessionError);
      }
      if (!session) {
        console.error("No session object returned");
      }
      if (session && !session.user) {
        console.error("Session exists but no user found");
      }
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const user = session.user;
    console.log("Authenticated user:", user.id, "Email:", user.email);

    const body = await request.json();
    const validation = CheckoutSchema.safeParse(body);
    console.log("Request body:", body, "validation:", validation);

    if (!validation.success) {
      console.error("Invalid request data:", validation.error.errors);
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 });
    }

    const { credits, successUrl, cancelUrl } = validation.data;

    // Get or create Stripe customer
    // Email alanı profile tablosunda yoksa user.email kullanılır
    console.log("Getting or creating Stripe customer for user:", user.id, user.email);
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email
    );
    console.log("Stripe customer ID:", customerId);

    // Create checkout session
    console.log("Creating Stripe checkout session with price:", PRICES.credits[credits as unknown as CreditAmount]);
    const sessionData = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICES.credits[credits as unknown as CreditAmount],
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_WEBAPP_URL}/dashboard/subscription?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_WEBAPP_URL}/dashboard/subscription?canceled=true`,
      metadata: {
        user_id: user.id,
        credit_amount: credits,
        type: 'credits',
      },
      client_reference_id: user.id, // Add this for webhook user identification fallback
    });
    console.log("Stripe session created:", sessionData.id);

    // Activity log: credit
    await logActivity(supabase, { user_id: user.id, type: 'credit', data: { amount: credits } });

    // Success response
    return NextResponse.json({ url: sessionData.url }, { status: 200 });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}