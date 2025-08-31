# Letify — Next.js Skeleton (App Router)

## Kurulum
```
pnpm create next-app letify --ts --eslint --tailwind --app --src-dir false
cd letify
# Bu skeleton'daki dosyaları ilgili klasörlere kopyalayın.
pnpm add @supabase/supabase-js @tanstack/react-query stripe
pnpm add -D @types/node
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

