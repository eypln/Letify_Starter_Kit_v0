# Tech Context: Letify

## Teknoloji Stack

### Frontend
- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript 5.x
- **UI Library**: React 19.1.1
- **Styling**: Tailwind CSS 4.2.4 + @tailwindcss/postcss 4.2.4 (v4 — autoprefixer kaldırıldı, built-in)
- **Component Library**: Radix UI primitives (being migrated to native HTML for performance)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts (PieChart, donut grafikler — Applications statü dağılımı)
- **PDF Generation**: jsPDF 2.5.2 + jspdf-autotable 3.8.4 (Teamleader Bonus raporları, Job Applications raporları)
- **Excel Export**: xlsx ^0.18.5 (Job Applications XLSX dışa aktarma)
- **Date Handling**: date-fns
- **PWA**: next-pwa 5.6.0 (Service Worker, Offline Support, Push Notifications)
  - **Custom Service Worker**: `public/service-worker.js` (270+ lines)
  - **Workbox Integration**: Via CDN for caching strategies
  - **Configuration**: `swSrc` for custom service worker, auto-generated disabled
- **Push Notifications**: web-push 3.6.7 (VAPID authentication, browser notifications)
  - **Architecture**: Backend → Web Push API → Service Worker → Browser Notification
  - **Vibration Pattern**: Mobile UX (200, 100, 200 milliseconds)
  - **Test Endpoint**: `/api/notifications/test` for easy testing
  - **Database**: `push_subscriptions` table for subscription management
- **Analytics**: @vercel/analytics 1.6.1 (import: `@vercel/analytics/next` for Next.js 15)
- **Security**: BotID 1.5.10 (Bot protection, API security)

### Backend & Database
- **Backend-as-a-Service**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth (PKCE flow, email verification)
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Edge Functions**: Supabase Edge Runtime
- **RLS Policies**: Comprehensive row-level security for all tables

### Payments & Automation
- **Payment Processor**: Stripe 18.5.0
- **Webhook Handler**: Stripe Webhooks
- **Workflow Engine**: N8N
- **API Integration**: REST + Webhooks
- **Email**: Nodemailer 7.0.9 (SMTP configuration)

### State Management & Data Fetching
- **Global State**: Zustand 5.0.8
- **Server State**: TanStack React Query 5.90.2
- **Form State**: React Hook Form 7.50.1
- **Validation**: Zod 3.22.4

### Development Tools
- **Package Manager**: pnpm (enforced via .npmrc)
- **Linting**: ESLint 9 (flat config)
- **TypeScript**: Strict mode, no `any` types (exception: Supabase generated types)
- **Code Formatting**: Prettier (implied)
- **Type Checking**: TypeScript 5.x
- **Testing**: Jest + React Testing Library (68 tests passing)
- **Build Tool**: Next.js built-in
- **Performance**: Lighthouse optimized (Dashboard: Performance 86)

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm
- Supabase CLI
- Stripe CLI (for webhook testing)

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=        # veya SUPABASE_SERVICE_ROLE_KEY (Admin API için)

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# N8N
N8N_WEBHOOK_BASE=
N8N_STATUS_CALLBACK_SECRET=

# App
NEXT_PUBLIC_WEBAPP_URL=

# SMTP Email Configuration (24.11.2025)
SMTP_HOST=                    # Gmail veya Hostinger SMTP
SMTP_PORT=                    # 587 (TLS) veya 465 (SSL)
SMTP_USER=                    # Email gönderen hesap
SMTP_PASS=                    # Email şifre veya app password
SMTP_FROM=                    # Gönderen email adresi
SMTP_ADMIN_EMAIL=             # Admin bildirim email (admin@letify.cloud)

# Push Notifications (11.11.2025)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@letify.cloud

# Google Maps (18.01.2025)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

### Local Development
```bash
pnpm install
pnpm dev
```

### Database Setup
- Supabase project creation
- Migration files execution
- Storage bucket configuration
- RLS policies setup

### Internship Tables (v2.8.0 — 08.03.2026)
- `internship_task_definitions` — Görev tanımları (sub_targets jsonb, message_templates jsonb, guide_content text)
- `internship_daily_logs` — Günlük log (user_id, task_definition_id, log_date, sub_target_key, count, details jsonb)
- `internship_client_queries` — Client query (assigned_to, property_suggestions jsonb, min_suggestions)
- RLS: intern=kendi verileri, teamleader+=tüm veriler
- TypeScript tipleri: `types/supabase.ts`'ye eklendi

