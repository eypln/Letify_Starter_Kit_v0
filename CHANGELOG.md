# Changelog - Letify

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2025-01-08

### Added
- **Database Backup & Recovery System**: Comprehensive backup solution without Supabase Pro
  - Automated daily backups via Vercel Cron (2 AM UTC)
  - Client-side Supabase backup approach using SDK queries
  - Encrypted JSON export with AES-GCM 256-bit encryption
  - 30-day automatic retention policy with cleanup
  - Manual backup script: `npm run backup`
  - Interactive restore script: `npm run restore`
  - Restore latest backup: `npm run restore:latest`
  - List backups: `npm run backup:list`
  - 14 core tables backed up (profiles, listings, clients, viewings, revenue, etc.)
- **Backup Security Features**:
  - Web Crypto API encryption (AES-GCM algorithm)
  - CRON_SECRET authentication for Vercel endpoint
  - BACKUP_ENCRYPTION_KEY for secure backup files
  - Automatic cleanup of backups older than 30 days
- **Documentation**: Complete BACKUP_RECOVERY.md guide
  - Setup instructions with environment variables
  - Usage examples for all npm scripts
  - Disaster recovery procedures
  - Security best practices
  - Troubleshooting guide

### Changed
- **Vercel Cron Jobs**: Added 5th cron job for database backup
  - Endpoint: `/api/cron/backup`
  - Schedule: Daily at 2 AM UTC (`0 2 * * *`)
  - Max duration: 300 seconds (5 minutes)
- **Environment Configuration**: Added backup-related variables
  - CRON_SECRET (Vercel cron authentication)
  - BACKUP_ENCRYPTION_KEY (32-character AES key)
- **Git Configuration**: Excluded backup files from version control
  - `backups/` directory
  - `*.sql` files
  - `backup-*.json` files

### Technical Details
- Backup format: `backup-YYYYMMDD-HHMMSS.json`
- Storage: Local `backups/` directory
- Encryption: AES-GCM with 12-byte IV and 16-byte authentication tag
- Restore: Interactive CLI with confirmation prompt ("RESTORE" keyword)

## [2.4.0] - 2025-12-08

### Added
- **Password Reset System**: Complete forgot password flow with email-based reset
  - `/forgot-password` page with email input form
  - `/reset-password` page with token validation and new password form
  - API endpoint: `POST /api/auth/reset-password`
  - "Forgot Password?" link on sign-in page
  - Dynamic redirect URL based on environment (localhost/production)
  - Invalid/expired token error handling
- **Dynamic Version Display**: Homepage shows version from package.json
  - Auto-updates when package.json version changes
  - Positioned below Start button with subtle gray styling

### Fixed
- **Vercel Analytics Debug Mode**: Added explicit mode prop to prevent console errors
  - Fixed TypeError: Cannot read properties of undefined (reading 'length')
  - Conditional mode based on NODE_ENV (production/development)

### Changed
- Environment variables: Added `NEXT_PUBLIC_SITE_URL` for password reset redirects

## [2.3.0] - 2025-12-08

### Added
- **Boss Dashboard**: Complete dashboard with 5 main cards
  - Profile, Teamwork, Team Viewings, Team Revenue, Reports, Notifications
  - UI consistency with Manager dashboard
  - RBAC security on all boss routes
- **Agent Payment Management**: New payment status tracking system
  - "Agent Payment" column in Boss Team Revenue table
  - Pending/Paid dropdown with inline status updates
  - Agent notification system: "Agency fee sent for {ref_no}"
  - Push notifications to agents when payment status changes to Paid
  - Database migration: `agent_payment_status` column with CHECK constraint
  - API endpoint: `POST /api/revenue/notify-agent-payment`
- **EditDealModal Sync**: Boss edits sync bidirectionally to agent's revenue page

## [2.2.1] - 2025-12-08

### Added
- **Manager Notifications Page**: 6th dashboard card with deal-only filtering
- **Edit Deal Functionality**: Available for Teamleader & Manager (team revenue pages)
- **Deal Finalized Notifications**: Multi-channel system (Push + UI + Email)
- **Agent Revenue Form Validation**: 6 required fields enforcement
- **Push Notification Improvements**: Enhanced messages with emojis

