-- Test script to manually insert data into billing_payments table
-- This will help us verify if the issue is with the webhook or the database itself

-- First, let's check if we have existing data
SELECT 'billing_customers count:' as table_name, COUNT(*) as count FROM billing_customers
UNION ALL
SELECT 'billing_credit_ledger count:' as table_name, COUNT(*) as count FROM billing_credit_ledger
UNION ALL
SELECT 'billing_payments count:' as table_name, COUNT(*) as count FROM billing_payments
UNION ALL
SELECT 'billing_subscriptions count:' as table_name, COUNT(*) as count FROM billing_subscriptions;

-- Check if we have a test user
SELECT id, user_id, stripe_customer_id, credits, created_at FROM billing_customers LIMIT 5;

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'billing_payments';

-- Check the structure of billing_payments table
-- \d billing_payments  -- This command might not work in all SQL environments

-- Then, let's manually insert a test record into billing_payments
-- First, find a valid user_id from the billing_customers table above
-- Then replace 'USER_ID_HERE' with that actual user_id
-- INSERT INTO billing_payments (
--     user_id, 
--     stripe_payment_intent_id, 
--     amount_cents, 
--     currency, 
--     status, 
--     credit_amount
-- ) VALUES (
--     'USER_ID_HERE',  -- Replace with actual user_id from billing_customers table
--     'test_payment_intent_manual_12345',
--     5000,  -- 50 EUR in cents
--     'eur',
--     'succeeded',
--     50
-- ) RETURNING *;

-- Also test the increment_credits function
-- Replace 'USER_ID_HERE' with the same user_id as above
-- SELECT increment_credits('USER_ID_HERE', 50);

-- Check if the credits were updated
-- SELECT id, user_id, credits, updated_at FROM billing_customers WHERE user_id = 'USER_ID_HERE';

-- Check if ledger entry was created
-- SELECT id, user_id, delta, reason, created_at FROM billing_credit_ledger WHERE user_id = 'USER_ID_HERE' ORDER BY created_at DESC LIMIT 5;