### AI Second Brain Pipeline (v2.8.9 — 06.04.2026)
- **n8n**: Self-hosted at `https://n8n.letify.cloud` — Workflow automation engine
- **Notion API**: Internal Integration — İçerik yönetim veritabanı
  - DB ID: `a66165cd-5be6-43ac-a2dc-4b370e85de9c`
  - Properties: property_url, Status (Todo/In progress/Done), Tags (multi_select), property_title, AI Brain Analysis (rich_text)
- **Gemini 2.5 Pro**: `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent`
  - Yapılandırılmış JSON çıktı (responseMimeType: 'application/json')
  - maxOutputTokens: 8192
- **Apify**: Çoklu platform scraper'ları
  - Instagram: Actor `shu8hvrXbJbY3Eb9W`
  - Facebook: Actor `PBJEdJdctLHQaqdfe`
  - YouTube: Actor `h7sDV53CddomktSi5`
  - TikTok: Actor `7200360993149553925`
- **Supabase + pgvector** (PLANNED): Knowledge Store — brain_analyses tablosu, Gemini text-embedding-004 (768 dim)
- **KRITIK n8n ÖĞRENME**: API ile oluşturulan workflow'lar UI'da boş render olabilir. Manuel Ctrl+V paste güvenilir yöntem. Notion node filter conditions JSON paste'te hata verir — n8n UI'da manuel eklenmeli.

## Teknik Kısıtlamalar

### Performance
- Image compression: ≤1MB per file
- Max images: 15 per upload
- Database queries: Optimized with indexes
- Bundle size: Tree shaking enabled

### Security
- RLS enabled on all tables
- JWT token validation
- CORS configuration
- Input sanitization with Zod

### Scalability
- Supabase horizontal scaling
- CDN for static assets
- Database connection pooling
- Edge function deployment

## Dependencies

### Core Dependencies
- @supabase/supabase-js: Database & Auth client
- @supabase/ssr: Server-side rendering support
- stripe: Payment processing
- zustand: State management
- @tanstack/react-query: Data fetching
- react-hook-form: Form handling
- zod: Schema validation
- next-pwa: Progressive Web App support
- web-push: Push notification server (VAPID)
- @types/web-push: TypeScript types for web-push

