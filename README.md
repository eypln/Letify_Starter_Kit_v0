# Letify — Next.js Skeleton (App Router)

## Kurulum
```
pnpm create next-app letify --ts --eslint --tailwind --app --src-dir false
cd letify
# Bu skeleton'daki dosyaları ilgili klasörlere kopyalayın.
pnpm add @supabase/supabase-js @tanstack/react-query stripe
pnpm add react-dropzone browser-image-compression zustand uuid
pnpm add -D @types/node @types/uuid
```

## Supabase Kurulumu

### Storage Bucket Migration
Aşağıdaki SQL migration dosyasını Supabase SQL Editor'da çalıştırın:
```sql
-- supabase_migration_2025_08_storage_user_uploads.sql içeriğini buraya yapıştırın
```

Ya da psql ile:
```
psql -h db.PROJECT_REF.supabase.co -U postgres -d postgres -f supabase_migration_2025_08_storage_user_uploads.sql
```

## Çevre Değişkenleri (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=

N8N_WEBHOOK_BASE=https://n8n.example.com/webhook
N8N_STATUS_CALLBACK_SECRET=change_me

NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

## Özellikler

### 📸 Görsel Yükleme (Step 2)
- Sürükle-bırak ile dosya seçimi
- İstemci tarafında otomatik sıkıştırma (≤1 MB)
- En fazla 15 görsel desteği
- Supabase Storage entegrasyonu
- Session storage ile kalıcılık
- Desteklenen formatlar: JPEG, PNG, WebP

### 🔐 Güvenlik
- Kullanıcı bazlı dosya erişimi (RLS)
- Otomatik dosya yolu organizasyonu: `user_uploads/{userId}/YYYY/MM/`
- Type-safe dosya validasyonu

## Routes
- `/dashboard/profile` — entegrasyon ayarları (Facebook Page ID, Access Token, App Secret) + tema + logout
- `/dashboard/new-post` — 5 adımlı stepper
- `/dashboard/listings` — tablo + detay
- `/dashboard/analytics` — grafikler
- `/dashboard/clients` — coming soon
- `/dashboard/subscription` — Stripe bağlantıları

## API Webhooks (proxy → n8n)
- `POST /api/webhooks/content`
- `POST /api/webhooks/fb-post`
- `POST /api/webhooks/video-create`
- `POST /api/webhooks/fb-reels`
```

