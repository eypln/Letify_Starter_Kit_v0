import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supa = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    console.log(`Syncing data for user: ${userId}`);
    
    // 1. billing_subscriptions tablosundan kullanıcı verilerini al
    const supabase = supa();
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('billing_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .limit(1);
    
    if (subscriptionError) {
      console.error('Error fetching subscription data:', subscriptionError);
      return NextResponse.json({ error: 'Error fetching subscription data' }, { status: 500 });
    }
    
    if (!subscriptionData || subscriptionData.length === 0) {
      console.log('No subscription data found for user');
      return NextResponse.json({ error: 'No subscription data found' }, { status: 404 });
    }
    
    const correctCustomerId = subscriptionData[0].stripe_customer_id;
    console.log('Correct customer ID from subscription:', correctCustomerId);
    
    // 2. billing_customers tablosundaki veriyi kontrol et
    const { data: customerData, error: customerError } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (customerError) {
      console.error('Error fetching customer data:', customerError);
      return NextResponse.json({ error: 'Error fetching customer data' }, { status: 500 });
    }
    
    if (!customerData) {
      console.log('No customer data found, creating new entry');
      const { error: insertError } = await supabase
        .from('billing_customers')
        .insert({
          user_id: userId,
          stripe_customer_id: correctCustomerId
        });
      
      if (insertError) {
        console.error('Error inserting customer data:', insertError);
        return NextResponse.json({ error: 'Error inserting customer data' }, { status: 500 });
      } else {
        console.log('Successfully inserted customer data');
        return NextResponse.json({ success: true, message: 'Customer data inserted' });
      }
    }
    
    const currentCustomerId = customerData.stripe_customer_id;
    console.log('Current customer ID in billing_customers:', currentCustomerId);
    
    // 3. Eğer eski test ID'si varsa, doğru ID ile güncelle
    if (currentCustomerId === 'cus_test123') {
      console.log('Found old test customer ID, updating to correct ID');
      const { error: updateError } = await supabase
        .from('billing_customers')
        .update({ stripe_customer_id: correctCustomerId })
        .eq('user_id', userId)
        .eq('stripe_customer_id', 'cus_test123');
      
      if (updateError) {
        console.error('Error updating customer data:', updateError);
        return NextResponse.json({ error: 'Error updating customer data' }, { status: 500 });
      } else {
        console.log('Successfully updated customer data from test ID to correct ID');
        return NextResponse.json({ success: true, message: 'Customer data updated from test ID' });
      }
    }
    
    // 4. Eğer farklıysa, billing_customers tablosunu güncelle
    if (currentCustomerId !== correctCustomerId) {
      console.log('Customer IDs do not match, updating billing_customers table');
      const { error: updateError } = await supabase
        .from('billing_customers')
        .update({ stripe_customer_id: correctCustomerId })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error updating customer data:', updateError);
        return NextResponse.json({ error: 'Error updating customer data' }, { status: 500 });
      } else {
        console.log('Successfully updated customer data');
        return NextResponse.json({ success: true, message: 'Customer data updated' });
      }
    } else {
      console.log('Customer IDs already match, no update needed');
      return NextResponse.json({ success: true, message: 'Customer IDs already match' });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}