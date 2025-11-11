# Active Context: Letify

## Mevcut Çalışma Odağı

### Ana Odak Alanları
1. **Performance Optimization**: Dashboard performans optimizasyonu - Lighthouse score 51 → 86
2. **Server Component Migration**: Client-side fetching'den server-side rendering'e geçiş
3. **UI Component Optimization**: Radix UI'dan native HTML'e migration (205 KiB unused JS eliminated)
4. **Viewings Feature**: Property viewing tracking, calendar view, team leader notifications
5. **Teamwork Feature**: Listing ve client paylaşım sistemi, takım iş birliği
6. **UI Consistency**: Dashboard butonları, pagination stilleri, tablo görünümleri
7. **Post Limitleri & Subscription Control**: Free plan'daki post limitleri (30/ay) ve reels üretimi kontrolü
8. **Analytics & Monthly Activity Tracking**: Aylık post, client ve viewing ekleme aktivitesi analizi
9. **Kod Bütünlüğü ve Memory Bank**: Proje karmaşıklığını yönetmek için memory bank sistemi

## Son Değişiklikler (Tarih Sırası)

### 11.11.2025 - Dashboard Performance Optimization - MAJOR SUCCESS ✅
**Problem**: Dashboard Lighthouse performance score 51, TBT 10,050ms
**Hedef**: Performance score 75+, TBT < 1,000ms
**Sonuç**: Performance 86, TBT 160ms (-98% improvement!)

#### 1. **Radix UI → Native HTML Migration** ✅
**Kaldırılan Komponentler:**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogClose`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Button` (tüm varyantlar)

**Native Replacements:**
```jsx
// Dialog → Native Modal
{showReminder && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
      {/* Content */}
    </div>
  </div>
)}

// Card → Native Div
<div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow">
  <div className="p-6 pb-4">
    <h3 className="text-2xl font-semibold leading-none tracking-tight">Title</h3>
    <p className="text-sm text-muted-foreground mt-2">Description</p>
  </div>
  <div className="p-6 pt-0">{/* Content */}</div>
</div>

// Button → Native Button
<button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors">
  Click me
</button>
```

**Results:**
- Unused JavaScript: -205 KiB
- Dialog component: 163.3 KiB (53.0 KiB unused) → 0
- Button component: 50.6 KiB (49.9 KiB unused) → 0
- Card component: 40.6 KiB (37.7 KiB unused) → 0
- Performance: 51 → 57 (+6 points)

#### 2. **Server Component Migration** ✅
**Changes in `app/dashboard/page.tsx`:**
```typescript
// NEW: Server-side data fetching
async function fetchDashboardStats(userId: string) {
  const supabase = await createClient()
  
  // Parallel queries - all server-side
  const [listingsTotal, listingsMonth, clientsTotal, clientsMonth, 
         viewingsTotal, viewingsMonth, activities] = await Promise.all([
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }).gte('created_at', firstDayISO),
    // ... 5 more parallel queries
  ])
  
  return { totalListings, sharesThisMonth, totalClients, ... }
}

// Pass stats as prop
<DashboardClient user={user} profile={profile} stats={stats} />
```

**Changes in `app/dashboard/DashboardClient.tsx`:**
```typescript
// REMOVED: All client-side useEffect data fetching
// REMOVED: useState for data states
// REMOVED: createClient import

// NEW: Receive stats as prop
interface DashboardStats {
  totalListings: number;
  sharesThisMonth: number;
  totalClients: number;
  clientsThisMonth: number;
  totalViewings: number;
  viewingsThisMonth: number;
  recentActivities: any[];
}

export default function DashboardClient({ user, profile, stats }: { 
  user: any; profile: any; stats: DashboardStats 
})

// Use stats directly (no loading states needed)
<span>{stats.sharesThisMonth}</span>
```

**Benefits:**
- No client-side data fetching
- No loading states needed
- Faster initial render
- Better SEO (data in HTML)
- Reduced JavaScript execution
- Server-side caching possible

**Results:**
- Bundle size: 344 kB → 343 kB (-1 kB)
- Component size: 4.17 kB → 3.67 kB (-0.5 kB)
- TBT (dev mode): 10,240ms → 8,060ms
- Dev mode performance: 57 → 41 (temporary regression due to dev overhead)

#### 3. **Production Build Optimization** ✅
**Command**: `pnpm run build && pnpm run start`

