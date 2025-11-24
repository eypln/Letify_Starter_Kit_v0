/**
 * Push Notifications Utilities
 * Web Push API integration for PWA notifications
 */

import { createClient } from '@/lib/supabase/client'

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

/**
 * Check if browser supports push notifications
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported in this browser')
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission denied. Please enable in browser settings.')
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Subscribe user to push notifications
 * Returns the subscription object to save in database
 */
export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null
  }

  try {
    // Request permission first
    const permission = await requestNotificationPermission()
    
    if (permission !== 'granted') {
      return null
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      return subscription
    }

    // Subscribe to push
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
    
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    })

    return subscription
  } catch (error) {
    console.error('Error subscribing to push:', error)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      return true
    }

    return false
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
    return false
  }
}

/**
 * Save push subscription to database
 */
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth')),
      },
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Error saving subscription:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving push subscription:', error)
    return false
  }
}

/**
 * Send a local notification (doesn't require service worker)
 */
export async function sendLocalNotification(
  payload: NotificationPayload
): Promise<void> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported')
    return
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted')
    return
  }

  const { title, body, icon, badge, tag, data } = payload

  const notification = new Notification(title, {
    body,
    icon: icon || '/icons/icon-192x192.png',
    badge: badge || '/icons/icon-72x72.png',
    tag: tag || 'letify-notification',
    data,
    requireInteraction: false,
    silent: false,
  })

  notification.onclick = (event) => {
    event.preventDefault()
    window.focus()
    notification.close()

    // Navigate to relevant page if data contains URL
    if (data?.url && typeof data.url === 'string') {
      window.location.href = data.url
    }
  }
}

/**
 * Test notification (for debugging)
 */
export async function sendTestNotification(): Promise<void> {
  await sendLocalNotification({
    title: 'Letify Notification',
    body: 'Push notifications are working! 🎉',
    icon: '/icons/icon-192x192.png',
    tag: 'test-notification',
    data: {
      url: '/dashboard',
    },
  })
}

// ====== Helper Functions ======

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}
