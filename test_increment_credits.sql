-- Test script for increment_credits function
-- This will help us verify if the database function is working correctly

-- First, check if we have a test user
SELECT id, user_id, credits FROM billing_customers LIMIT 1;

-- Test the increment_credits function with a real user_id
-- After running the above query, replace 'USER_ID_HERE' with an actual user_id
-- SELECT increment_credits('USER_ID_HERE', 10);

-- Check if the credits were updated
-- SELECT id, user_id, credits FROM billing_customers WHERE user_id = 'USER_ID_HERE';

-- Test inserting into billing_credit_ledger directly
-- Replace 'USER_ID_HERE' with the same user_id
-- INSERT INTO billing_credit_ledger (user_id, delta, reason) 
-- VALUES ('USER_ID_HERE', 10, 'manual_test');

-- Check if ledger entry was created
-- SELECT id, user_id, delta, reason, created_at FROM billing_credit_ledger 
-- WHERE user_id = 'USER_ID_HERE' ORDER BY created_at DESC LIMIT 1;

-- Test inserting into billing_payments directly
-- Replace 'USER_ID_HERE' with the same user_id
-- INSERT INTO billing_payments (
--     user_id, 
--     stripe_payment_intent_id, 
--     amount_cents, 
--     currency, 
--     status, 
--     credit_amount
-- ) VALUES (
--     'USER_ID_HERE',
--     'manual_test_payment_123',
--     1000,  -- 10 EUR in cents
--     'eur',
--     'succeeded',
--     10
-- ) RETURNING *;