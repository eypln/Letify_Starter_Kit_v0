-- increment_credits fonksiyonunu güncelle: stripe_customer_id nullable değil, düzeltelim
DROP FUNCTION IF EXISTS increment_credits(UUID, INTEGER);
-- increment_credits fonksiyonu: Kullanıcının credit miktarını günceller
CREATE OR REPLACE FUNCTION increment_credits(p_user_id UUID, p_delta INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_credits INTEGER;
    new_credits INTEGER;
BEGIN
    -- Mevcut credits miktarını al
    SELECT COALESCE(credits, 0) INTO current_credits
    FROM billing_customers
    WHERE user_id = p_user_id;

    -- Eğer kullanıcı bulunamazsa, yeni kayıt oluştur (stripe_customer_id'yi null olarak bırak)
    IF current_credits IS NULL THEN
        INSERT INTO billing_customers (user_id, credits, created_at, updated_at)
        VALUES (p_user_id, GREATEST(p_delta, 0), NOW(), NOW());
        RETURN GREATEST(p_delta, 0);
    END IF;

    -- Yeni credits miktarını hesapla (negatif olmamalı)
    new_credits := GREATEST(current_credits + p_delta, 0);

    -- Credits miktarını güncelle
    UPDATE billing_customers
    SET credits = new_credits, updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Yeni credits miktarını döndür
    RETURN new_credits;
END;
$$;