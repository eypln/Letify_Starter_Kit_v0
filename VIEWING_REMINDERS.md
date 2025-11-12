# Viewing Reminders - Push Notification System

## Overview
Automatic push notification system for viewing reminders. Sends notifications to users at two key times before scheduled viewings.

## Features

### 1. **24-Hour Reminder**
- Sent 1 day (24 hours) before the scheduled viewing
- Helps user prepare and confirm with landlord/client
- Notification: "📅 Viewing Tomorrow - Reminder: You have a viewing scheduled tomorrow at [TIME] for [REF_NO]"

### 2. **2-Hour Reminder**
- Sent 2 hours before the scheduled viewing
- Last-minute reminder to prepare for the viewing
- Notification: "⏰ Viewing in 2 Hours - Don't forget: Viewing at [TIME] for [REF_NO] - [CITY]"

### 3. **Result Update Reminder**
- Sent 2 hours AFTER the scheduled viewing
- Reminds user to update the viewing result (DEAL, NO DEAL, Negotiating)
- Notification: "📝 Update Viewing Result - Please update the result for viewing: [REF_NO] in [CITY]"
- Only sent if result is still "Scheduled"

## Implementation

### Components

#### 1. **Push Notification Helper** (`lib/pushNotificationHelper.ts`)
New function added:
- `sendViewingReminder(userId, payload)` - Sends notification to specific user

#### 2. **Reminder Check API** (`app/api/viewings/check-reminders/route.ts`)
- Checks all scheduled viewings every hour
- Calculates time windows for reminders
- Sends appropriate notifications based on timing

#### 3. **Cron Configuration** (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/viewings/check-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```
- Runs every hour (at minute 0)
- Checks for viewings that need reminders

## How It Works

### Flow

1. **User Creates Viewing**
   - Sets viewing date and time
   - Sets result to "Scheduled"

2. **Hourly Check**
   - Cron job triggers `/api/viewings/check-reminders`
   - System fetches all viewings with result = "Scheduled"

3. **Time Window Detection**
   - For each viewing, calculates hours until viewing
   - If ~24 hours away (23-25 hours): Send 24-hour reminder
   - If ~2 hours away (1.9-2.1 hours): Send 2-hour reminder
   - If ~2 hours past viewing (1.9-2.1 hours after): Send result update reminder

4. **Notification Delivery**
   - Sends push notification to user's devices
   - User receives notification in browser/PWA
   - Notification includes viewing details

### Notification Details

**24-Hour Reminder:**
```typescript
{
  title: '📅 Viewing Tomorrow',
  body: 'Reminder: You have a viewing scheduled tomorrow at 14:30 for L123',
  icon: '/icons/Logo/192.png',
  tag: 'viewing-reminder-24h-456',
  data: {
    type: 'viewing_reminder',
    viewingId: 456,
    refNo: 'L123',
    timeWindow: '24h'
  }
}
```

**2-Hour Reminder:**
```typescript
{
  title: '⏰ Viewing in 2 Hours',
  body: 'Don't forget: Viewing at 14:30 for L123 - Sliema',
  icon: '/icons/Logo/192.png',
  tag: 'viewing-reminder-2h-456',
  data: {
    type: 'viewing_reminder',
    viewingId: 456,
    refNo: 'L123',
    clientName: 'John Doe',
    timeWindow: '2h'
  }
}
```

**Result Update Reminder (2 hours after viewing):**
```typescript
{
  title: '📝 Update Viewing Result',
  body: 'Please update the result for viewing: L123 in Sliema at 14:30',
  icon: '/icons/Logo/192.png',
  tag: 'viewing-update-456',
  data: {
    type: 'viewing_update_reminder',
    viewingId: 456,
    refNo: 'L123',
    city: 'Sliema',
    timeWindow: 'after_2h'
  }
}
```

## Usage

### For Users