**Production Results:**
- **Performance: 86** 🟢 (+35 from initial 51, +45 from dev 41)
- **FCP: 0.9s** ✅ (consistent)
- **LCP: 3.8s** ✅ (was 20.6s in dev, -16.8s!)
- **TBT: 160ms** ✅ (was 10,050ms initially, -98% reduction!)
- **CLS: 0** 🟢 (perfect)
- **Speed Index: ~2s** ✅
- **Accessibility: 93** 🟢
- **Best Practices: 100** 🟢
- **SEO: 100** 🟢

#### 4. **Config Cleanup** ✅
**Removed deprecated `experimental.turbo`:**
```javascript
// REMOVED from next.config.js
experimental: {
  turbo: {
    rules: {
      '*.css': { loaders: ['css-loader'], as: '*.css' }
    }
  }
}
```
**Reason**: Next.js 15 deprecation, no longer needed

#### 5. **useToast Hook Replacement** ✅
**Problem**: `useToast` required ToastProvider (Radix UI dependency)
**Solution**: Replace with native `alert()`
```typescript
// BEFORE
const { toast } = useToast()
toast({ title: 'Error', description: error.message, variant: 'destructive' })

// AFTER
alert('Logout failed: ' + (error.message || 'An error occurred during logout'))
```

### Key Learnings

#### Performance Optimization Strategy
1. **Development vs Production**: Always test in production mode
   - Dev mode: Performance 41 (hot reload, source maps, no minification)
   - Production: Performance 86 (optimized, minified, cached)
   
2. **Component Library Trade-offs**:
   - Radix UI: 205 KiB unused JavaScript for Dashboard
   - Native HTML + Tailwind: 0 KiB overhead, better performance
   - Choose native for performance-critical pages

3. **Server Component Benefits**:
   - Eliminates client-side data fetching
   - Reduces JavaScript bundle size
   - Improves LCP and TBT significantly
   - Better for SEO and initial load

4. **Metrics Hierarchy**:
   - **TBT (Total Blocking Time)**: Most impactful for performance score
   - **LCP (Largest Contentful Paint)**: Critical for user perception
   - **FCP (First Contentful Paint)**: Important but less weighted
   - **CLS (Cumulative Layout Shift)**: Easy to optimize

### Technical Debt & Future Considerations
- ✅ Dashboard optimized (Performance: 86)
- ⚠️ Other pages still using Radix UI (consider migration if performance issues)
- ⚠️ Toast notifications using alert (consider custom toast implementation)
- ✅ Production build required for accurate performance testing
- ✅ Server Components pattern established for future pages

### 10.11.2025 - Viewings Feature - Complete Implementation ✅
**Yeni Features:**
1. **Viewings System - Full CRUD with Calendar** ✅
   - **Database Schema**: `viewings` tablosu (14 fields)
   - **Migration**: `supabase_migration_2025_11_viewings.sql`
   - **RLS Policies**: Users can only see their own viewings
   - **API Endpoints**:
     - `/api/viewings` - GET (paginated), POST, PUT, DELETE
     - `/api/viewings/listings-suggestions` - Autocomplete for ref_no
     - `/api/viewings/clients-suggestions` - Autocomplete for client_name
   - **Email Notifications**: Team leader notifications when inform_teamleader checked

2. **Viewings Page Features** ✅
   - **Table View**: 30 records/page pagination
   - **Columns**: #, Created Date, Ref No, City, Viewing Date, Viewing Time, Client Name, Client Mobile No, Result, Comments, Inform Teamleader
   - **Add/Edit Modal**: Popup form with autocomplete and auto-fill
   - **Calendar View**: 3-month horizontal scroll calendar (previous, current, next)
   - **Click to Edit**: Row click opens edit modal

3. **Form Features** ✅
   - **Autocomplete Fields**:
     - Ref No: From listings.title (CreatableSelect)
     - Client Name: From clients.name (CreatableSelect)
   - **Auto-Fill**:
     - City: Auto-fills from selected listing
     - Phone: Auto-fills from selected client
   - **Time Selection**: Dropdown 07:00-21:00 in 15-min intervals (00, 15, 30, 45)
   - **Date Picker**: React-DatePicker with dd.MM.yyyy format
   - **Result Dropdown**: 4 options (DEAL, NO DEAL, Negotiating, Scheduled)
   - **Custom Validation**: English validation messages (no Turkish)

