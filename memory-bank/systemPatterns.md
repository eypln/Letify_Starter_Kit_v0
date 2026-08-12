# System Patterns: Letify

## Revenue, Bonus & Invoice Patterns (13.08.2026)

### Revenue Timeline vs Bonus Timeline
- Deal'in operasyonel revenue görünümü ile bonus hesaplama ayı aynı kavram değildir; iki timeline ayrı helper/selector mantığıyla korunur.
- Bonus completion month Malta timezone kullanılarak deterministik hesaplanır.
- Bonus kapsamına yalnızca ödeme kuralını sağlayan paid deal'ler alınır.

### Shared Revenue Basis
- Shortlet ve longlet hesapları `lib/revenue-calculations.ts` içindeki ortak helper üzerinden yürütülür.
- Agent, teamleader ve manager ekranlarında aynı business formula kullanılmalıdır; ekran bazlı formül kopyalanmamalıdır.

### Identity and Collaboration
- Collaboration ve elevated-user permission kararları profile adı yerine immutable `profiles.user_id` ile yapılır.
- `supabase/migrations/20260811090000_revenue_collab_user_id_policies.sql` collaboration ID ve ilgili policy hardening'i sağlar.

### Date Safety
- Revenue tarihleri `lib/revenue-date-validation.ts` ile 2025–2050 aralığında parse/validate edilir.
- UI DatePicker sınırları ve API validation aynı sınırları takip eder; eski/bozuk tarihlerin bonus veya revenue raporlarına sızması engellenir.

### Invoice Notification Flow
```
Agent/Teamleader Add or Edit Deal
  -> InvoiceInfoModal (invoice fields)
  -> /api/revenue validation + persistence
  -> admin notification metadata
  -> email/push notification helper
```
- DB kolonları `supabase/migrations/20260813100000_revenue_invoice_admin_notification.sql` ile oluşturulur.
- Invoice modal agent ve teamleader akışları arasında paylaşılır.

## Sistem Mimarisi

### Genel Yapı
- **Frontend**: Next.js 15 App Router, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Payments**: Stripe (Subscriptions + One-time payments)
- **Automation**: N8N (Workflow orchestration)
- **State Management**: Zustand + React Query
- **Styling**: Tailwind CSS + Native HTML (Radix UI removed from Dashboard for performance)
- **Performance**: Lighthouse-optimized (Dashboard: Performance 86, TBT 160ms)
- **PWA**: next-pwa with custom service worker, Web Push notifications

### Component Architecture
```
App (Next.js)
├── Layout (Authentication, Navigation)
├── Pages
│   ├── Public (Sign-in, Sign-up, Home)
│   ├── Protected (Dashboard, Profile, etc.)
│   ├── Role-Based Dashboards (06.12.2025)
│   │   ├── /dashboard (Agent only)
│   │   ├── /teamleader (Team Leader only)
│   │   ├── /manager (Manager only - placeholder)
│   │   └── /boss (Boss only - placeholder)
│   ├── Shared Pages (All authenticated roles)
│   │   ├── /dashboard/profile
│   │   ├── /dashboard/clients
│   │   ├── /dashboard/listings
│   │   └── ... (7 more shared pages)
│   ├── Access Control
│   │   └── /access-denied (Custom 403 page)
│   └── API Routes (Stripe webhooks, N8N callbacks, Push notifications)
├── Components
│   ├── UI (Reusable components)
│   ├── Feature-specific (Upload, Billing, etc.)
│   ├── System (RoleGuard - 06.12.2025)
│   └── Layout (Header, Sidebar, etc.)
└── Lib
    ├── Supabase (Client/Server)
    ├── Stripe (Configuration)
    ├── Push Notifications (Web Push API integration)
    ├── Middleware (roleGuard.ts - RBAC)
    ├── Hooks (useDashboardUrl - Role-aware routing)
    ├── Utils (Helpers)
    └── Validation (Zod schemas)
```

## Ana Teknik Kararlar

### AI Second Brain — Content Engineering Pipeline (06.04.2026)

**Mimari Pattern — 4 Katmanlı AI Pipeline:**
```
Layer 1: Triage (Sınıflandırma)
  Notion (Todo) → Gemini → 9 Kategori Tag → Notion (Done)

Layer 2: Specialist Brain (Derin Analiz)
  Notion (Done + Tag) → Apify Scrape → Gemini 2.5 Pro → Notion (AI Brain Analysis)

Layer 3: Knowledge Store (PLANNED)
  Analiz → Gemini Embedding (768d) → Supabase + pgvector

Layer 4: Brain Query (PLANNED)
  Soru → Embedding → Cosine Search → Context → Gemini Sentez
```

**Teknik Kararlar:**
- **Gemini 2.5 Pro**: Yapılandırılmış JSON çıktı (`responseMimeType: 'application/json'`) — type-safe analiz sonuçları
- **Apify Multi-platform**: Platform URL pattern matching ile otomatik scraper seçimi
- **content_knowledge kategorisi**: İçerik üreticisinin öğrettiği gerçek bilgiyi yapılandırılmış olarak çıkartma (diğer SM metriklerinden ayrı)
- **Malta/Lettings Context**: Tüm AI prompt'larında küçük ada pazarı, lettings sektörü ve € bağlamı embed edilmiş
- **n8n API Kısıtlaması**: API ile oluşturulan workflow'lar UI'da boş render — manual Ctrl+V paste zorunlu
- **Notion Filter Workaround**: Filter conditions JSON paste'te çalışmaz — n8n UI'da manuel eklenir

### PWA Mobile Push Notification System Architecture (05.12.2025)

**Problem Discovery → Root Cause → Solution Journey:**
- **User Question**: "PWA mobilde notification geliyor mu?"
- **Workspace Audit**: 20+ file deep investigation
- **Root Cause Found**: Service Worker push events capture etmiyordu!
- **System Status**:
  - Backend notification sending: ✅ Working
  - Web Push API subscription: ✅ Working
  - Service Worker push handler: ❌ MISSING
  - Result: Backend → API → SW break = No notifications

**Solution Pattern - Custom Service Worker:**

1. **next-pwa Configuration Conflict**:
   ```javascript
   // REMOVED: runtimeCaching (conflicts with swSrc)
   // ADDED: swSrc: 'public/service-worker.js'
   // RESULT: Use custom SW instead of auto-generated
   ```

2. **Service Worker Push Event Handler**:
   ```javascript
   self.addEventListener('push', function(event) {
     const data = event.data.json();
     const promiseChain = self.registration.showNotification(
       data.title,
       {
         body: data.body,
         icon: data.icon || '/icons/Logo/192.png',
         badge: data.badge || '/icons/Logo/96.png',
         vibrate: [200, 100, 200], // Mobile vibration UX
         data: data.data,
         requireInteraction: data.requireInteraction || false,
         actions: data.actions || []
       }
     );
     event.waitUntil(promiseChain);
   });
   ```

