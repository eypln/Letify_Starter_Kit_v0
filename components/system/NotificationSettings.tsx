'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  savePushSubscription,
} from '@/lib/notifications'
import { Bell, BellOff, Check } from 'lucide-react'

interface NotificationSettingsProps {
  userId: string
}

export default function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [mounted, setMounted] = useState(false)

  // Auto-clear success messages after 5 seconds
  useEffect(() => {
    if (message?.type === 'success') {
      const timer = setTimeout(() => {
        setMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const checkSubscriptionStatus = async () => {
    if (!isPushSupported()) return

    try {
      // Wait for service worker to be ready with shorter timeout
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Service Worker timeout')), 5000)
        )
      ]) as ServiceWorkerRegistration
      
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
      
      // Clear any previous error messages when checking status
      setMessage(null)
    } catch (error) {
      console.error('Error checking subscription:', error)
      // Don't set error message on initial check, just log it
    }
  }

  useEffect(() => {
    setMounted(true)
    
    console.log('[NotificationSettings] Component mounted', { 
      userId,
      isPushSupported: isPushSupported(),
      vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'Present' : 'Missing'
    })
    
    // Clear any previous messages on mount
    setMessage(null)
    
    // Check initial permission status
    setPermission(getNotificationPermission())

    // Check subscription status
    if (userId) {
      checkSubscriptionStatus()
    }
  }, [userId])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Bell className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Push Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Get notified about new listings, viewings, and revenue updates
            </p>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const handleEnableNotifications = async () => {
    if (!userId) {
      setMessage({ type: 'error', text: 'Please sign in to enable notifications' })
      return
    }

    // Get VAPID key from environment
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      setMessage({ type: 'error', text: 'Push notifications not configured. Please contact support.' })
      console.error('VAPID_PUBLIC_KEY not found in environment variables')
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      console.log('[handleEnableNotifications] Starting with userId:', userId)
      const subscription = await subscribeToPush(vapidKey)
      console.log('[handleEnableNotifications] Subscribe result:', subscription)

      if (subscription) {
        // Save to database
        console.log('[handleEnableNotifications] Saving subscription...')
        const saved = await savePushSubscription(userId, subscription)
        console.log('[handleEnableNotifications] Save result:', saved)

        if (saved) {
          setIsSubscribed(true)
          setPermission('granted')
          setMessage({ type: 'success', text: 'Notifications enabled successfully! You can test it using "Send Test" button.' })
        } else {
          setMessage({ type: 'error', text: 'Failed to save notification settings to database' })
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to enable notifications. Permission may be blocked.' })
      }
    } catch (err) {
      const error = err as Error;
      console.error('[handleEnableNotifications] Error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to enable notifications' });
    } finally {
      setLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const unsubscribed = await unsubscribeFromPush()

      if (unsubscribed) {
        // Delete from database
        if (userId) {
          const supabase = createClient()
          await supabase.from('push_subscriptions').delete().eq('user_id', userId)
        }

        setIsSubscribed(false)
        setMessage({ type: 'success', text: 'Notifications disabled' })
      } else {
        setMessage({ type: 'error', text: 'Failed to disable notifications' })
      }
    } catch {
      console.error('Error disabling notifications:')
      setMessage({ type: 'error', text: 'Failed to disable notifications' })
    } finally {
      setLoading(false)
    }
  }

  // Check if push is supported (only after mount to avoid hydration issues)
  const pushSupported = mounted && isPushSupported()

  if (mounted && !pushSupported) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <div className="flex items-start gap-3">
          <BellOff className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900">Push Notifications Not Supported</h3>
            <p className="text-sm text-gray-600 mt-1">
              Your browser doesn&apos;t support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Bell className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-none tracking-tight">Push Notifications</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get notified about new listings, viewings, and revenue updates
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 pt-0 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isSubscribed ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-sm font-medium">
              {isSubscribed ? 'Notifications Enabled' : 'Notifications Disabled'}
            </span>
          </div>
          {permission === 'denied' && (
            <span className="text-xs text-red-600">
              Permission blocked - enable in browser settings
            </span>
          )}
        </div>

        {/* Benefits */}
        <div className="space-y-2">
          <p className="text-sm font-medium">You&apos;ll receive notifications for:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              New property-client added for teamwork
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Upcoming viewings reminders
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Revenue and commission updates
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Subscription and credit alerts
            </li>
          </ul>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : message.type === 'warning'
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!isSubscribed ? (
            <button
              onClick={handleEnableNotifications}
              disabled={loading || permission === 'denied'}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enabling...' : 'Enable Notifications'}
            </button>
          ) : (
            <button
              onClick={handleDisableNotifications}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/40 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Disabling...' : 'Disable'}
            </button>
          )}
        </div>

        {/* Browser Permission Info */}
        {permission === 'denied' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Permission blocked:</strong> To enable notifications, please:
            </p>
            <ol className="text-sm text-yellow-700 mt-2 ml-4 list-decimal space-y-1">
              <li>Click the lock icon in your browser&apos;s address bar</li>
              <li>Find &quot;Notifications&quot; in the permissions list</li>
              <li>Change it to &quot;Allow&quot;</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
