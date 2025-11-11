# Tech Context: Letify

## Teknoloji Stack

### Frontend
- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript 5.x
- **UI Library**: React 19.1.1
- **Styling**: Tailwind CSS 3.x + PostCSS
- **Component Library**: Radix UI primitives (being migrated to native HTML for performance)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Date Handling**: date-fns
- **PWA**: next-pwa 5.6.0 (Service Worker, Offline Support, Push Notifications)
- **Push Notifications**: web-push 3.6.7 (VAPID authentication, browser notifications)

### Backend & Database
- **Backend-as-a-Service**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Edge Functions**: Supabase Edge Runtime

### Payments & Automation
- **Payment Processor**: Stripe 18.5.0
- **Webhook Handler**: Stripe Webhooks
- **Workflow Engine**: N8N
- **API Integration**: REST + Webhooks

### State Management & Data Fetching
- **Global State**: Zustand 5.0.8
- **Server State**: TanStack React Query 5.90.2
- **Form State**: React Hook Form 7.50.1
- **Validation**: Zod 3.22.4

### Development Tools
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Code Formatting**: Prettier (implied)
- **Type Checking**: TypeScript
- **Testing**: Jest (planned)
- **Build Tool**: Next.js built-in

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
SUPABASE_SERVICE_ROLE=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# N8N
N8N_WEBHOOK_BASE=
N8N_STATUS_CALLBACK_SECRET=

# App
NEXT_PUBLIC_WEBAPP_URL=

# Push Notifications (11.11.2025)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@letify.cloud
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
- lucide-react: Icons
- tailwind-merge: Class merging
- clsx: Conditional classes
- react-select: Select components
- react-datepicker: Date picker

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
- Vercel for frontend
- Supabase for backend
- Stripe for payments
- N8N for workflows