3. **Notification Click Handler**:
   ```javascript
   self.addEventListener('notificationclick', function(event) {
     event.notification.close();
     const urlToOpen = event.notification.data.url || '/';
     event.waitUntil(
       clients.matchAll({ type: 'window', includeUncontrolled: true })
         .then(windowClients => {
           // Find or open new window, navigate to URL
         })
     );
   });
   ```

4. **Workbox Caching Strategies**:
   - NetworkFirst: HTML pages
   - CacheFirst: Fonts, images
   - StaleWhileRevalidate: JS/CSS bundles
   - Imported from CDN in custom service worker

**Push Notification Full Flow:**
```
1. User enables push → lib/notifications.ts
   → PushManager.subscribe(VAPID public key)
   → Server saved to push_subscriptions table

2. Teamwork listing shared → /api/teamwork/listings/share
   → sendTeamworkNotification(excludeUserId, payload)
   → Query push_subscriptions table
   → web-push library: Sign with VAPID private key
   → Send to Web Push Service

3. Service Worker receives push → public/service-worker.js
   → push event listener triggered
   → Decode JSON payload
   → showNotification() displays to user
   → Mobile vibration pattern activated

4. User clicks notification → notificationclick handler
   → Extract URL from notification.data
   → Navigate to app page
```

**Key Pattern Decisions:**
- ❌ **Auto-generated SW**: Limited functionality, no push event handling
- ✅ **Custom Service Worker**: Full control, push + caching integrated
- ❌ **runtimeCaching with swSrc**: Build conflict (WebpackInjectManifest error)
- ✅ **Workbox in custom SW**: Manual Workbox config via CDN import

**Build Error Resolution Pattern:**
```
Error: WebpackInjectManifest - 'runtimeCaching' not expected with swSrc
Solution: Remove runtimeCaching array entirely
Reason: Caching logic moved to custom service-worker.js
Result: Clean build (Exit Code: 0)
```

**Manifest Configuration for Mobile:**
```json
{
  "permissions": ["notifications", "push"],
  "gcm_sender_id": "103953800507"
}
```

**Testing Infrastructure:**
- `/api/notifications/test` - Send test notification
- NotificationSettings.tsx - UI for enabling/testing
- Client-side logging - Browser console debug
- Subscription tracking - Supabase push_subscriptions table

**Performance Considerations:**
- Service Worker: ~30KB (compressed)
- Workbox CDN: ~50KB (compressed)
- Push subscription: One per device per user
- Browser compatibility: Chrome, Firefox, Edge (Safari limited)

**Type Safety Pattern:**
```typescript
// Web Push API interface conflicts
type DbPushSubscription = Database['public']['Tables']['push_subscriptions']['Row']
// Avoid naming conflict with browser's global PushSubscription
```

### @vercel/analytics Import Path Pattern (05.12.2025)

**Next.js 15 Compatibility Issue:**
- ❌ Old path: `@vercel/analytics/react` (deprecated in 1.6.1+)
- ✅ New path: `@vercel/analytics/next` (Next.js App Router)
- **Reason**: Removed React hooks-based API, added Next.js integration
- **Error**: Console warning "tabReply export deprecated"
- **Fix Location**: `app/layout.tsx` line 4

**Migration Pattern:**
```typescript
// BEFORE (deprecated)
import { Analytics } from '@vercel/analytics/react'

// AFTER (correct for Next.js 15)
import { Analytics } from '@vercel/analytics/next'
```

**Key Learning**: Always check analytics package imports when upgrading Next.js major versions

### Internship Task Management Pattern (08.03.2026 — v2.8.0)

**Mimari:**
```
Intern:
  /dashboard/internship-tasks → 3 tab (Overview, Daily Tasks, Client Queries)
  +1 butonları → listingMode ? Add Listing dialog : quick increment
  "Add log details" → detail_only API (count artmaz, sadece detail append)
  LogDetailsViewer → max 5 inline, >5 → popup modal

Teamleader:
  Aynı sayfa, isTeamleader flag ile farklı görünüm
  Intern seçici dropdown (selectedInternId: 'all' | internId)
  Per-intern progress kartları
  Görev oluşturma, client query atama/reassign/complete
```

**detail_only Pattern (API):**
```typescript
// POST /api/internship-tasks/daily-logs
// detail_only: true → count aynı kalır, detail array'e append
// detail_only: false → count +1, detail varsa append
const existingDetails = Array.isArray(existing.details) ? existing.details : []
const newDetails = [...existingDetails, ...(detail ? [{ ...detail, timestamp }] : [])]
update({ count: detail_only ? existing.count : existing.count + 1, details: newDetails })
```

**External Dialog Control Pattern (AddListingDialog):**
```typescript
// Parent kontrollü dialog açma
<AddListingDialog
  externalOpen={listingDialogOpen}        // parent state
  onOpenChange={setListingDialogOpen}     // parent setter
  onListingCreated={handleListingCreated} // callback: listing oluşturulunca
  showTrigger={false}                     // kendi butonunu gizle
/>
```

**JSONB Type Safety Pattern:**
```typescript
// Supabase Json tipi spread edilemez → Array.isArray kontrolü
const existing = Array.isArray(row.property_suggestions) ? row.property_suggestions : []
const updated = [...existing, newItem]
```

### Role-Based Access Control (RBAC) Pattern (06.12.2025, updated 08.03.2026)

**Soft-Delete Pattern (v2.8.4 — Internship Tasks):**
```typescript
// DELETE /api/internship-tasks?id=taskId
// Soft-delete: is_active = false (daily log'lar korunur)
await supabase.from('internship_task_definitions')
  .update({ is_active: false })
  .eq('id', taskId)
// UI: Trash2 icon + confirmation modal (görev adı + "Existing logs will be preserved" uyarısı)
```

### Data Refresh Pattern — refreshKey + Realtime (v2.8.4)

**Problem**: Child bileşenler bağımsız useEffect ile veri çekiyordu, parent'taki değişiklikler tetiklenmiyordu.

**refreshKey Pattern (Parent → Child Sync):**
```typescript
// Parent:
const [teamRefreshKey, setTeamRefreshKey] = useState(0)
const handleSubmit = async () => { /* save */ setTeamRefreshKey(k => k + 1) }

// Realtime handler'da da:
supabase.channel('...').on('postgres_changes', ..., () => {
  setTeamRefreshKey(k => k + 1)
})

// Child:
<TeamRevenueTable refreshKey={teamRefreshKey} />
<TeamTotalDealCount refreshKey={teamRefreshKey} />

// Child içinde:
useEffect(() => { fetchData() }, [refreshKey, ...otherDeps])
```