1. **Create a Viewing**
   - Go to Viewings page
   - Click "+ Add" button
   - Fill in viewing details
   - Set result to "Scheduled"
   - Save

2. **Receive Reminders**
   - 24 hours before: Get notification to prepare
   - 2 hours before: Get final reminder
   - 2 hours after: Get reminder to update result
   - Click notification to open app

### For Developers

#### Manual Trigger (Testing)
```bash
curl https://your-domain.com/api/viewings/check-reminders
```

#### Check Logs
- Vercel Dashboard → Functions → check-reminders
- View execution logs and notification results

## Database Requirements

### Viewings Table Fields
- `user_id` - UUID of viewing owner
- `viewing_date` - Date (YYYY-MM-DD)
- `viewing_time` - Time (HH:MM:SS)
- `result` - Status ('Scheduled', 'DEAL', 'NO DEAL', 'Negotiating')
- `ref_no` - Property reference
- `city` - Location
- `client_name` - Client information

### Push Subscriptions Table
- `user_id` - UUID
- `endpoint` - Push endpoint URL
- `keys.p256dh` - Encryption key
- `keys.auth` - Auth secret

## Configuration

### Environment Variables Required
```env
VAPID_SUBJECT=mailto:your-email@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
```

### Vercel Deployment
1. Deploy to Vercel
2. Vercel automatically configures cron based on `vercel.json`
3. Cron runs hourly
4. Check Vercel Dashboard → Cron Jobs for status

## Time Windows Explained

### Why Time Windows?
Cron runs every hour, so we need to check if viewing falls within acceptable time ranges:

- **24-hour window**: 23-25 hours before viewing
  - Allows 1 hour before/after for cron timing
  - Ensures notification is sent once per day

- **2-hour window**: 1.9-2.1 hours before viewing
  - Tight window to prevent multiple notifications
  - Sends notification close to viewing time

- **2-hour after window**: 1.9-2.1 hours after viewing
  - Reminds user to update result
  - Only sent if result is still "Scheduled"

### Example Timeline

```
Viewing scheduled: Nov 12, 2025 14:30

Nov 11, 2025 14:00-15:00 → 24-hour reminder sent ✓
Nov 12, 2025 12:00-13:00 → 2-hour reminder sent ✓
Nov 12, 2025 14:30      → Viewing time
Nov 12, 2025 16:00-17:00 → Result update reminder sent ✓
```

## Benefits

1. **User Experience**
   - Never miss a viewing
   - Time to prepare and contact clients
   - Professional service

2. **Automatic**
   - No manual reminders needed
   - Works 24/7
   - Reliable delivery

3. **Scalable**
   - Handles multiple viewings
   - Works for all users
   - No performance impact

## Monitoring

### Success Metrics
Check API response:
```json
{
  "success": true,
  "message": "Viewing reminders checked",
  "totalViewings": 15,
  "sent": 3,
  "notifications": [
    { "viewingId": 123, "type": "24h", "refNo": "L456" },
    { "viewingId": 124, "type": "2h", "refNo": "L789" }
  ]
}
```

### Troubleshooting

**No notifications received?**
1. Check user has push subscription
2. Verify viewing result is "Scheduled"
3. Check viewing date/time are set
4. Verify cron is running (Vercel Dashboard)

**Multiple notifications?**
1. Check time window logic
2. Verify tag system prevents duplicates
3. Check cron schedule

## Future Enhancements

Potential improvements:
- [ ] Customizable reminder times
- [ ] SMS reminders as backup
- [ ] Email reminders
- [x] Reminder to update result after viewing (Completed - sends 2 hours after viewing)
- [ ] Weekly summary of upcoming viewings

## Related Files

- `lib/pushNotificationHelper.ts` - Notification sender
- `app/api/viewings/check-reminders/route.ts` - Cron handler
- `app/dashboard/viewings/page.tsx` - Viewing management
- `vercel.json` - Cron configuration

## Created
November 12, 2025

## Version
1.0.0
