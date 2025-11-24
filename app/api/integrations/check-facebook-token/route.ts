import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

// Configure VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: Request) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const now = new Date();
    const notifications: string[] = [];

    // Facebook tokens expire after 60 days
    // Get all users with Facebook integration
    const { data: integrations, error: intError } = await supabase
      .from('users_integrations')
      .select('user_id, fb_token_updated_at, fb_page_id')
      .not('fb_access_token', 'is', null);

    if (intError) {
      console.error('Error fetching integrations:', intError);
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
    }

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({
        success: true,
        notifications_sent: 0,
        message: 'No Facebook integrations found',
        checked_at: now.toISOString(),
      });
    }

    for (const integration of integrations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { user_id, fb_token_updated_at } = integration as any;

      if (!fb_token_updated_at) {
        // If no update timestamp, skip (shouldn't happen with trigger)
        continue;
      }

      const tokenDate = new Date(fb_token_updated_at);
      const expiryDate = new Date(tokenDate);
      expiryDate.setDate(expiryDate.getDate() + 60); // Facebook tokens expire in 60 days

      const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Send notifications at 7 days, 3 days before expiry, and on expiry day
      if (daysUntilExpiry === 7) {
        await sendFacebookTokenNotification(user_id, {
          title: '⚠️ Facebook Token Expiring Soon',
          body: 'Your Facebook access token will expire in 7 days. Please refresh it to continue auto-posting.',
          icon: '/icons/Logo/192.png',
          badge: '/icons/Logo/96.png',
          tag: 'fb-token-expiry-7d',
          data: {
            type: 'fb_token_expiry',
            days_until_expiry: 7,
            url: '/dashboard/profile',
          },
        });
        notifications.push(`Facebook token 7-day warning sent to user ${user_id}`);
      } else if (daysUntilExpiry === 3) {
        await sendFacebookTokenNotification(user_id, {
          title: '⚠️ Facebook Token Expiring Soon',
          body: 'Your Facebook access token will expire in 3 days. Refresh it now to avoid interruption.',
          icon: '/icons/Logo/192.png',
          badge: '/icons/Logo/96.png',
          tag: 'fb-token-expiry-3d',
          data: {
            type: 'fb_token_expiry',
            days_until_expiry: 3,
            url: '/dashboard/profile',
          },
        });
        notifications.push(`Facebook token 3-day warning sent to user ${user_id}`);
      } else if (daysUntilExpiry === 0) {
        await sendFacebookTokenNotification(user_id, {
          title: '🚨 Facebook Token Expired Today',
          body: 'Your Facebook access token expires today! Refresh it immediately to continue auto-posting.',
          icon: '/icons/Logo/192.png',
          badge: '/icons/Logo/96.png',
          tag: 'fb-token-expired',
          data: {
            type: 'fb_token_expired',
            url: '/dashboard/profile',
          },
        });
        notifications.push(`Facebook token expiry alert sent to user ${user_id}`);
      } else if (daysUntilExpiry < 0) {
        // Token already expired - send critical alert
        const daysExpired = Math.abs(daysUntilExpiry);
        if (daysExpired <= 7) { // Only notify for first week after expiry
          await sendFacebookTokenNotification(user_id, {
            title: '❌ Facebook Token Expired',
            body: `Your Facebook access token expired ${daysExpired} day${daysExpired > 1 ? 's' : ''} ago. Auto-posting is disabled. Please refresh immediately.`,
            icon: '/icons/Logo/192.png',
            badge: '/icons/Logo/96.png',
            tag: 'fb-token-expired-past',
            data: {
              type: 'fb_token_expired',
              days_expired: daysExpired,
              url: '/dashboard/profile',
            },
          });
          notifications.push(`Facebook token expired alert sent to user ${user_id} (${daysExpired} days ago)`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      notifications_sent: notifications.length,
      details: notifications,
      checked_at: now.toISOString(),
    });
  } catch (error) {
    console.error('Error in Facebook token expiry check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendFacebookTokenNotification(userId: string, payload: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    
    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return;
    }

    // Send notification to all user's devices
    const notificationPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
      } catch (err) {
        // If subscription is invalid/expired, remove it
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', sub.endpoint);
        }
        console.error('Error sending notification:', err);
      }
    });

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error in sendFacebookTokenNotification:', error);
  }
}