**Supabase Realtime Subscription Pattern:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('unique-channel-name')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue' }, () => {
      refreshData()
    })
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [supabase])
```

**Uygulandığı Yerler:**
- Teamleader TeamRevenue: `teamRefreshKey` pattern (parent→child)
- Boss TeamRevenue: `boss-revenue-changes` Realtime channel
- Manager TeamRevenue: `manager-revenue-changes` + `manager-deal-count-changes` channels + `useCallback` refactor

**System Architecture:**
```typescript
// Role Hierarchy (v2.8.0: intern eklendi)
type UserRole = 'agent' | 'intern' | 'teamleader' | 'manager' | 'boss' | 'admin'

// Route Mapping
ROLE_ROUTES = {
  agent: '/dashboard',
  intern: '/dashboard',    // intern, agent ile aynı dashboard'u kullanır
  teamleader: '/teamleader',
  manager: '/manager',
  boss: '/boss',
  admin: '/admin'
}
```

**Protection Patterns:**

1. **Server Component Protection (Static Routes):**
```typescript
// /app/dashboard/page.tsx
export default async function Page() {
  const profile = await getProfile(user?.id)
  
  // Role check at server level
  if (profile.role !== 'agent') {
    redirect('/access-denied')
  }
  // ... render page
}
```

2. **Client Component Protection (Dynamic Routes):**
```typescript
// /app/(app)/teamleader/page.tsx
useEffect(() => {
  const checkAccess = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)  // CRITICAL: use 'user_id' not 'id'
      .single()
    
    if (profileData?.role !== 'teamleader') {
      router.push('/access-denied')
    }
  }
  checkAccess()
}, [])
```

3. **Shared Pages Pattern (Role-Aware Navigation):**
```typescript
// Custom hook for dynamic dashboard URL
export function useDashboardUrl() {
  const [url, setUrl] = useState('/dashboard')
  
  useEffect(() => {
    async function fetchRole() {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      
      setUrl(getDashboardUrl(profile.role))
    }
    fetchRole()
  }, [])
  
  return url
}

// Usage in shared components
const dashboardUrl = useDashboardUrl()
<Link href={dashboardUrl}>Back to Dashboard</Link>
```

**Critical Gotchas:**
- ⚠️ **Database Column**: Use `eq('user_id', user.id)` NOT `eq('id', user.id)`
- ⚠️ **State Race Condition**: Initialize dashboard URL as `null`, not `/dashboard`
- ⚠️ **Button Disabled State**: Prevent clicks until role is fetched
- ⚠️ **UI Language**: All user-facing text must be English

**Access Denied Flow:**
```
User visits unauthorized route
  ↓
Server/Client detects wrong role
  ↓
Redirect to /access-denied
  ↓
Fetch user's actual role
  ↓
Show "Back to Dashboard" button
  ↓
Redirect to correct role dashboard
```

**Implemented Routes:**
- ✅ `/dashboard` - Agent only
- ✅ `/teamleader` - Team Leader only (8-card dashboard)
  - Team Viewings (own + team table)
  - Team Revenue (own + team table, **Assign to Agent** feature)
  - Bonuses (shared BonusesClient component, 4-tier bonus system)
  - Notifications (activity log)
- ✅ `/manager` - Manager Dashboard (08.12.2025) - 5-card monitoring system
  - Profile (no Facebook integration)
  - Teamwork (shared component)
  - Team Viewings (calendar + records, no add function)
  - Team Revenue (records + chart, no add deal)
  - Bonuses (shared BonusesClient component)
  - Reports (coming soon)
- ✅ `/boss` - Boss only
  - Bonuses (shared BonusesClient component)
- ✅ Shared pages - All roles (Profile, Clients, Listings, etc.)

### Bonuses & Performance Pattern (19.02.2026)

**Pattern**: Paylaşılan `BonusesClient` bileşeni, teamleader/boss/manager tarafından kullanılır.

**Tier Hesaplama**:
- Personal rate → `leaderRevenue` bazında tier belirlendi
- Team rate → `totalRevenue` (leader + team) bazında tier belirlendi
- Collaboration → `collaboration_with` doluysa rent %50

**Çift Hesap Desteği**:
- `LEADER_AGENT_ACCOUNTS` map ile teamleader auth ID → agent account user_id bağlantısı
- Sadece BonusesClient.tsx'de kullanılır, başka işlemlere etkisi yoktur

### Elevated User Delegation Pattern (17.02.2026)

**Pattern**: Elevated users (teamleader/manager/boss/admin) can perform actions on behalf of agents.

**Implementation:**
```typescript
// Frontend: Fetch agents for dropdown
const { data: agentData } = await supabase
  .from('profiles')
  .select('user_id, full_name')
  .eq('role', 'agent')
  .order('full_name');

// Frontend: Send target_user_id in payload
const payload = { ...formData, target_user_id: selectedAgentId };

// API: Check caller's role and delegate
const { data: callerProfile } = await supabase
  .from('profiles').select('role').eq('user_id', user.id).single();
const isElevated = ['teamleader','manager','boss','admin']
  .includes(callerProfile?.role);

if (isElevated && target_user_id) {
  insertData.user_id = target_user_id; // Assign to selected agent
} else {
  insertData.user_id = user.id; // Self-assign
}
```

**RLS Pattern for Delegation:**
```sql
-- Allow self-insert OR elevated users to insert for others
CREATE POLICY "policy_name" ON table_name
FOR INSERT TO authenticated
WITH CHECK (user_id::uuid = auth.uid() OR is_elevated_user());

