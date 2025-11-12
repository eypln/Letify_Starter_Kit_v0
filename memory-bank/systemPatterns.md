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
