import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/supabase'
import webpush from 'web-push'

// Type alias for our database push subscription
type DbPushSubscription = Database['public']['Tables']['push_subscriptions']['Row']

// Configure web-push with VAPID keys
// Generate keys with: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@letify.cloud'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, any>
  userId?: string // If provided, send to specific user, otherwise send to all
}

/**
 * POST /api/notifications/send
 * Send push notification to user(s)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const payload: NotificationPayload = await req.json()
    const { title, body, icon, badge, tag, data, userId } = payload

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      )
    }

    // Check if web-push is configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'Push notifications not configured on server' },
        { status: 500 }
      )
    }

    // Get subscriptions
    let query = supabase.from('push_subscriptions').select('*')

    // If userId provided, send to specific user only
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: subscriptions, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No active subscriptions found', sent: 0 },
        { status: 200 }
      )
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-72x72.png',
      tag: tag || 'letify-notification',
      data: data || {},
    })

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: DbPushSubscription) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          }

          await webpush.sendNotification(pushSubscription, notificationPayload)
          return { success: true, endpoint: sub.endpoint }
        } catch (error: any) {
          console.error('Error sending to subscription:', error)

          // If subscription is expired/invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          }

          return { success: false, endpoint: sub.endpoint, error: error.message }
        }
      })
    )

    // Count successful sends
    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length

    return NextResponse.json({
      message: 'Notifications sent',
      total: subscriptions.length,
      sent: successful,
      failed: subscriptions.length - successful,
    })
  } catch (error: any) {
    console.error('Error in /api/notifications/send:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/send (for testing)
 * Send test notification to authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Send test notification
    const testPayload: NotificationPayload = {
      title: 'Test Notification 🔔',
      body: 'This is a test push notification from Letify!',
      icon: '/icons/icon-192x192.png',
      tag: 'test-notification',
      userId: user.id,
      data: {
        url: '/dashboard',
        timestamp: new Date().toISOString(),
      },
    }

    // Use POST logic
    const response = await fetch(new URL('/api/notifications/send', req.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    })

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in GET /api/notifications/send:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
