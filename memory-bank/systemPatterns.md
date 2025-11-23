# System Patterns: Letify

## Sistem Mimarisi

### Genel Yapı
- **Frontend**: Next.js 15 App Router, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Payments**: Stripe (Subscriptions + One-time payments)
- **Automation**: N8N (Workflow orchestration)
- **State Management**: Zustand + React Query
- **Styling**: Tailwind CSS + Native HTML (Radix UI removed from Dashboard for performance)
- **Performance**: Lighthouse-optimized (Dashboard: Performance 86, TBT 160ms)

### Component Architecture
```
App (Next.js)
├── Layout (Authentication, Navigation)
├── Pages
│   ├── Public (Sign-in, Sign-up, Home)
│   ├── Protected (Dashboard, Profile, etc.)
│   └── API Routes (Stripe webhooks, N8N callbacks)
├── Components
│   ├── UI (Reusable components)
│   ├── Feature-specific (Upload, Billing, etc.)
│   └── Layout (Header, Sidebar, etc.)
└── Lib
    ├── Supabase (Client/Server)
    ├── Stripe (Configuration)
    ├── Utils (Helpers)
    └── Validation (Zod schemas)
```

## Ana Teknik Kararlar

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


