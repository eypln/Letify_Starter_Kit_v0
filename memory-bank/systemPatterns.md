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