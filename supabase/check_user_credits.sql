-- Kullanıcının mevcut kredi bakiyesini kontrol et
SELECT user_id, credits 
FROM billing_customers 
WHERE user_id = '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008';

-- Kullanıcının kredi geçmişi
SELECT user_id, delta, reason, created_at 
FROM billing_credit_ledger 
WHERE user_id = '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008'
ORDER BY created_at DESC;

-- Kullanıcının ödeme geçmişi
SELECT user_id, amount_cents, credit_amount, status, created_at 
FROM billing_payments 
WHERE user_id = '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008'
ORDER BY created_at DESC;