4. **Calendar Integration** ✅
   - **3-Month View**: Previous, current, next month
   - **Daily Viewings**: All viewings displayed on their viewing_date
   - **Color Coding**: Result-based colors
     - DEAL → Green
     - NO DEAL → Red
     - Negotiating → Blue
     - Scheduled → Yellow
   - **Viewing Cards**: Show #ID, time, ref_no
   - **Today Highlight**: Purple background for current day
   - **Click to Edit**: Calendar cards open edit modal

5. **Email Notification System** ✅
   - **Nodemailer Integration**: SMTP email sending
   - **HTML Templates**: Styled email with viewing details
   - **Team Leader Filter**: Only sends to users with role='teamleader'
   - **Trigger**: When inform_teamleader checkbox is true
   - **Email Content**: Viewing details, client info, property info
   - **SMTP Config**: `.env.local` configuration

6. **Dashboard Integration** ✅
   - **Quick Stats**:
     - Viewings This Month
     - Total Viewings
   - **Recent Activities**:
     - new_viewing_added
     - viewing_updated
   - **Activity Display**: Shows ref_no and client_name
   - **Last 7 Activities**: Increased from 5 to 7

7. **Analytics Integration** ✅
   - **New Chart**: "Monthly Activity: Viewings"
   - **X-Axis**: Days (Day 1 to Day 30/31)
   - **Y-Axis**: Viewing count
   - **Data**: Current month's daily viewing counts
   - **Position**: Bottom of analytics page (2-column span)

**Database Schema:**
```sql
-- viewings table
CREATE TABLE viewings (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  ref_no TEXT,
  city TEXT,
  viewing_date DATE,
  viewing_time TIME,
  client_name TEXT,
  client_mobile_no TEXT,
  result TEXT CHECK (result IN ('DEAL', 'NO DEAL', 'Negotiating', 'Scheduled')),
  comments TEXT,
  inform_teamleader BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
- SELECT: Users see only their viewings
- INSERT: Users create viewings for themselves
- UPDATE: Users update only their viewings
- DELETE: Users delete only their viewings
```

**Değiştirilen/Yeni Dosyalar:**
- `supabase_migration_2025_11_viewings.sql`: NEW - Database migration
- `app/api/viewings/route.ts`: NEW - Main CRUD API
- `app/api/viewings/listings-suggestions/route.ts`: NEW - Autocomplete
- `app/api/viewings/clients-suggestions/route.ts`: NEW - Autocomplete
- `lib/email.ts`: NEW - Email utilities (sendEmail, generateViewingNotificationEmail)
- `SMTP_CONFIG.txt`: NEW - SMTP configuration guide
- `.env.local.example`: SMTP config added
- `app/dashboard/viewings/page.tsx`: Complete rewrite - Full functional component
- `app/dashboard/DashboardClient.tsx`: 
  - viewingsThisMonth state
  - totalViewings state
  - Fetch viewings stats
  - Recent Activities: new_viewing_added, viewing_updated
  - 7 activities (increased from 5)
- `app/dashboard/analytics/page.tsx`:
  - dailyViewings state
  - Fetch daily viewings data
  - Monthly Activity: Viewings chart
- `package.json`: nodemailer 7.0.9 dependency

**Technical Details:**
- **Viewing Time Format**: HH:MM (saniye olmadan)
  - Database: TIME format (19:00:00)
  - UI Display: substring(0, 5) → "19:00"
- **Pagination**: 30 records per page
- **Activity Logging**: POST/PUT operations log to activity table
- **Email**: Async, non-blocking
- **Form Validation**: HTML5 + custom messages

**Known Issues & Solutions:**
- ✅ TIME field formatting: substring(0, 5) for display
- ✅ React-Select required validation: Hidden input field hack
- ✅ Autocomplete auto-fill: onChange handlers update dependent fields

### 10.11.2025 - Teamwork Feature & UI Standardization ✅
**Yeni Features:**
1. **Teamwork System - Complete Implementation** ✅
   - **3 Yeni Sayfa**: Teamwork, Viewings, Revenue
   - **Database Schema**: `teamwork_listings` ve `teamwork_clients` tabloları
   - **Migration**: `supabase/migrations/20250110_teamwork_tables.sql`
   - **Share Buttons**: Listings ve Clients sayfalarında paylaşım butonları
   - **API Endpoints**: 
     - `/api/teamwork/listings/share` - Listing paylaşımı
     - `/api/teamwork/listings/route` - Paylaşılan listingleri getir
     - `/api/teamwork/clients/share` - Client paylaşımı
     - `/api/teamwork/clients/route` - Paylaşılan clientları getir

