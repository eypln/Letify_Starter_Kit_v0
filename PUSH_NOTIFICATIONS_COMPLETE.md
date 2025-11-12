# Complete Push Notification System

This document provides a comprehensive overview of all push notification systems implemented in Letify.

## Table of Contents
1. [Viewing Reminders](#viewing-reminders)
2. [Team Collaboration Notifications](#team-collaboration-notifications)
3. [System Alerts](#system-alerts)
4. [Commission Reminders](#commission-reminders)
5. [Facebook Token Expiry Alerts](#facebook-token-expiry-alerts)
6. [Team Leader & Boss Notifications](#team-leader--boss-notifications)
7. [Technical Setup](#technical-setup)
8. [Testing](#testing)

---

## 1. Viewing Reminders

### Overview
Automated reminders for scheduled property viewings.

### Notification Types

#### 24-Hour Before Reminder
- **Trigger**: 23-25 hours before viewing
- **Title**: "🏠 Viewing Tomorrow"
- **Content**: Includes ref_no, city, and viewing time
- **Action**: Opens viewing details

#### 2-Hour Before Reminder
- **Trigger**: 1.9-2.1 hours before viewing
- **Title**: "⏰ Viewing Soon"
- **Content**: Includes ref_no, city, and viewing time
- **Action**: Opens viewing details

#### Result Update Reminder
- **Trigger**: 1.9-2.1 hours after viewing (if result still "Scheduled")
- **Title**: "📝 Update Viewing Result"
- **Content**: Reminds to update viewing outcome
- **Action**: Opens viewing details

### Implementation
- **Endpoint**: `/api/viewings/check-reminders`
- **Schedule**: Every hour (`0 * * * *`)
- **File**: `app/api/viewings/check-reminders/route.ts`

### Example Timeline
```
Viewing scheduled: May 15, 2025 at 14:00

May 14, 14:00 → 24h reminder sent
May 15, 12:00 → 2h reminder sent
May 15, 16:00 → Result update reminder sent (if not updated)
```

---

## 2. Team Collaboration Notifications

### Overview
Real-time notifications when teammates share listings or clients, and when agents inform team leaders about viewings.

### Notification Types

#### Listing Shared
- **Trigger**: When agent shares listing to teamwork
- **Title**: "🏠 New Property Listing Shared"
- **Content**: Agent name, city, property type, bedrooms, price
- **Action**: Opens teamwork page
- **Recipients**: All other users (excludes sender)

**Example**:
```
"John Doe shared a property in Istanbul - Apartment, 3 bed, €250,000"
```

#### Client Shared
- **Trigger**: When agent shares client to teamwork
- **Title**: "👥 New Client Shared"
- **Content**: Agent name, people count, bedrooms, budget, cities
- **Action**: Opens teamwork page
- **Recipients**: All other users (excludes sender)

**Example**:
```
"Jane Smith shared a client: 4 people, 3 bed, Budget: €300,000, Cities: Istanbul, Ankara"
```

#### Team Leader Viewing Notification (NEW)
- **Trigger (Create)**: When agent creates viewing with "Inform Team Leader" checkbox enabled
- **Title (Create)**: "📅 New Viewing Scheduled"
- **Content (Create)**: Agent name, property ref, city, viewing date
- **Trigger (Update)**: When agent updates viewing result AND "Inform Team Leader" checkbox is enabled
- **Title (Update)**: "✅ Viewing Result Updated"
- **Content (Update)**: Agent name, property ref, city, new result
- **Action**: Opens viewings page
- **Recipients**: All users with 'teamleader' role
- **Additional**: Email notification also sent

**Example (Create)**:
```
"John Doe scheduled a viewing for L123 in Istanbul on 2025-11-15"
```

**Example (Update)**:
```
"John Doe updated viewing result for L123 in Istanbul - Result: DEAL"
```

**Important**: Update notifications are sent ONLY when the result field changes (e.g., from "Scheduled" to "DEAL", "NO DEAL", or "Negotiating"), not for other field updates.

**Valid Result Values**:
- `Scheduled` - Initial state when viewing is created
- `Negotiating` - Client is interested, negotiation in progress
- `DEAL` - Successfully closed deal
- `NO DEAL` - Client not interested or deal fell through

**Notification Trigger Examples**:
- ✅ Scheduled → DEAL (Notification sent)
- ✅ Scheduled → NO DEAL (Notification sent)
- ✅ Scheduled → Negotiating (Notification sent)
- ✅ Negotiating → DEAL (Notification sent)
- ✅ Negotiating → NO DEAL (Notification sent)
- ❌ Scheduled → Scheduled (No notification - same value)
- ❌ Only comments updated (No notification - result unchanged)
- ❌ Only viewing_time updated (No notification - result unchanged)

### Implementation
- **Endpoints**: 
  - `/api/teamwork/listings/share`
  - `/api/teamwork/clients/share`
  - `/api/viewings` (POST and PUT methods)
- **Function**: `sendTeamworkNotification()` in `lib/pushNotificationHelper.ts`
- **Function**: `sendTeamLeaderNotification()` in `app/api/viewings/route.ts`
- **Triggered**: On-demand when user clicks "Share to Teamwork" or enables "Inform Team Leader"

---

## 3. System Alerts

### Overview
Proactive notifications about subscription and credit status.

### Notification Types

#### Subscription Expiry Warnings
- **3 Days Before**: "⚠️ Subscription Expiring Soon - 3 days remaining"
- **1 Day Before**: "⚠️ Subscription Expiring Soon - 1 day remaining"
- **Expiry Day**: "🚨 Subscription Expired - Renew now to restore access"

#### Low Credit Balance Alerts
- **Trigger Points**: When credits reach 5 or 0
- **5 Credits**: "⚠️ Low Credit Balance - 5 credits remaining"
- **0 Credits**: "❌ No Credits Remaining - Purchase more to continue"

### Implementation
- **Endpoint**: `/api/system/check-alerts`
- **Schedule**: Daily at 8 AM (`0 8 * * *`)
- **File**: `app/api/system/check-alerts/route.ts`
- **Action**: Opens billing page

### Configuration
```typescript
const subscriptionAlerts = [3, 1, 0]; // Days before expiry
const creditAlerts = [5, 0]; // Credit thresholds
```

---

## 4. Commission Reminders

### Overview
Timely reminders for important revenue milestones.

### Notification Types

#### Contract Signing Reminders

**24 Hours Before**
- **Trigger**: 23-25 hours before date_signed
- **Title**: "📝 Contract Signing Tomorrow"
- **Content**: Client name, property ref, commission amount
- **Action**: Opens revenue page

**8 AM on Signing Day**
- **Trigger**: 8 AM on date_signed
- **Title**: "📝 Contract Signing Today!"
- **Content**: Client name, property ref, commission amount
- **Action**: Opens revenue page

#### Move-In Reminders

**24 Hours Before**
- **Trigger**: 23-25 hours before date_move_in
- **Title**: "🏠 Move-In Tomorrow"
- **Content**: Client name, property ref, commission amount
- **Action**: Opens revenue page

**8 AM on Move-In Day**
- **Trigger**: 8 AM on date_move_in
- **Title**: "🏠 Move-In Today!"
- **Content**: Client name, property ref, commission amount
- **Action**: Opens revenue page

### Implementation
- **Endpoint**: `/api/revenue/check-commission-reminders`
- **Schedule**: Every hour (`0 * * * *`)
- **File**: `app/api/revenue/check-commission-reminders/route.ts`

### Example Timeline
```
Deal created with:
- date_signed: June 1, 2025
- date_move_in: June 15, 2025

May 31, 08:00 → 24h contract signing reminder
June 1, 08:00 → Contract signing today reminder
June 14, 08:00 → 24h move-in reminder
June 15, 08:00 → Move-in today reminder
```

---

## 5. Facebook Token Expiry Alerts

### Overview
Critical notifications to prevent Facebook integration failures due to expired tokens.

### Background
Facebook access tokens expire after **60 days**. When the token expires, automatic posting to Facebook stops working. These notifications ensure users refresh their token before it expires.

### Notification Types

#### 7 Days Before Expiry
- **Trigger**: 7 days before 60-day expiry
- **Title**: "⚠️ Facebook Token Expiring Soon"
- **Content**: "Your Facebook access token will expire in 7 days. Please refresh it to continue auto-posting."
- **Action**: Opens profile page (Facebook Integration section)

#### 3 Days Before Expiry
- **Trigger**: 3 days before expiry
- **Title**: "⚠️ Facebook Token Expiring Soon"
- **Content**: "Your Facebook access token will expire in 3 days. Refresh it now to avoid interruption."
- **Action**: Opens profile page

#### Expiry Day
- **Trigger**: On the 60th day
- **Title**: "🚨 Facebook Token Expired Today"
- **Content**: "Your Facebook access token expires today! Refresh it immediately to continue auto-posting."
- **Action**: Opens profile page

#### Already Expired (1-7 days past)
- **Trigger**: 1-7 days after expiry
- **Title**: "❌ Facebook Token Expired"
- **Content**: "Your Facebook access token expired [X] days ago. Auto-posting is disabled. Please refresh immediately."
- **Action**: Opens profile page

### Implementation
- **Endpoint**: `/api/integrations/check-facebook-token`
- **Schedule**: Daily at 8 AM (`0 8 * * *`)
- **File**: `app/api/integrations/check-facebook-token/route.ts`

### Database Changes
- **New Column**: `users_integrations.fb_token_updated_at`
- **Trigger**: Auto-updates timestamp when `fb_access_token` changes
- **Migration**: `supabase_migration_fb_token_expiry.sql`

### Example Timeline
```
Token updated: January 1, 2025

January 1  → Token saved, fb_token_updated_at set
February 24 → 7-day warning (53 days elapsed)
February 28 → 3-day warning (57 days elapsed)
March 2     → Expiry day notification (60 days)
March 3-9   → Daily "already expired" alerts
March 10+   → No more alerts (user should have fixed it)
```

### Why This Matters
- **Business Critical**: Without valid token, listings don't auto-post to Facebook
- **Revenue Impact**: No Facebook posts = fewer leads = lost revenue
- **User Experience**: Timely warnings prevent sudden service interruption

---

## 6. Team Leader & Boss Notifications

### Overview
Instant notifications to team leaders and bosses for critical business events.

### Team Leader Viewing Notifications

#### New Viewing Created
- **Trigger**: Agent creates viewing with "Inform Team Leader" checkbox enabled
- **Title**: "👥 New Viewing Scheduled"
- **Content**: Shows property ref, client name, and viewing date/time
- **Action**: Opens viewing details

#### Viewing Result Updated
- **Trigger**: Agent updates viewing result when "Inform Team Leader" is enabled
- **Smart Filtering**: Only sends when `result` field actually changes (not on comment/time updates)
- **Title**: "📝 Viewing Result Updated"
- **Content**: Shows property ref, client name, and new result
- **Action**: Opens viewing details

**Valid Result Values** (per database CHECK constraint):
- `DEAL` - Successful viewing, deal made
- `NO DEAL` - Viewing completed, no agreement
- `Negotiating` - Currently in negotiation phase
- `Scheduled` - Viewing scheduled but not yet completed

### Boss Revenue Completion Notifications

#### Both Sides Paid
- **Trigger**: Both `landlord_paid_date` AND `client_paid_date` are filled + "Inform Boss After Both Sides Paid" checkbox enabled
- **Title**: "💰 Revenue Completed"
- **Content**: Shows agent name and property ref (ref_no)
- **Action**: Opens revenue page
- **Delivery**: Both email AND push notification sent simultaneously
- **Recipients**: All users with role 'Boss' **AND** all users with role 'teamleader' (both groups receive notification)
- **One-Time Only**: `boss_notified` flag prevents duplicate notifications

### Implementation
- **Team Leader Viewing**: `app/api/viewings/route.ts`
- **Boss & Team Leader Revenue**: `app/api/revenue/route.ts`
- **Trigger Type**: Instant (real-time on data change)
- **Recipients**: Filtered by `profiles.role` IN ('teamleader', 'Boss')

### Anti-Spam Features
- **Team Leader**: Only notifies on result changes, not on every viewing update
- **Boss**: Single notification per revenue completion via `boss_notified` flag
- **Smart Filtering**: No constant notifications, only on critical state changes

---

## 7. Technical Setup

### Environment Variables
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_vapid_key
VAPID_PRIVATE_KEY=your_private_vapid_key
CRON_SECRET=your_vercel_cron_secret
```

### Vercel Cron Configuration
```json
{
  "crons": [
    {
      "path": "/api/viewings/check-reminders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/system/check-alerts",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/revenue/check-commission-reminders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/integrations/check-facebook-token",
      "schedule": "0 8 * * *"
    }
  ]
}
```

### Cron Schedule Syntax
- `0 * * * *` = Every hour at minute 0
- `0 8 * * *` = Every day at 8:00 AM
- `*/15 * * * *` = Every 15 minutes

### Database Tables

#### push_subscriptions
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### viewings (relevant columns)
```sql
viewing_date DATE
viewing_time TIME
result VARCHAR (default: 'Scheduled')
```

#### profiles (relevant columns)
```sql
subscription_end_date DATE
credits INTEGER
```

#### revenue (relevant columns)
```sql
date_signed DATE
date_move_in DATE
client_name VARCHAR
property_ref VARCHAR
commission_amount VARCHAR
```

#### users_integrations (relevant columns)
```sql
fb_access_token TEXT
fb_token_updated_at TIMESTAMPTZ -- Auto-updated when token changes
```

---

## Testing

### Local Testing

#### 1. Test Push Notification Subscription
```typescript
// In browser console
navigator.serviceWorker.ready.then(registration => {
  registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
  }).then(subscription => {
    console.log('Subscribed:', subscription);
  });
});
```

#### 2. Test Individual Endpoints

**Viewing Reminders**:
```bash
curl -X GET http://localhost:3000/api/viewings/check-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**System Alerts**:
```bash
curl -X GET http://localhost:3000/api/system/check-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Commission Reminders**:
```bash
curl -X GET http://localhost:3000/api/revenue/check-commission-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Facebook Token Expiry**:
```bash
curl -X GET http://localhost:3000/api/integrations/check-facebook-token \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### 3. Test Teamwork Notifications
- Create a listing/client
- Click "Share to Teamwork"
- Check other user accounts for notification

#### 4. Test Team Leader Viewing Notification
- Create a viewing with "Inform Team Leader" checkbox enabled
- Check team leader account for:
  - Push notification (New Viewing Scheduled)
  - Email notification
- Update the viewing's **result field** (e.g., from "Scheduled" to "DEAL" or "NO DEAL")
- Verify team leader receives:
  - Push notification (Viewing Result Updated)
  - Email notification
- Update other fields (e.g., comments, time) without changing result
- Verify NO notification is sent (result-based trigger)

### Production Testing

#### Monitor Cron Execution
1. Go to Vercel Dashboard → Project → Deployments
2. Click on deployment → Functions
3. Check cron function logs
4. Verify execution times and results

#### Verify Notifications
1. Create test data with appropriate dates/times
2. Wait for cron to execute
3. Check browser notifications on subscribed devices
4. Verify notification content and links

---

## Troubleshooting

### Common Issues

#### Notifications Not Received
1. Check user has granted notification permission
2. Verify push subscription exists in database
3. Check service worker registration
4. Verify VAPID keys are correct
5. Check cron execution logs in Vercel

#### Duplicate Notifications
1. Verify time windows don't overlap
2. Check cron schedule frequency
3. Ensure proper deduplication logic

#### Missing Data in Notifications
1. Verify database fields are populated
2. Check null/undefined handling
3. Validate data joins in queries

### Debug Commands

**Check Push Subscriptions**:
```sql
SELECT user_id, created_at 
FROM push_subscriptions 
WHERE user_id = 'USER_ID';
```

**Check Upcoming Viewings**:
```sql
SELECT viewing_date, viewing_time, result
FROM viewings
WHERE viewing_date >= CURRENT_DATE
ORDER BY viewing_date, viewing_time;
```

**Check Subscription Status**:
```sql
SELECT user_id, subscription_end_date, credits
FROM profiles
WHERE subscription_end_date IS NOT NULL;
```

**Check Revenue Dates**:
```sql
SELECT client_name, date_signed, date_move_in, commission_amount
FROM revenue
WHERE date_signed >= CURRENT_DATE OR date_move_in >= CURRENT_DATE;
```

**Check Facebook Token Status**:
```sql
SELECT user_id, fb_token_updated_at, 
       fb_token_updated_at + INTERVAL '60 days' as expiry_date,
       EXTRACT(DAY FROM (fb_token_updated_at + INTERVAL '60 days') - NOW()) as days_until_expiry
FROM users_integrations
WHERE fb_access_token IS NOT NULL;
```

---

## Future Enhancements

### Planned Features
1. **Customizable Notification Preferences**
   - User settings for which notifications to receive
   - Custom timing for reminders
   - Notification frequency controls

2. **Rich Notifications**
   - Action buttons (Snooze, Complete, View Details)
   - Images for property listings
   - Interactive elements

3. **Email Notifications**
   - Fallback for users without push enabled
   - Daily digest option
   - Critical alerts via email

4. **Analytics**
   - Track notification delivery rates
   - Measure user engagement
   - Optimize timing based on user behavior

5. **Smart Scheduling**
   - Respect user's timezone
   - Avoid late-night notifications
   - Learn optimal notification times per user

6. **Additional Notification Types**
   - New client inquiries
   - Price changes on watched properties
   - Market updates for specific areas
   - Document expiry reminders
   - Birthday reminders for clients

---

## Support

For issues or questions:
1. Check this documentation
2. Review Vercel cron logs
3. Inspect browser console for errors
4. Test with curl commands
5. Verify database data integrity

## Version History

- **v1.0** (Initial) - Viewing reminders
- **v1.1** - Team collaboration notifications (listing/client sharing)
- **v1.2** - System alerts (subscription & credits)
- **v1.3** - Commission reminders (signing & move-in)
- **v1.4** (November 12, 2025) - Facebook token expiry alerts (60-day cycle)
- **v1.5** (November 12, 2025) - Team leader viewing notifications (instant alerts on create/update)
- **v1.6** (November 12, 2025) - Boss revenue completion notifications (email + push on both sides paid)

## Notification Summary

### Total Notification Types: 19

**Scheduled (Cron Jobs)**:
1. Viewing 24h before reminder
2. Viewing 2h before reminder
3. Viewing 2h after result reminder
4. Subscription expiry (3 days)
5. Subscription expiry (1 day)
6. Subscription expiry (day of)
7. Low credits (5 remaining)
8. No credits (0 remaining)
9. Commission - signing 24h before
10. Commission - signing day 8 AM
11. Commission - move-in 24h before
12. Commission - move-in day 8 AM
13. Facebook token (7 days before)
14. Facebook token (3 days before)
15. Facebook token (expiry day)
16. Facebook token (1-7 days after)

**Instant (Real-Time)**:
17. Team leader - new viewing created
18. Team leader - viewing result updated
19. Boss - revenue both sides paid

