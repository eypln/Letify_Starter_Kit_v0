# System Patterns: Letify

## Sistem Mimarisi

### Genel Yapı
- **Frontend**: Next.js 15 App Router, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Payments**: Stripe (Subscriptions + One-time payments)
- **Automation**: N8N (Workflow orchestration)
- **State Management**: Zustand + React Query
- **Styling**: Tailwind CSS + Radix UI components

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
- Server Components için server-side data fetching
- Client Components için React Query + Supabase client
- Optimistic updates ve error handling
- Real-time subscriptions (Supabase realtime)

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