-- is_elevated_user() checks role in profiles table
CREATE OR REPLACE FUNCTION is_elevated_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()::text
    AND role IN ('teamleader', 'manager', 'boss', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

**Key Decisions:**
- ❌ Don't allow agents to assign to other agents
- ✅ Only elevated roles can use target_user_id
- ✅ API silently ignores target_user_id for non-elevated users
- ✅ Agent dropdown uses react-select (consistent with other dropdowns)
- ✅ Edit Deal allows reassignment (change deal ownership)

**Manager Dashboard Pattern (08.12.2025):**
```typescript
// Manager is observer-only (no create/edit permissions)
// Structure: /manager/[feature]/page.tsx + ManagerClient.tsx
// Features:
- profile: Simplified profile without Facebook integration
- teamwork: Reuses /dashboard/teamwork/TeamworkClient.tsx
- team-viewings: Custom ManagerTeamViewingsClient.tsx
  - Calendar: 3-month view with all team viewings
  - Table: Simplified columns (removed Ref No, Client Mobile No)
  - Filters: Result, Agent Name, Month
- team-revenue: Custom ManagerTeamRevenueClient.tsx
  - Table: All team revenue records
  - Chart: Monthly overview with €15,000 goal
  - Filters: Agent Name, Month
- reports: Placeholder for future analytics
```

**useDashboardUrl Hook (08.12.2025):**
```typescript
// Auto-detects user role and returns correct dashboard URL
export function useDashboardUrl() {
  // Checks profile.role and returns:
  // manager → '/manager'
  // teamleader → '/teamleader'
  // boss → '/boss'
  // admin → '/admin'
  // agent → '/dashboard'
}
```

**Documentation:** See `RBAC_SECURITY.md` for complete architecture

### Email Notification & Verification Pattern (24.11.2025)

**3 Aşamalı Email Akışı:**
1. **Sign-Up → Admin Approval Email** (admin@letify.cloud)
2. **Email Verify → Email Verified Notification** (user@email.com)
3. **Admin Approve → Account Approved Email** (user@email.com)

**PKCE Authentication Flow:**
- ✅ `detectSessionInUrl: true` - Otomatik code exchange
- ✅ Explicit localStorage storage - PKCE verifier koruması
- ❌ Sign-up sonrası `signOut()` YAPMA - code_verifier silinir!
- ✅ Session management - `email_confirmed_at` kontrolü her yerde

**Admin Client Pattern:**
```typescript
// lib/supabase/server.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE!
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// Admin API kullanımı
const supabase = createAdminClient()
const { data: { user } } = await supabase.auth.admin.getUserById(userId)
```

**Email Verified Check Pattern:**
```typescript
// Sign-In, Sign-Up ve Session Check'lerde:
if (user && user.email_confirmed_at) {
  // Email verified - izin ver
  setExistingUser({ email, role, emailVerified: true })
} else if (user && !user.email_confirmed_at) {
  // Email verified değil - sign out yap
  await supabase.auth.signOut()
}
```

**Auth Callback Auto Detection:**
```typescript
// app/auth/callback/AuthCallbackContent.tsx
// Manuel exchangeCodeForSession() YAPMA!
await new Promise(resolve => setTimeout(resolve, 500))  // SSR için kısa bekleme
const { data: { session } } = await supabase.auth.getSession()
// detectSessionInUrl otomatik exchange yapıyor
```

**Key Learnings:**
- PKCE verifier localStorage'da saklanır, signOut() tümünü temizler
- Supabase SSR auto detection yeterli, manuel exchange gereksiz
- Admin API için service_role key gerekli, anon key yetmez
- Email verification UX: Adım adım ekranlar (Verify Email → Waiting Approval)
- Session check: email_confirmed_at kontrolü her auth flow'da olmalı

**Blocked User Auth Enforcement (v2.8.7):**
- `profiles.status` değerleri: `pending_admin`, `approved`, `denied`, `blocked`
- Login flow (sign-in + auth callback): `blocked` → `/access-denied` yönlendirme
- Existing session: Blocked kullanıcı sign-in sayfasına gelirse otomatik `signOut()`
- `checkRoleAccess()` (roleGuard.ts): `profiles.status` kontrolü — blocked/denied → `/access-denied`, pending_admin → `/waiting-approval`
- `access-denied` sayfası: Blocked kullanıcıya sadece "Sign Out" butonu gösterilir (dashboard'a dönüş yok)
- `getStatusLabel('blocked')` → "Blocked", `getStatusBadgeVariant('blocked')` → "destructive" (kırmızı badge)
- Profile sayfasında blocked kullanıcı "Blocked" etiketini kırmızı badge ile görür

### SMTP, Auth, Admin, UI ve Memory Bank Pattern'leri (20.06.2024)

- **Ortam Bazlı SMTP Seçimi:**
  - Local ortamda Gmail SMTP, prod ortamda Hostinger SMTP kullanılır.
  - Environment variable ile otomatik seçim yapılır.
  - `.env.local` ve prod ortamı için SMTP ayarları ayrıdır.

- **Supabase Auth Redirect Yönetimi:**
  - `NEXT_PUBLIC_SITE_URL` ile local/prod ortamına göre dinamik redirect sağlanır.
  - Supabase panelinde her iki ortamın URL'leri tanımlanır.

- **Admin Kullanıcı SQL Pattern'i:**
  - admin@letify.cloud gibi özel kullanıcılar için doğrudan SQL ile email_verified ve role güncellemesi yapılır.
  - approval_queue unique constraint hatası SQL ile düzeltilir.
  - Manuel admin ekleme için insert + update pattern'i kullanılır.

- **UI'da Nötr Mesaj Pattern'i:**
  - Analytics gibi sayfalarda hata/uyarı yerine nötr, gri ve kullanıcı dostu mesajlar gösterilir.

- **City Select + Auto-Fill Pattern'i:**
  - Viewings formunda şehir alanı Malta city select ile sunulur.
  - Ref No seçilince city alanı otomatik doldurulur, kullanıcı isterse manuel seçim yapabilir.

- **Memory Bank Güncelleme Disiplini:**
  - Tüm önemli değişiklikler ve yeni pattern'ler memory-bank/activeContext.md ve ilgili context dosyalarına Türkçe olarak işlenir.
  - "Yaptığımız değişiklikleri unutmamak için memory bank güncelle. Ve benimle herzaman Türkçe konuş." prensibi uygulanır.

### Authentication Pattern
- Supabase Auth kullan, JWT token'ları
- Server-side user validation (middleware.ts)
- Client-side auth state management
- RLS (Row Level Security) policies

### Data Flow Pattern
- **Server Components**: Server-side data fetching with parallel queries (Promise.all)
- **Client Components**: React Query + Supabase client for interactive features
- **Optimistic updates** ve error handling
- **Real-time subscriptions** (Supabase realtime)

#### Server Component Data Fetching Pattern (RECOMMENDED for Performance)
**Use Case**: Dashboard stats, initial page data, static content
**Benefits**: Faster LCP, reduced JavaScript, better SEO

```typescript
// page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'

async function fetchDashboardStats(userId: string) {
  const supabase = await createClient()
  
  // Parallel queries for best performance
  const [listingsTotal, listingsMonth, clientsTotal, clientsMonth, 
         viewingsTotal, viewingsMonth, activities] = await Promise.all([
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayISO),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayISO),
    supabase.from('viewings').select('*', { count: 'exact', head: true }),
    supabase.from('viewings').select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayISO),
    supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(10)
  ])
  
  return {
    totalListings: listingsTotal.count || 0,
    sharesThisMonth: listingsMonth.count || 0,
    totalClients: clientsTotal.count || 0,
    clientsThisMonth: clientsMonth.count || 0,
    totalViewings: viewingsTotal.count || 0,
    viewingsThisMonth: viewingsMonth.count || 0,
    recentActivities: activities.data || []
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/sign-in')
  
  const stats = await fetchDashboardStats(user.id)
  
  return <DashboardClient user={user} profile={profile} stats={stats} />
}
```

```typescript
// DashboardClient.tsx (Client Component)
'use client'

interface DashboardStats {
  totalListings: number
  sharesThisMonth: number
  totalClients: number
  clientsThisMonth: number
  totalViewings: number
  viewingsThisMonth: number
  recentActivities: any[]
}

export default function DashboardClient({ 
  user, 
  profile, 
  stats 
}: { 
  user: any
  profile: any
  stats: DashboardStats 
}) {
  // No useEffect, no loading states, direct data usage
  return (
    <div>
      <h2>This Month's Performance</h2>
      <p>Posts: {stats.sharesThisMonth}</p>
      <p>Clients: {stats.clientsThisMonth}</p>
      <p>Viewings: {stats.viewingsThisMonth}</p>
    </div>
  )
}
```

**Performance Impact**:
- TBT: 10,050ms → 160ms (-98%)
- LCP: 20.6s (dev) → 3.8s (production) (-81%)
- No client-side loading states
- Parallel queries ~300-500ms (vs sequential ~1.5-2s)
- Better Core Web Vitals scores

### State Management
- Global state: Zustand (user preferences, UI state)
- Server state: React Query (API data, caching)
- Local state: React useState/useReducer

### File Upload Pattern
- Client-side compression (browser-image-compression)
- Supabase Storage upload
- Path structure: user_uploads/{userId}/YYYY/MM/{file}
- RLS policies for security

### Payment Integration
- Stripe Checkout for subscriptions/credits
- Webhook processing for status updates
- Database sync with billing tables
- Credit ledger for transaction tracking

### Push Notifications Pattern (11.11.2025)
**Client-side Architecture**:
```typescript
// 1. Browser API wrapper (lib/notifications.ts)
export async function subscribeToPush(vapidKey: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') return null
  
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey)
  })
  return subscription
}

// 2. Client Component with Hydration Safety
'use client'
export default function NotificationSettings() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => { setMounted(true) }, [])
  
  if (!mounted) return <div>Loading...</div> // Prevent hydration mismatch
  
  if (!isPushSupported()) return <div>Not supported</div>
  // ... rest of component
}
```

**Server-side Architecture**:
```typescript
// API endpoint (app/api/notifications/send/route.ts)
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Send to all users or specific user
const subscriptions = await supabase
  .from('push_subscriptions')
  .select('*')
  .eq(userId ? 'user_id' : 'id', userId ? userId : subscriptions[0].id)

await Promise.allSettled(
  subscriptions.map(sub => 
    webpush.sendNotification(sub, JSON.stringify(payload))
  )
)
```

**Database Pattern**:
```sql
-- push_subscriptions table
CREATE TABLE push_subscriptions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  keys JSONB NOT NULL, -- {p256dh, auth}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only see/modify their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
```

**Type Safety**:
```typescript
// Avoid conflict with browser's PushSubscription API
type DbPushSubscription = Database['public']['Tables']['push_subscriptions']['Row']

// Use in API routes
const subscriptions = await supabase
  .from('push_subscriptions')
  .select('*')
  .returns<DbPushSubscription[]>()
```

**Key Challenges Solved**:
1. **Hydration Mismatch**: Browser APIs (ServiceWorker, PushManager) only available client-side
   - Solution: `mounted` state flag, early return with loading state
2. **Type Conflicts**: Browser's global `PushSubscription` vs database type
   - Solution: Type alias `DbPushSubscription`
3. **Permission Handling**: Complex browser permission flow
   - Solution: Wrapper functions with error handling
4. **Service Worker Lifecycle**: Push events, notification clicks
   - Solution: Separate `sw-push.js` with event handlers

**Future Integration Points**:
- New listing shared → Send notification
- Viewing reminder (1 hour before) → Send notification
- Revenue milestone → Send notification
- Team collaboration request → Send notification

## Component İlişkileri

### Core Components
- **DashboardClient**: Ana dashboard, stats aggregation
- **UploadWizard**: Step-by-step content creation
- **SubscriptionManager**: Billing UI
- **ProfileForms**: User/profile management

### Data Dependencies
- User → Profile → Clients/Listings
- Subscription → Credits → Usage limits
- Listings → Images (Supabase Storage)
- Activities → Audit logging

## Kritik Implementasyon Yolları

### Authentication Flow
1. User signs in → Supabase auth
2. Token validation → Middleware
3. Profile check → Database
4. Redirect logic → Protected routes

### Upload Flow
1. File selection → Dropzone
2. Compression → browser-image-compression
3. Upload → Supabase Storage
4. State update → Zustand store
5. UI feedback → Toast notifications

### Payment Flow
1. Plan selection → Stripe Checkout
2. Payment processing → Stripe
3. Webhook received → Database update
4. UI refresh → Real-time sync

### Workflow Integration
1. Event trigger → N8N webhook
2. Data processing → N8N workflow
3. Result callback → Database update
4. User notification → Email/in-app

### Push Notification Architecture (Advanced - v1.6)

#### System Overview
19 notification types across 6 categories with cron-based and real-time triggers:

**Cron-Based Notifications (Scheduled)**
- Vercel cron jobs for time-based reminders
- Hourly checks: Viewing reminders, commission reminders
- Daily 8 AM: System alerts, Facebook token expiry

**Real-Time Notifications (Instant)**
- Triggered on data changes (POST/PUT operations)
- Team leader viewing notifications
- Boss & team leader revenue notifications

#### Cron Job Pattern
```typescript
// app/api/[feature]/check-[type]/route.ts
export async function GET(request: Request) {
  try {
    // 1. Authenticate cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Query database for pending notifications
    const supabase = await createClient()
    const { data: items } = await supabase
      .from('table')
      .select('*')
      .gte('date_field', startDate)
      .lte('date_field', endDate)

    // 3. Send notifications in batch
    const notificationPromises = items.map(async (item) => {
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('endpoint, keys')
        .eq('user_id', item.user_id)

      for (const sub of subscriptions || []) {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ title: '...', body: '...', data: {...} })
        )
      }
    })

    await Promise.all(notificationPromises)

    return NextResponse.json({ success: true, count: items.length })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

#### Real-Time Notification Pattern
```typescript
// app/api/[feature]/route.ts (POST/PUT)
async function sendNotificationPush(userId: string, payload: any) {
  try {
    const supabase = await createClient()
    
    // Get user's push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys')
      .eq('user_id', userId)

    if (!subscriptions || subscriptions.length === 0) return

    // Send to all user's devices
    const notificationPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }
        }
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload))
      } catch (err: any) {
        // Clean up expired subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions')
            .delete().eq('user_id', userId).eq('endpoint', sub.endpoint)
        }
      }
    })

    await Promise.all(notificationPromises)
  } catch (error) {
    console.error('Error in sendNotificationPush:', error)
  }
}
```

#### Smart Filtering Pattern (Anti-Spam)
```typescript
// Team Leader - Only notify on result change
const resultChanged = existingViewing && existingViewing.result !== result
if (inform_teamleader && resultChanged) {
  await sendTeamLeaderNotification(...)
}