2. **Teamwork Page Features** ✅
   - **2 Tablo**: Teamwork Listings ve Teamwork Clients
   - **Pagination**: Her tabloda 10 item/sayfa
   - **Popup Modals**: Description ve Jobs sütunları için
   - **Agent Name Resolution**: Profile lookup ile agent ismi gösterimi
   - **Teamwork Date**: Paylaşım tarihi tracking
   - **Kolonlar**:
     - Listings: City, Price, Bedroom, Bathroom, Property Type, Description, Agent
     - Clients: Name, People, Bedroom, Cities, Family/Sharing, Nationalities, Jobs, Pet, Budget

3. **UI Consistency - Dashboard Buttons** ✅
   - **Tüm Sayfalarda Standart Dashboard Butonu**:
     - Teamwork, Viewings, Revenue, Clients, Listings
   - **Konum**: Tablonun dış köşesinde (sağ üst)
   - **Stil**: Grid icon (SVG), rounded-xl border, hover:bg-purple-50
   - **Pozisyon**: `absolute -top-10 right-0` (tablonun üstünde)

4. **UI Consistency - Pagination** ✅
   - **Shadcn Button Komponenti**: Tüm sayfalarda tutarlı
   - **Stil**: `variant="outline" size="sm"`
   - **Navigation**: First, Prev, [Sayfa Numaraları], Next, Last
   - **Active State**: Aktif sayfa için `variant="default"`
   - **Uygulandığı Sayfalar**: Teamwork, Listings, Clients

5. **Recent Activities Enhancement** ✅
   - **Listing Share**: Reference number gösterimi
   - **Client Share**: Client name gösterimi
   - **Activity Types**: 
     - `teamwork_listing_shared`
     - `teamwork_client_shared`

6. **Dashboard Quick Stats Update** ✅
   - **"Shares This Month" → "Posts This Month"**: UI label değişikliği
   - Fonksiyonel değişiklik yok, sadece görsel iyileştirme

**Database Schema:**
```sql
-- teamwork_listings table
- id (bigserial PK)
- listing_id (uuid FK -> listings.id)
- agent_user_id (uuid FK -> auth.users.id)
- agent_name (text)
- teamwork_date (timestamptz)
- city, price, bedroom, bathroom, property_type, description

-- teamwork_clients table
- id (bigserial PK)
- client_id (bigint FK -> clients.id)
- agent_user_id (uuid FK -> auth.users.id)
- agent_name (text)
- teamwork_date (timestamptz)
- client_name, people, bedroom, cities, family_sharing, 
  nationalities, jobs, pet, budget
```

**RLS Policies:**
- Herkes paylaşılan itemları görebilir (authenticated users)
- Sadece owner insert/delete yapabilir

**Değiştirilen/Yeni Dosyalar:**
- `app/dashboard/teamwork/page.tsx`: NEW - Teamwork ana sayfa
- `app/dashboard/teamwork/TeamworkClient.tsx`: NEW - İki tablo, pagination, modals
- `app/dashboard/viewings/page.tsx`: NEW - Viewings skeleton
- `app/dashboard/viewings/ViewingsClient.tsx`: NEW - Calendar integration placeholder
- `app/dashboard/revenue/page.tsx`: NEW - Revenue skeleton
- `app/dashboard/revenue/RevenueClient.tsx`: NEW - Financial tracking placeholder
- `app/api/teamwork/listings/share/route.ts`: NEW - Listing share endpoint
- `app/api/teamwork/listings/route.ts`: NEW - Get shared listings
- `app/api/teamwork/clients/share/route.ts`: NEW - Client share endpoint
- `app/api/teamwork/clients/route.ts`: NEW - Get shared clients
- `app/dashboard/DashboardClient.tsx`: 
  - Euro icon eklendi (DollarSign → Euro)
  - 3 yeni kart: Teamwork, Viewings, Revenue
  - Recent Activities: reference_no ve client_name gösterimi
  - Quick Stats: "Posts This Month" label update
- `app/dashboard/listings/page.tsx`: 
  - TeamworkShareButton eklendi
  - Dashboard button standardization
  - Pagination shadcn Button update
