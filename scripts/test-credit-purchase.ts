#!/usr/bin/env node
// Test script for credit purchase flow
// This script simulates the credit purchase process and directly writes to Supabase tables

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCreditPurchase(userId: string, creditsToAdd: number, paymentIntentId: string) {
  console.log(`=== Testing credit purchase for user ${userId} ===`);
  console.log(`Credits to add: ${creditsToAdd}`);
  console.log(`Payment intent ID: ${paymentIntentId}`);
  
  try {
    // 1. Check if user exists in billing_customers table
    console.log('\n1. Checking user in billing_customers table...');
    const { data: userData, error: userError } = await supabase
      .from('billing_customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log('User data:', userData);
    if (userError) {
      console.error('User check error:', userError);
      return;
    }
    
    if (!userData) {
      console.log('User not found, creating entry...');
      const { error: insertError } = await supabase
        .from('billing_customers')
        .insert({ 
          user_id: userId, 
          stripe_customer_id: 'test_customer_id',
          credits: 0 
        });
      
      if (insertError) {
        console.error('Failed to create user entry:', insertError);
        return;
      }
      
      console.log('User entry created successfully');
    }
    
    // 2. Insert into billing_payments
    console.log('\n2. Inserting into billing_payments...');
    const paymentInsertData = { 
      user_id: userId, 
      stripe_payment_intent_id: paymentIntentId,
      amount_cents: creditsToAdd * 100,
      status: 'succeeded',
      credit_amount: creditsToAdd,
      currency: 'eur'
    };
    
    console.log('Payment insert data:', paymentInsertData);
    
    const { data: paymentData, error: paymentError } = await supabase
      .from('billing_payments')
      .insert(paymentInsertData)
      .select();
    
    if (paymentError) {
      console.error('Payment insert error:', paymentError);
      return;
    }
    
    console.log('Payment insert success:', paymentData);
    
    // 3. Insert into billing_credit_ledger
    console.log('\n3. Inserting into billing_credit_ledger...');
    const ledgerInsertData = { 
      user_id: userId, 
      delta: creditsToAdd, 
      reason: "purchase",
      stripe_payment_intent_id: paymentIntentId,
      stripe_invoice_id: null
    };
    
    console.log('Ledger insert data:', ledgerInsertData);
    
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('billing_credit_ledger')
      .insert(ledgerInsertData);
    
    if (ledgerError) {
      console.error('Ledger insert error:', ledgerError);
    } else {
      console.log('Ledger insert success:', ledgerData);
    }
    
    // 4. Call increment_credits RPC
    console.log('\n4. Calling increment_credits RPC...');
    const rpcParams = { 
      p_user_id: userId, 
      p_delta: creditsToAdd 
    };
    
    console.log('RPC params:', rpcParams);
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('increment_credits', rpcParams);
    
    if (rpcError) {
      console.error('RPC call error:', rpcError);
      return;
    }
    
    console.log('RPC call success:', rpcData);
    
    // 5. Insert into credit_transactions
    console.log('\n5. Inserting into credit_transactions...');
    const transactionInsertData = { 
      user_id: userId, 
      amount: creditsToAdd, 
      type: "purchase",
      description: `Purchased ${creditsToAdd} credits`,
      stripe_payment_intent_id: paymentIntentId,
      metadata: {
        source: "test_script",
        credits_purchased: creditsToAdd
      }
    };
    
    console.log('Transaction insert data:', transactionInsertData);
    
    const { data: transactionData, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert(transactionInsertData);
    
    if (transactionError) {
      console.error('Transaction insert error:', transactionError);
    } else {
      console.log('Transaction insert success:', transactionData);
    }
    
    console.log('\n=== Credit purchase test completed successfully ===');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Get command line arguments
const userId = process.argv[2];
const creditsToAdd = parseInt(process.argv[3] || '10');
const paymentIntentId = process.argv[4] || 'test_payment_intent';

if (!userId) {
  console.log('Usage: npm run test-credit-purchase <userId> [creditsToAdd] [paymentIntentId]');
  console.log('Example: npm run test-credit-purchase 123e4567-e89b-12d3-a456-426614174000 50 test_pi_123');
  process.exit(1);
}

testCreditPurchase(userId, creditsToAdd, paymentIntentId);