// Boss - Only notify once via flag
if (shouldNotify && !existingRevenue.boss_notified) {
  await sendBossNotification(...)
  await supabase.from('revenue').update({ boss_notified: true }).eq('id', id)
}
```

#### Multi-Recipient Pattern (Boss + Team Leader)
```typescript
// Get both Boss and Team Leader users
const { data: bossUsers } = await supabase.from('profiles')
  .select('email, full_name').eq('role', 'Boss')
const { data: teamLeaderUsers } = await supabase.from('profiles')
  .select('email, full_name').eq('role', 'teamleader')

// Combine recipients
const allRecipients = [...(bossUsers || []), ...(teamLeaderUsers || [])]

// Send to all
for (const recipient of allRecipients) {
  await sendEmail({ to: recipient.email, ... })
  await sendNotificationPush(recipient.user_id, { ... })
}
```

#### Vercel Cron Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/viewings/check-reminders",
      "schedule": "0 * * * *"  // Every hour
    },
    {
      "path": "/api/system/check-alerts",
      "schedule": "0 8 * * *"  // Daily at 8 AM
    },
    {
      "path": "/api/revenue/check-commission-reminders",
      "schedule": "0 * * * *"  // Every hour
    },
    {
      "path": "/api/integrations/check-facebook-token",
      "schedule": "0 8 * * *"  // Daily at 8 AM
    }
  ]
}
```