### UI Dependencies
- @radix-ui/*: Component primitives
- lucide-react: Icons (Download, X, Edit2, etc.)
- tailwind-merge: Class merging
- clsx: Conditional classes
- react-select: Select components
- react-datepicker: Date picker
- next/image: Optimized image rendering with remote patterns

### Maps & Geospatial (v1.9 - 18.01.2025)
- @types/google.maps: TypeScript definitions for Google Maps JavaScript API
- Google Maps JavaScript API: Interactive map visualization (client-side, script tag loaded)

### Utility Dependencies
- browser-image-compression: Image processing
- react-dropzone: File uploads
- uuid: ID generation
- date-fns: Date utilities
- country-list: Country data

## Tool Kullanım Pattern'leri

### Code Organization
- Feature-based folder structure
- Shared components in /components
- Business logic in /lib
- Types in /types
- Scripts in /scripts

### Git Workflow
- Feature branches
- Pull request reviews
- Semantic commit messages
- Release tagging

### Testing Strategy
- Unit tests for utilities
- Integration tests for API routes
- E2E tests for critical flows
- Manual testing for UI/UX

### Deployment
- **Frontend**: Vercel (Production: https://app.letify.cloud - LIVE 17.11.2025)
- **Backend**: Supabase
- **Payments**: Stripe
- **Cron Jobs**: Vercel Cron (4 jobs configured)
- **Monitoring**: Vercel Analytics, Web Vitals tracking

### Deployment Status (17.11.2025)
```
✅ Frontend: Live on Vercel
✅ Database: Supabase production
✅ Authentication: Active
✅ Payments: Stripe integrated
✅ Push Notifications: All 6 categories active
✅ BotID Security: API protection active
✅ PWA: Service worker, offline support, install prompt
✅ Cron Jobs: 4 scheduled jobs (viewing reminders, system alerts, commission, fb token)
```


## External API Integrations

### Next.js Image Remote Patterns Configuration (v2.0 - 01.12.2025)
**Purpose**: Enable next/image optimization for Supabase Storage URLs

**Configuration** (next.config.js):
```javascript
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',  // Wildcard for all Supabase subdomains
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}
```

**Why Required**:
- Next.js Image Optimization requires whitelisted external domains
- Prevents security vulnerabilities (arbitrary image proxy usage)
- Enables automatic image optimization (format, size, quality)

**Error Without Config**:
```
Error: Invalid src prop (https://xyz.supabase.co/storage/v1/object/public/...)
hostname "xyz.supabase.co" is not configured under images in your `next.config.js`
```

**Benefits**:
- Automatic WebP/AVIF conversion (browser support detection)
- Responsive image sizing (srcset generation)
- Lazy loading with blur placeholder
- CDN caching via Vercel Edge Network

**Pattern Usage**:
```typescript
import Image from 'next/image'

<Image
  src="https://xyz.supabase.co/storage/v1/object/public/user_uploads/photo.jpg"
  alt="Property photo"
  width={300}
  height={200}
  className="rounded-lg"
  priority={false}  // Lazy load by default
/>
```

**Related Features**:
- Supabase Storage URLs (public bucket: user_uploads)
- Photo management in listings edit dialog
- Migration API for uploaded_assets → listings.images

---

### Google Maps JavaScript API (v1.9 - 18.01.2025)
**Purpose**: Geospatial visualization of property listings on Malta map

**Setup Process**:
1. Create Google Cloud Console project
2. Enable Maps JavaScript API
3. Create API key with restrictions
4. Set HTTP referrer restrictions (app.letify.cloud, localhost:3000)
5. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local

**Usage Pattern**:
```typescript
// Dynamic script loading with singleton pattern
const script = document.createElement('script')
script.src = `$https://maps.googleapis.com/maps/api/js?key=`${GOOGLE_MAPS_API_KEY}&libraries=marker`$
script.async = true
document.head.appendChild(script)
```

**Features Used**:
- Advanced Marker Element (new marker API)
- InfoWindow for listing details
- Custom marker clustering by city
- 62 Malta city coordinates (hardcoded, no Geocoding API needed)

**Performance Considerations**:
- Script loaded once per page (singleton pattern)
- Markers clustered by city (not per listing)
- Static coordinates (no API calls for geocoding)
- Client-side only (no server-side rendering)

**Documentation**: See MALTA_MAP_SETUP.md for complete Google Cloud Console setup guide

### N8N Workflow Automation
**Purpose**: Job processing, data extraction, content creation
**Integration**: Webhook-based communication
**Environment**: N8N_WEBHOOK_BASE, N8N_STATUS_CALLBACK_SECRET

### Stripe Payment Processing
**Purpose**: Subscription billing, credit purchases
**Integration**: Stripe.js, Stripe Checkout, Webhooks
**Environment**: STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

### Supabase Platform
**Purpose**: Database, authentication, storage, real-time
**Integration**: @supabase/supabase-js, @supabase/ssr
**Environment**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE

## Code Quality & Linting (24.11.2025)

### ESLint 9 Flat Config
**Migration Status**: ✅ Complete (24.11.2025)
**File**: `eslint.config.mjs`

**Configuration**:
```javascript
import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import nextPlugin from '@eslint/eslint-plugin-next'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@next/next': nextPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
```

**Key Rules**:
- `no-unused-vars`: Warn on unused variables/imports
- `no-explicit-any`: Prevent `any` types (replaced with proper interfaces)
- `react-hooks/rules-of-hooks`: Enforce hooks rules
- `react-hooks/exhaustive-deps`: Check useEffect/useCallback dependencies

**Migration Result**:
- 100+ warnings → 0 warnings
- All `any` types removed
- React Hook best practices enforced
- Type safety at 100%

### TypeScript Strict Mode
**Configuration**: tsconfig.json
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Type Patterns**:
```typescript
// Error handling
catch (err) {
  const error = err as Error;
  console.error(error.message);
}

// Interface instead of any
interface ApiResponse {
  data: Record<string, unknown>;
  error?: string;
}

// Third-party library types
import { FileRejection, DropEvent } from 'react-dropzone';
```

### Package Manager Enforcement
**File**: `.npmrc`
```
package-manager=pnpm
engine-strict=true
```

**Purpose**:
- Enforce pnpm usage across team
- Prevent npm/yarn lockfile conflicts
- Consistent dependency resolution
