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

## Testing

This project includes a comprehensive testing suite with Jest and React Testing Library.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:components
npm run test:api
npm run test:integration
```

For detailed testing documentation, see [TESTING.md](./TESTING.md).

**Test Statistics:**
- Total Tests: 68 passing
- Test Suites: 6 (unit, component, API, integration)
- Coverage: See `npm run test:coverage`

## Performance Optimization

This project is optimized for maximum performance with:

```bash
# Analyze production bundle
npm run analyze

# Analyze and open in browser
npm run analyze:browser
```

**Implemented Optimizations:**
- ✅ Bundle analysis with @next/bundle-analyzer
- ✅ Lazy loading for heavy components (React Select, DatePicker, Charts)
- ✅ Image optimization (AVIF/WebP, responsive sizing)
- ✅ Font optimization with next/font
- ✅ Tree shaking and code splitting
- ✅ Web Vitals monitoring (LCP, FID, CLS, FCP, TTFB, INP)
- ✅ Loading skeletons for better UX
- ✅ Production build optimizations (SWC minify, console removal)

For detailed performance documentation, see [PERFORMANCE.md](./PERFORMANCE.md).

**Performance Targets:**
- First Load JS: < 200 KB (gzipped)
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

## SEO Optimization

This project is fully optimized for search engines with:

**Implemented SEO Features:**
- ✅ Meta tags (title, description, keywords)
- ✅ Open Graph tags for social media sharing
- ✅ Twitter Card tags
- ✅ Dynamic sitemap.xml generation
- ✅ Robots.txt configuration
- ✅ JSON-LD structured data (Organization, WebSite, WebApplication)
- ✅ Mobile-friendly meta tags
- ✅ Turkish locale (lang="tr")

**Access**:
```bash
# View sitemap
https://yourdomain.com/sitemap.xml

# View robots.txt
https://yourdomain.com/robots.txt
```

For detailed SEO documentation, see [SEO.md](./SEO.md).

**SEO Tools Used:**
- Sitemap for search engine crawling
- Robots.txt for crawler control
- Rich snippets with structured data
- Social media preview optimization
```