#### Database Patterns

**Auto-Update Trigger (Facebook Token)**
```sql
CREATE OR REPLACE FUNCTION update_fb_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fb_access_token IS DISTINCT FROM OLD.fb_access_token THEN
    NEW.fb_token_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fb_token_updated
  BEFORE UPDATE ON users_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_fb_token_timestamp();
```

**One-Time Notification Flag**
```sql
-- revenue table
boss_notified BOOLEAN DEFAULT FALSE
```

#### Key Design Decisions

1. **Cron vs Real-Time**: Time-based events use cron, data changes use real-time
2. **Batch Processing**: Promise.all for parallel notification sending
3. **Error Handling**: Automatic cleanup of expired subscriptions (410/404)
4. **Smart Filtering**: Only notify on meaningful state changes
5. **Multi-Recipient**: Single function handles Boss + Team Leader
6. **Type Safety**: Type assertions for new DB columns not in generated types
7. **Performance**: Indexed queries (user_id, viewing_date, date_signed, etc.)

### Dual-State Data Architecture Pattern (v1.9)
**Use Case**: When you need both paginated table display AND full-dataset visualization (e.g., maps, charts)

**Problem**: Maps should show ALL available properties, but tables need pagination for performance

**Solution**: Separate data flows with independent state management

```typescript
// page.tsx (Server Component wrapper)
export default function ListingsPage({ searchParams }: { searchParams: any }) {
  return <Suspense fallback={<div>Loading...</div>}>
    <ListingsClient searchParams={searchParams} />
  </Suspense>
}

// ListingsClient.tsx (Client Component)
'use client'
export default function ListingsClient({ searchParams }: { searchParams: any }) {
  const [rows, setRows] = useState([])           // Paginated data for table
  const [mapListings, setMapListings] = useState([]) // Full dataset for map
  
  // Effect 1: Fetch paginated data for table
  useEffect(() => {
    const fetchPaginatedData = async () => {
      const data = await getListings({ page: currentPage, limit: 10 })
      setRows(data.listings)
      setTotalPages(data.totalPages)
    }
    fetchPaginatedData()
  }, [currentPage]) // Re-fetch on page change
  
  // Effect 2: Fetch ALL data for map (runs once)
  useEffect(() => {
    const fetchAllMapData = async () => {
      const allData = await getAllAvailableAndSoonListings()
      setMapListings(allData)
    }
    fetchAllMapData()
  }, []) // No dependencies - fetch once on mount
  
  return (
    <>
      <Table data={rows} /> {/* Shows 10 rows */}
      <Pagination current={currentPage} total={totalPages} />
      <MaltaMap listings={mapListings} /> {/* Shows ALL listings */}
    </>
  )
}
```

**Server Actions Pattern**:
```typescript
// actions.ts
export async function getListings({ page, limit }: { page: number, limit: number }) {
  const start = (page - 1) * limit
  const end = start + limit - 1
  
  const { data, count } = await supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .range(start, end)
  
  return { 
    listings: data || [], 
    totalPages: Math.ceil((count || 0) / limit) 
  }
}

export async function getAllAvailableAndSoonListings() {
  const { data } = await supabase
    .from('listings')
    .select('*')
    .in('availability', ['Available', 'Soon'])
    // No range() - fetch ALL records
  
  return data || []
}
```

**Benefits**:
- Table: Fast pagination, no memory issues with large datasets
- Map: Complete visualization without missing data
- Performance: Table queries ~100-200ms, map query runs once
- UX: Users see all properties on map regardless of current page

**When to Use**:
- Maps/Charts requiring complete dataset
- Dashboard widgets needing total counts
- Analytics requiring full data aggregation
- Any scenario where pagination would hide critical information

### PostgreSQL Enum Handling Pattern (v1.9)
**Problem**: PostgreSQL enum types don't directly map to TypeScript union types in Supabase client

**Error Example**:
```typescript
const { data } = await supabase.from('listings').select('availability')
// data.availability is enum type, causes type mismatch in TypeScript
```

**Solution**: Explicit text casting with `::text`

```typescript
// Server Actions (app/dashboard/listings/actions.ts)
export async function getListings() {
  const { data } = await supabase
    .from('listings')
    .select(`
      *,
      availability::text  // Cast enum to text for JavaScript consumption
    `)
  
  return data
}

export async function updateListingAvailability(
  listingId: number, 
  newAvailability: 'Available' | 'Rented' | 'Soon'
) {
  const { error } = await supabase
    .from('listings')
    .update({ availability: newAvailability }) // Direct enum value, no casting needed
    .eq('id', listingId)
  
  return { error }
}
```

**Database Setup**:
```sql
-- Migration file
CREATE TYPE availability_status AS ENUM ('Available', 'Rented', 'Soon');

ALTER TABLE listings 
  ADD COLUMN availability availability_status DEFAULT 'Available' NOT NULL;

CREATE INDEX idx_listings_availability ON listings(availability);
```

