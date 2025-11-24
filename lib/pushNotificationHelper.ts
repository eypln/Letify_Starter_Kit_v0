/**
 * Push Notification Helper
 * Server-side utility for sending push notifications to all users except the sender
 */

import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

// Configure VAPID
if (
  process.env.VAPID_SUBJECT &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
}

/**
 * Send push notification to all users except the sender
 * @param excludeUserId - User ID to exclude from notifications (the sender)
 * @param payload - Notification content
 * @returns Number of successful sends
 */
export async function sendTeamworkNotification(
  excludeUserId: string,
  payload: NotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    const supabase = await createClient()

    // Get all push subscriptions except the sender's
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .neq('user_id', excludeUserId) // Exclude the sender

    if (error) {
      console.error('Error fetching push subscriptions:', error)
      return { sent: 0, failed: 0 }
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found (excluding sender)')
      return { sent: 0, failed: 0 }
    }

    console.log(
      `Sending teamwork notification to ${subscriptions.length} users (excluding sender ${excludeUserId})`
    )

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          }

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          )

          return { success: true, userId: sub.user_id }
        } catch (error) {
          const err = error as { statusCode?: number; message?: string }
          console.error(
            `Failed to send notification to user ${sub.user_id}:`,
            error
          )

          // Clean up expired/invalid subscriptions
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Removing expired subscription for user ${sub.user_id}`)
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id)
          }

          return { success: false, userId: sub.user_id, error }
        }
      })
    )

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - sent

    console.log(
      `Teamwork notification results: ${sent} sent, ${failed} failed`
    )

    return { sent, failed }
  } catch (error) {
    console.error('Error in sendTeamworkNotification:', error)
    return { sent: 0, failed: 0 }
  }
}

/**
 * Send viewing reminder notification to a specific user
 * @param userId - User ID to send notification to
 * @param payload - Notification content
 * @returns Success status
 */
export async function sendViewingReminder(
  userId: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching push subscriptions:', error)
      return false
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`)
      return false
    }

    console.log(`Sending viewing reminder to user ${userId}`)

    // Send to all user's subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          }

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          )

          return { success: true }
        } catch (error) {
          const err = error as { statusCode?: number; message?: string }
          console.error(`Failed to send reminder:`, error)

          // Clean up expired/invalid subscriptions
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Removing expired subscription`)
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id)
          }

          return { success: false, error }
        }
      })
    )

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value.success).length
    return sent > 0
  } catch (error) {
    console.error('Error in sendViewingReminder:', error)
    return false
  }
}