- `app/dashboard/clients/page.tsx`: 
  - ClientTeamworkShareButton eklendi
  - Jobs popup modal
  - Dashboard button standardization
  - Pagination shadcn Button update
  - Tablo spacing fix (mt-8)
- `components/ui/table.tsx`: NEW - Shadcn Table component
- `supabase/migrations/20250110_teamwork_tables.sql`: Database migration

**Teknik Detaylar:**
- **Event Propagation**: Share ve Jobs butonlarında `e.stopPropagation()` ile row click çakışması önlendi
- **Profile Lookup**: `profiles.user_id = auth.users.id` ile agent ismi çözümleme
- **Client-side Pagination**: `Array.slice()` ile sayfalama
- **Modal Pattern**: Dialog component ile nested clickable elements

---

### 09.11.2025 - Error Boundaries & Comprehensive Error Handling ✅
**Yeni Features:**
1. **React Error Boundary Component** ✅
   - File: `components/system/ErrorBoundary.tsx`
   - English UI: "Oops! Something Went Wrong"
   - Retry button with user recovery option
   - Development mode: detailed stack trace display
   - Error counter: tracks recurring errors
   - Production-ready: prepared for external logging (Sentry, LogRocket etc)

2. **API Error Handler Middleware** ✅
   - File: `lib/errorHandler.ts`
   - Consistent API response format: `{success, error, data}`
   - Error type detection: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR
   - `withErrorHandler()` wrapper function
   - `validateRequestBody()` and `createErrorResponse()` utilities

3. **Client-side Error Display Components** ✅
   - File: `components/system/ErrorDisplay.tsx`
   - `ErrorDisplay` component: 3 variants (inline, toast, modal)
   - `useError()` hook: Error state management
   - `AsyncOperation` wrapper: automatic error handling for async operations

4. **Root Layout Integration** ✅
   - `app/layout.tsx`: ErrorBoundary wrapped around ErrorShield
   - Import structure: `ErrorBoundary > ErrorShield > Children`
   - Production-ready error UI with graceful fallback

5. **Existing Error Handling** ✅
   - `app/api/stripe/webhook/route.ts`: Already has comprehensive try-catch and error logging
   - Error recovery: Graceful fallbacks, detailed console logging
   - Environment validation: Warnings for missing variables

**Değiştirilen Dosyalar:**
- `components/system/ErrorBoundary.tsx`: NEW - React Error Boundary
- `components/system/ErrorDisplay.tsx`: NEW - Client error display UI
- `lib/errorHandler.ts`: NEW - API error handling middleware
- `app/layout.tsx`: ErrorBoundary integration

---

### 09.11.2025 - Post Limit & Analytics Session ✅
**Yeni Features:**
1. **Post Limit System** ✅
   - Free plan kullanıcıları: Max 30 post/ay
   - `user_post_usage` tablosu oluşturuldu (migration: `2025_11_user_post_usage.sql`)
   - Step 3'te post tamamlandığında sayaç otomatik güncelleniyor
   - Limit aşıldığında orange uyarı gösteriliyor

2. **Subscription Kontrol** ✅
   - Free plan kullanıcıları Step 4'e (Reels) geçemiyorlar
   - Next butonu disabled: `userPlan !== 'free'` kontrolü
   - Tooltip: "Upgrade to a paid plan to create reels"

3. **UI Iyileştirmeleri** ✅
   - **View Post Tooltip**: Post başarısız olduğunda "Update Facebook Access Token" mesajı
   - **Quick Tips**: "Make sure that your access token is active" eklendi
   - **Analytics Başlığı**: "Analytics" → "Portfolio Analysis"
   - **Monthly Activity Chart**: "Clients Added" → "Clients"

4. **Analytics Enhancements** ✅
   - Listings tablosundan aylık post sayıları
   - Clients tablosundan aylık client sayıları
   - GroupedBarChart ile Posts vs Clients karşılaştırma
   - Geçmiş ayları görerek trend analizi

5. **Dashboard Updates** ✅
   - Quick Stats: "Shares This Month" listings tablosundan çekiliyor
   - Dinamik sayaçlar her sayfa yüklenmesinde refresh