**TypeScript Types**:
```typescript
// types/supabase.ts
export interface ListingsRow {
  id: number
  title: string
  availability: 'Available' | 'Rented' | 'Soon' | null
  // ... other fields
}

export interface ListingsInsert {
  availability?: 'Available' | 'Rented' | 'Soon'
  // ... other fields
}
```

**Key Rules**:
1. **SELECT queries**: Use `::text` when selecting enum columns
2. **INSERT/UPDATE queries**: Use raw enum values (no casting needed)
3. **TypeScript types**: Define as union types matching enum values
4. **Default values**: Set in database migration for consistency

**Benefits**:
- Type safety maintained
- No runtime type conversion errors
- Database enforces valid values
- Indexed for query performance

### Photo Management & Migration API Pattern (v2.0 - 01.12.2025)
**Use Case**: Display existing photos in edit dialog, handle legacy data migration

**Problem 1: Photos not displaying in edit dialog**
- Root Cause: Photos stored in `uploaded_assets` table, but `listings.images` field empty
- Client-side RLS: `uploaded_assets` table restricted, client can't query directly
- Server Actions: Nested arrays don't serialize properly

**Solution: Migration API + Client-side Supabase Fetch**

**Migration API Pattern**:
```typescript
// app/api/migrate-listing-photos/route.ts
export async function POST(request: Request) {
  const { listingId } = await request.json()
  const supabase = createClient()
  
  // Step 1: Find job_id from listings
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id')
    .eq('listing_id', listingId)
    .single()
  
  if (!jobs) return NextResponse.json({ images: [] })
  
  // Step 2: Fetch photos from uploaded_assets (server-side, bypasses RLS)
  const { data: assets } = await supabase
    .from('uploaded_assets')
    .select('public_url')
    .eq('job_id', jobs.id)
  
  const photoUrls = assets?.map(a => a.public_url) || []
  
  // Step 3: Update listings.images field with migrated data
  if (photoUrls.length > 0) {
    await supabase
      .from('listings')
      .update({ images: photoUrls })
      .eq('id', listingId)
  }
  
  return NextResponse.json({ images: photoUrls, migrated: true })
}
```

**Client-Side Photo Loading Pattern**:
```typescript
// app/dashboard/listings/edit-dialog.tsx
'use client'

export default function EditDialog({ listing }: { listing: Listing }) {
  const [photos, setPhotos] = useState<string[]>([])
  
  useEffect(() => {
    const loadPhotos = async () => {
      // Check if listings.images field has data
      if (listing.images && listing.images.length > 0) {
        setPhotos(listing.images)
      } else {
        // Fallback: Call migration API for legacy data
        const res = await fetch('/api/migrate-listing-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: listing.id })
        })
        const data = await res.json()
        if (data.images && data.images.length > 0) {
          setPhotos(data.images)
        }
      }
    }
    loadPhotos()
  }, [listing.id]) // eslint-disable-next-line react-hooks/exhaustive-deps
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {photos.map((photoUrl, index) => (
        <PhotoCard 
          key={index} 
          photoUrl={photoUrl} 
          onDownload={() => handleDownload(photoUrl)}
          onDelete={() => handleDelete(index)}
        />
      ))}
      <AddPhotoButton onClick={() => fileInputRef.current?.click()} />
    </div>
  )
}
```

**Photo Download Pattern**:
```typescript
const handleDownload = async (photoUrl: string) => {
  try {
    // Fetch photo as blob
    const response = await fetch(photoUrl)
    const blob = await response.blob()
    
    // Create object URL
    const url = window.URL.createObjectURL(blob)
    
    // Create hidden download link
    const a = document.createElement('a')
    a.href = url
    a.download = `photo-${Date.now()}.jpg`
    a.style.display = 'none'
    
    // Trigger download
    document.body.appendChild(a)
    a.click()
    
    // Cleanup
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success('Photo downloaded successfully')
  } catch (error) {
    console.error('Download failed:', error)
    toast.error('Failed to download photo')
  }
}
```

**Next.js Image Configuration**:
```javascript
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',  // Wildcard for all Supabase projects
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}
```

**Photo Grid UI Pattern**:
```typescript
function PhotoCard({ photoUrl, onDownload, onDelete }: PhotoCardProps) {
  return (
    <div className="relative group">
      {/* Photo thumbnail */}
      <Image
        src={photoUrl}
        alt="Property photo"
        width={150}
        height={150}
        className="rounded-lg object-cover"
      />
      
      {/* Buttons (visible on hover) */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onDownload}
          className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          <Download size={16} />
        </button>
      </div>
      
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onDelete}
          className="p-1 bg-red-500 hover:bg-red-600 text-white rounded"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
```

**Benefits**:
- Server-side API bypasses client-side RLS restrictions
- Migration pattern bridges legacy data to new schema
- Progressive enhancement (works with or without migration)
- User-friendly download (direct to device, no right-click)
- Clean separation: Migration logic on server, UI logic on client

**When to Use**:
- Legacy data migration scenarios
- Client-side RLS restrictions prevent direct queries
- Photo/file management features needing download capability
- Hybrid storage systems (old + new schema)

**Key Learnings**:
- Server Actions: Nested arrays don't serialize properly (use API routes instead)
- RLS Bypass: Server-side API with service account solves permission issues
- Next.js Images: External domains require explicit remotePatterns whitelist
- Download UX: Browser download API (blob → object URL) works cross-browser
- Photo Storage: 2-tiered approach (uploaded_assets legacy + listings.images new)

---

### Google Maps Integration Pattern (v1.9)
**Problem**: Google Maps script should load only once, even with React re-renders

**Error Example**:
```
You have included the Google Maps JavaScript API multiple times on this page.
This may cause unexpected errors.
```

**Solution**: Singleton pattern with script existence check

```typescript
// components/listing/malta-map.tsx
'use client'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export default function MaltaMap({ listings }: { listings: Listing[] }) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    )

    if (existingScript) {
      // Script already loaded, just initialize map
      if (window.google?.maps) {
        setMapLoaded(true)
      } else {
        existingScript.addEventListener('load', () => setMapLoaded(true))
      }
      return
    }

    // Script doesn't exist, create it
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker`
    script.async = true
    script.defer = true
    script.addEventListener('load', () => setMapLoaded(true))
    document.head.appendChild(script)

    return () => {
      // Cleanup on unmount
      script.removeEventListener('load', () => setMapLoaded(true))
    }
  }, [])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return

    // Initialize map once
    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 35.8989, lng: 14.5146 }, // Malta center
      zoom: 10
    })
    
    mapInstanceRef.current = map
    
    // Add markers...
  }, [mapLoaded, listings])

  return <div ref={mapRef} className="w-full h-[600px]" />
}
```

**Marker Clustering by City**:
```typescript
// Group listings by city
const cityGroups = listings.reduce((acc, listing) => {
  if (!listing.city) return acc
  if (!acc[listing.city]) acc[listing.city] = []
  acc[listing.city].push(listing)
  return acc
}, {} as Record<string, Listing[]>)

