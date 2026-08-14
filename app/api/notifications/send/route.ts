import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/supabase'
import webpush from 'web-push'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'

type DbPushSubscription = Database['public']['Tables']['push_subscriptions']['Row']

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  userId?: string
}

const leadershipRoles = ['admin', 'manager', 'teamleader', 'boss']

export async function POST(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, RateLimitPresets.STRICT)
  if (rateLimitResult) return rateLimitResult

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload: NotificationPayload = await req.json()
    const { title, body, icon, badge, tag, data, userId } = payload
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('user_id', user.id)
      .single()
    const canBroadcast = profile?.status !== 'denied' && leadershipRoles.includes(profile?.role || '')

    if (!canBroadcast && !userId) {
      return NextResponse.json({ error: 'A recipient is required' }, { status: 400 })
    }

    if (!canBroadcast && userId && userId !== user.id) {
      const { data: recipient } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('user_id', userId)
        .maybeSingle()
      const allowed = recipient?.status !== 'denied' && leadershipRoles.includes(recipient?.role || '')
      if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@letify.cloud'
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'Push notifications not configured on server' }, { status: 500 })
    }
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    let query = supabase.from('push_subscriptions').select('*')
    if (userId) query = query.eq('user_id', userId)

    const { data: subscriptions, error: fetchError } = await query
    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions found', sent: 0 }, { status: 200 })
    }

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-72x72.png',
      tag: tag || 'letify-notification',
      data: data || {},
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: DbPushSubscription) => {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          }, notificationPayload)
          return { success: true, endpoint: sub.endpoint }
        } catch (error) {
          const err = error as { statusCode?: number; message?: string }
          console.error('Error sending to subscription:', error)
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
          return { success: false, endpoint: sub.endpoint, error: err.message || 'Unknown error' }
        }
      })
    )

    const successful = results.filter((result) => result.status === 'fulfilled' && result.value.success).length
    return NextResponse.json({
      message: 'Notifications sent',
      total: subscriptions.length,
      sent: successful,
      failed: subscriptions.length - successful,
    })
  } catch (error) {
    console.error('Error in /api/notifications/send:', error)
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const testPayload: NotificationPayload = {
      title: 'Test Notification 🔔',
      body: 'This is a test push notification from Letify!',
      icon: '/icons/icon-192x192.png',
      tag: 'test-notification',
      userId: user.id,
      data: { url: '/dashboard', timestamp: new Date().toISOString() },
    }

    const response = await fetch(new URL('/api/notifications/send', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })
    return NextResponse.json(await response.json())
  } catch (error) {
    console.error('Error in GET /api/notifications/send:', error)
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}
