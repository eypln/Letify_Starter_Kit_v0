# Revenue Feature Setup Instructions

## Database Migration

Revenue tablosunu oluşturmak için aşağıdaki SQL kodunu Supabase Dashboard'da çalıştırmanız gerekiyor:

### Adımlar:
1. Supabase Dashboard'a gidin
2. SQL Editor'ü açın
3. Aşağıdaki SQL kodunu kopyalayıp çalıştırın:

```sql
-- Create revenue table
CREATE TABLE IF NOT EXISTS public.revenue (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ref_no TEXT,
    client_name TEXT,
    rent_amount NUMERIC(10, 2),
    landlord_fee NUMERIC(10, 2),
    landlord_discount BOOLEAN DEFAULT FALSE,
    client_fee NUMERIC(10, 2),
    client_discount BOOLEAN DEFAULT FALSE,
    listing_fee NUMERIC(10, 2),
    has_listing_fee BOOLEAN DEFAULT FALSE,
    agent_income NUMERIC(10, 2),
    agent_tax NUMERIC(10, 2) DEFAULT 0,
    vatable BOOLEAN DEFAULT TRUE,
    date_rented TIMESTAMPTZ,
    date_signed TIMESTAMPTZ,
    date_move_in TIMESTAMPTZ,
    landlord_paid_date TIMESTAMPTZ,
    client_paid_date TIMESTAMPTZ,
    collaboration_with TEXT,
    inform_boss_after_both_sides_paid BOOLEAN DEFAULT FALSE,
    boss_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for revenue table
ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;

-- Users can view their own revenue records
CREATE POLICY "Users can view their own revenue records"
    ON public.revenue
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own revenue records
CREATE POLICY "Users can insert their own revenue records"
    ON public.revenue
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own revenue records
CREATE POLICY "Users can update their own revenue records"
    ON public.revenue
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own revenue records
CREATE POLICY "Users can delete their own revenue records"
    ON public.revenue
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_revenue_user_id ON public.revenue(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_created_at ON public.revenue(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_revenue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
$$ LANGUAGE plpgsql;

CREATE TRIGGER revenue_updated_at
    BEFORE UPDATE ON public.revenue
    FOR EACH ROW
    EXECUTE FUNCTION update_revenue_updated_at();
```

## Revenue Feature Özellikleri

### Tablo Sütunları:
1. **Ref No** - Referans numarası (Viewings'deki title)
2. **Client Name** - Müşteri adı
3. **Rent Amount** - Kira tutarı
4. **Landlord Fee** - Ev sahibi ücreti (Kira/2 - %15 indirim + %18 VAT)
5. **Client Fee** - Müşteri ücreti (Kira/2 - %15 indirim + %18 VAT)
6. **Listing Fee** - Listeleme ücreti (Opsiyonel, Kira × %5)
7. **Agent Income** - Ajan geliri (Vatable: %40, Non-vatable: %32, indirimler düşülür)
8. **Agent TAX** - Ajan vergisi (Non-vatable seçilirse %8)

### Hesaplama Kuralları:

#### Landlord Fee & Client Fee:
- Base: Rent Amount / 2
- %15 indirim opsiyonel
- +%18 VAT eklenir
- Örnek: €1500 kira → €750 base → %15 indirim = €637.50 → +%18 VAT = €752.25

#### Agent Income:
- Vatable: Rent Amount × 40%
- Non-vatable: Rent Amount × 32%
- Landlord'da %15 indirim varsa: -7.5%
- Client'da %15 indirim varsa: -7.5%
- İkisinde de indirim varsa: -15%

#### Agent TAX:
- Vatable seçiliyse: €0
- Non-vatable seçiliyse: Rent Amount × 8% (40% - 32% farkı)

### Otomatik Özellikler:

1. **Viewings'den Otomatik Oluşturma:**
   - Viewing result DEAL seçildiğinde otomatik revenue kaydı oluşur
   - Ref No ve Client Name otomatik doldurulur

2. **Boss Bildirimi:**
   - "Inform Boss after both sides paid" seçiliyse
   - Landlord ve Client ödeme tarihleri girildiğinde
   - Boss role'üne sahip kullanıcılara email gider

### API Endpoints:
- `GET /api/revenue` - Kullanıcının revenue kayıtlarını getirir
- `POST /api/revenue` - Yeni revenue kaydı oluşturur
- `PUT /api/revenue` - Mevcut revenue kaydını günceller

### Sayfa Özellikleri:
- Pagination (30 kayıt/sayfa)
- Edit yapılabilir kayıtlar
- Responsive tablo tasarımı
- Calculated fees real-time hesaplama
- Modal form ile ekleme/düzenleme