// Create one marker per city
Object.entries(cityGroups).forEach(([city, cityListings]) => {
  const coords = MALTA_CITIES[city]
  if (!coords) return

  const hasAvailable = cityListings.some(l => l.availability === 'Available')
  const hasSoon = cityListings.some(l => l.availability === 'Soon')
  
  // Color-code marker based on listing types
  const markerColor = hasAvailable ? '#22c55e' : '#3b82f6' // green or blue

  const marker = new google.maps.marker.AdvancedMarkerElement({
    map,
    position: coords,
    title: `${city} (${cityListings.length} properties)`
  })

  // Info window with all listings in city
  const infoContent = `
    <div class="p-2">
      <h3 class="font-bold mb-2">${city}</h3>
      ${cityListings.map(l => `
        <div class="mb-1 p-1 ${l.availability === 'Available' ? 'bg-green-50' : 'bg-blue-50'}">
          <p class="text-sm font-semibold">${l.title}</p>
          <p class="text-xs text-gray-600">${l.availability}</p>
        </div>
      `).join('')}
    </div>
  `

  const infoWindow = new google.maps.InfoWindow({ content: infoContent })
  marker.addListener('click', () => infoWindow.open(map, marker))
})
```

**Malta City Coordinates (62 cities)**:
```typescript
const MALTA_CITIES: Record<string, { lat: number; lng: number }> = {
  'Valletta': { lat: 35.8989, lng: 14.5146 },
  'Sliema': { lat: 35.9122, lng: 14.5019 },
  'Gzira': { lat: 35.9058, lng: 14.4914 },
  // ... 59 more cities
}
```

**Environment Setup**:
```bash
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...your_key_here
```

**Key Design Decisions**:
1. **Script Loading**: Singleton check prevents duplicate loads
2. **Marker Strategy**: One marker per city (not per listing) for performance
3. **Color Coding**: Green for Available, Blue for Soon
4. **InfoWindow**: Shows all listings in clicked city
5. **Hardcoded Coords**: 62 Malta cities pre-mapped (alternative to geocoding API calls)

### Color-Coded Status UI Pattern (v1.9)
**Use Case**: Visual differentiation of availability states with soft, accessible colors

```typescript
// AvailabilitySelector component
const AVAILABILITY_OPTIONS = [
  { 
    value: 'Available', 
    label: 'Available', 
    color: 'bg-green-100 text-green-800 border-green-200'  // Soft green
  },
  { 
    value: 'Rented', 
    label: 'Rented', 
    color: 'bg-red-100 text-red-800 border-red-200'  // Soft red
  },
  { 
    value: 'Soon', 
    label: 'Soon', 
    color: 'bg-blue-100 text-blue-800 border-blue-200'  // Soft blue
  }
]

function AvailabilitySelector({ 
  currentValue, 
  listingId, 
  onUpdate 
}: { 
  currentValue: string
  listingId: number
  onUpdate: (id: number, newValue: string) => void 
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  const handleSelect = async (newValue: string) => {
    setIsOpen(false)
    await onUpdate(listingId, newValue)
  }

  const currentOption = AVAILABILITY_OPTIONS.find(opt => opt.value === currentValue)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1 rounded-md text-sm font-medium border ${currentOption?.color}`}
      >
        {currentOption?.label || 'Select'}
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 bg-white shadow-lg rounded-md">
          {AVAILABILITY_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`block w-full text-left px-3 py-2 text-sm ${option.color}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Integration with Teamwork System**:
```typescript
// actions.ts
export async function updateListingAvailability(
  listingId: number,
  newAvailability: 'Available' | 'Rented' | 'Soon'
) {
  const supabase = await createClient()
  
  // Update availability
  const { error } = await supabase
    .from('listings')
    .update({ availability: newAvailability })
    .eq('id', listingId)
  
  if (error) return { error }
  
  // Business logic: Remove from teamwork when marked as Rented
  if (newAvailability === 'Rented') {
    await supabase
      .from('teamwork_listings')
      .delete()
      .eq('listing_id', listingId)
  }
  
  return { error: null }
}
```

**Benefits**:
- Accessible color contrast (WCAG AA compliant)
- Consistent color language across application
- Business logic integration (teamwork cleanup)
- Soft colors reduce visual fatigue
- Clear state communication

### Mobile Responsive Table Pattern (v1.9)
**Use Case**: Complex data tables that need to work on screens from 320px to 1920px

**Breakpoint Strategy**:
```typescript
// Tailwind breakpoints
sm: 640px   // Small phones → tablets
md: 768px   // Tablets → small laptops
lg: 1024px  // Laptops → desktops
```

**Implementation Example (Viewings Calendar)**:
```typescript
// Table cells with responsive padding & font sizes
<td className="px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm">
  {content}
</td>

// Calendar grid with responsive heights
<div className="grid grid-cols-7 gap-1">
  {days.map(day => (
    <div className="h-16 sm:h-20 md:h-24 border rounded p-1">
      <div className="text-[10px] sm:text-xs font-semibold">
        {day.date}
      </div>
      <div className="text-[10px] sm:text-xs text-gray-600 mt-1">
        {day.events.map(event => (
          <div className="truncate">{event.title}</div>
        ))}
      </div>
    </div>
  ))}
</div>

// Navigation buttons with conditional text
<button className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm">
  <span className="hidden sm:inline">Previous</span>
  <span className="sm:hidden">Prev</span>
</button>

// Responsive table headers (hide on mobile)
<th className="hidden md:table-cell">Desktop-Only Column</th>
```

**Pattern Principles**:
1. **Progressive Enhancement**: Start mobile-first, add features for larger screens
2. **Consistent Spacing**: Use same breakpoint prefixes (sm:, md:) across components
3. **Font Scaling**: `text-[10px] → text-xs → text-sm → text-base`
4. **Padding Scaling**: `px-2 → px-3 → px-4`
5. **Conditional Rendering**: Hide non-critical columns/text on mobile
6. **Touch Targets**: Minimum 44×44px clickable areas on mobile

**Testing Checklist**:
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12/13)
- [ ] 390px (iPhone 14)
- [ ] 640px (Small tablet)
- [ ] 768px (iPad)
- [ ] 1024px (iPad Pro landscape)
- [ ] 1920px (Desktop)


