-- Kullanıcının iki tablodaki verilerini kontrol et
SELECT 'billing_subscriptions' as source, stripe_customer_id 
FROM billing_subscriptions 
WHERE user_id = '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008'
LIMIT 1;

SELECT 'billing_customers' as source, stripe_customer_id 
FROM billing_customers 
WHERE user_id = '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008';

-- billing_customers tablosundaki eski test ID'yi doğru ID ile güncelle
UPDATE billing_customers 
SET stripe_customer_id = 'cus_Sz46Bd2WeI0mIH'
WHERE user_id = '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008'
AND stripe_customer_id = 'cus_test123';

-- Kontrol et
SELECT 'after_update' as source, stripe_customer_id 
FROM billing_customers 
WHERE user_id = '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008';