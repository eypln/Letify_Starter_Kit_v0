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