### Changed
- VAT Type default changed to "Non-Vatable (32%)"
- Database: `vat_type` column with TEXT and CHECK constraint
- RLS policies updated for elevated user permissions

## [2.2.0] - 2025-12-08

### Added
- **Manager Dashboard**: Complete dashboard implementation
  - 5 main cards: Profile, Teamwork, Team Viewings, Team Revenue, Reports
  - Manager-specific pages (monitoring only, no add/edit functions)
  - RBAC security on all manager routes
  - Dashboard URL routing for all roles
- **UI Refinements**:
  - Phone validation fix (optional field, 7+ digits)
  - Facebook integration removed from manager profile
  - Simplified viewing records table (removed Ref No & Client Mobile No)
  - Source map warnings suppressed in development

## [2.1.0] - 2025-12-06

### Added
- **Role-Based Access Control (RBAC) System**: Complete implementation
  - Server-side route protection (`/dashboard` - agent only)
  - Client-side route protection (`/teamleader` - teamleader only)
  - Shared pages with role-aware navigation (8 pages)
  - Custom access-denied page with role-based redirect
- **Team Leader Dashboard**: 8-card main dashboard layout
  - Team Viewings page (own viewings + team table)
  - Team Revenue page (own deals + team table)
  - Notifications page (activity log with filtering)
- **Admin Panel Enhancement**: User management improvements
  - Approved users table with block/unblock functionality
  - Color-coded role badges (admin, boss, teamleader, manager, agent)
  - Blocked users management with unblock functionality
- **Next.js 16.0.7 Security Migration**: CVE-2025-55182 (React2Shell) vulnerability patched

### Fixed
- Critical bug: `eq('user_id', user.id)` for profile queries (prevented redirect loops)
- Button disabled state to prevent redirect loops

### Added Documentation
- `RBAC_SECURITY.md` - Complete security architecture documentation
- Memory Bank updated with RBAC patterns
- Test scenarios documented and verified

## [2.0.0] - 2025-12-01

### Added
- **Photo Management System**: Complete photo handling overhaul
  - Edit Dialog Photo Display: Existing photos visible with thumbnail grid
  - Download Functionality: Click to download photos to device
  - Migration API: Server-side photo migration from uploaded_assets
  - Photo Grid UI: Download (blue) + Delete (red) buttons per photo
  - RLS Bypass: Server-side API solves client permission issues
- **Next.js Image Configuration**: Supabase storage domains configured
  - remotePatterns for **.supabase.co

### Fixed
- Production Build: 91 pages, 0 warnings, 0 errors
- Debug Cleanup: Console logs removed, TypeScript types fixed

### Technical
- Migration API: `/api/migrate-listing-photos` (POST endpoint)
- Photo Grid: next/image + Lucide icons (Download, X)
- Download Flow: fetch → blob → object URL → programmatic click
- Database: 2-tiered storage (uploaded_assets legacy + listings.images)

---

## Version History Summary

**v2.x - Enterprise Features & Security (Dec 2025)**
- v2.4.0: Password Reset System + Dynamic Version Display
- v2.3.0: Boss Dashboard + Agent Payment Management
- v2.2.1: Manager Notifications + Deal Management
- v2.2.0: Manager Dashboard Implementation
- v2.1.0: RBAC System + Admin Panel + Next.js 16 Security
- v2.0.0: Photo Management System

**v1.x - Advanced Features (Nov 2025)**
- v1.9: Availability Tracking + Malta Maps
- v1.8: PWA Implementation Final
- v1.7: BotID Security Integration
- v1.6: Push Notifications Advanced
- v1.5: Performance Optimization
- v1.4: SEO Optimization
- v1.3: Testing Suite
- v1.2: Teamwork Feature
- v1.1: Advanced Features (Viewings, Revenue, Analytics)
- v1.0: MVP Launch

---

**Current Version**: v2.4.0 (08.12.2025)
