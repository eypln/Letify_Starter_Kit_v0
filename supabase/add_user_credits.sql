-- Kullanıcıya kredi ekle
INSERT INTO billing_credit_ledger (user_id, delta, reason) 
VALUES ('9bd6f7bc-0041-4c8c-8c48-c4726b7ed008', 20, 'manual_add');

-- Kredi bakiyesini güncelle
SELECT increment_credits('9bd6f7bc-0041-4c8c-8c48-c4726b7ed008', 20);

-- Kullanıcının yeni kredi bakiyesini kontrol et
SELECT user_id, credits 
FROM billing_customers 
WHERE user_id = '9bd6f7bc-0041-4c8c-8c48-c4726b7ed008';