**Değiştirilen Dosyalar:**
- `components/wizard/step3-post.tsx`: Post limit, tooltip, uyarı, free plan kontrolü
- `app/dashboard/subscription/page.tsx`: Free plan 30 limit, "Usage This Month" dinamik
- `app/dashboard/subscription/useBillingController.ts`: `monthlyPostUsage` state eklendi
- `app/dashboard/analytics/page.tsx`: Monthly activity chart, Portfolio Analysis başlığı
- `app/dashboard/DashboardClient.tsx`: Dashboard Quick Stats güncellendi
- `app/dashboard/new-post/page.tsx`: Quick Tips eklenti
- `supabase/migrations/2025_11_user_post_usage.sql`: Yeni tablo migration

---

### Önceki Sessions (Tarihsel)
- **Image Upload & Compression**: 15 görsele kadar, client-side compression, Supabase Storage
- **Stripe Integration**: Subscriptions, credits, webhooks
- **N8N Workflows**: Automation, webhook callbacks
- **Client Management**: CRUD operations, dashboard
- **Activity Logging**: Event tracking ve audit trails

## Sonraki Adımlar

### Kısa Vadeli (1-2 hafta)
1. **Error Boundaries**: Comprehensive error handling implement et
2. **Testing Setup**: Unit ve integration test'leri kur
3. **Reels Feature**: Step 4-5 reels üretimi ve paylaşımı
4. **Email Notifications**: Post shared, subscription emails

### Orta Vadeli (1-3 ay)
1. **Advanced Analytics**: Export features, detailed reports
2. **Performance Optimization**: Bundle analysis, lazy loading
3. **Multi-language Support**: i18n implementation
4. **API Rate Limiting**: Usage limits ve quota management

### Uzun Vadeli (3-6 ay)
1. **AI Integration**: Automated captions, optimal posting times
2. **Social Media Expansion**: LinkedIn, TikTok, Instagram Threads support
3. **Team Collaboration**: Multi-user accounts, permission management
4. **API for Partners**: Third-party integration capabilities
5. **Mobile App**: Native iOS/Android applications
6. **Advanced Scheduling**: Queue management, auto-posting strategies

### Tamamlanan Görevler (Yapıldı) ✅
- Image upload and compression feature
- Stripe billing integration
- N8N workflow integration
- Dashboard analytics and statistics
- Client management system
- Activity logging
- Post limit system (09.11.2025)
- Monthly analytics tracking (09.11.2025)
- Error Boundaries & comprehensive error handling (09.11.2025)

## Aktif Kararlar ve Değerlendirmeler

### Technical Decisions

- **Next.js 15 Adoption**: Latest features ve performance improvements
- **Supabase Choice**: Full-stack BaaS solution for rapid development
- **Stripe Integration**: Battle-tested payment processing
- **N8N Workflows**: Flexible automation without vendor lock-in

### Design Decisions
- **Component Library**: Radix UI for accessibility ve consistency
- **Color Scheme**: Purple-based theme for modern look
- **Responsive Design**: Mobile-first approach
- **Toast Notifications**: Non-intrusive user feedback

### Business Decisions
- **Pricing Model**: Tiered subscriptions + credit system
- **Target Market**: SMBs ve freelance social media managers
- **Feature Prioritization**: Core workflow optimization

## Önemli Pattern'ler ve Tercihler

### Code Patterns
- **Server Components**: Data fetching için tercih et
- **Client Components**: Interactivity için
- **Custom Hooks**: Logic reuse için
- **Zod Schemas**: Type safety ve validation için

### Naming Conventions
- **Components**: PascalCase (DashboardClient)
- **Files**: kebab-case (image-compress.ts)
- **Functions**: camelCase (getUserProfile)
- **Database**: snake_case (user_profiles)

### Error Handling
- **Try-catch**: Async operations için
- **Error Boundaries**: React error boundaries
- **Toast Messages**: User-friendly error display
- **Logging**: Comprehensive error logging

## Öğrenmeler ve Proje İçgörüleri

### Technical Learnings
- Supabase RLS policies complex ama powerful
- Image compression client-side çok effective
- Stripe webhooks reliable ama testing zor
- N8N workflows flexible ama documentation limited

### User Experience Insights
- Drag-drop upload intuitive ama feedback critical
- Subscription complexity user confusion yaratabilir
- Real-time updates engagement artırır
- Mobile responsiveness essential

### Process Insights
- Feature flags gradual rollout için useful
- Automated testing early implementation'da critical
- Documentation code changes ile sync tutulmalı
- User feedback iteration için essential

### Performance Insights
- Image compression 60-80% size reduction sağlar
- React Query caching significant UX improvement
- Bundle splitting load times optimize eder
- Database indexes query performance dramatically artırır