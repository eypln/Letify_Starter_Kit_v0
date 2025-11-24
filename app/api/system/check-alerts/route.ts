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

    // Check subscription expiry for all users
    const { data: subscriptions, error: subError } = await supabase
      .from('billing_subscriptions')
      .select('user_id, current_period_end, status')
      .in('status', ['active', 'trialing']);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
    } else if (subscriptions && subscriptions.length > 0) {
      for (const subscription of subscriptions) {
        const { user_id, current_period_end } = subscription;
        const expiryDate = new Date(current_period_end);
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Send notifications at 3 days, 1 day before expiry, and on expiry day
        if (daysUntilExpiry === 3 || daysUntilExpiry === 1) {
          await sendSystemNotification(user_id, {
            title: '⚠️ Subscription Expiring Soon',
            body: `Your subscription will expire in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}. Renew now to continue using all features.`,
            icon: '/icons/Logo/192.png',
            badge: '/icons/Logo/96.png',
            tag: 'subscription-expiry',
            data: {
              type: 'subscription_expiry',
              days_until_expiry: daysUntilExpiry,
              url: '/dashboard/billing',
            },
          });
          notifications.push(`Subscription expiry alert sent to user ${user_id} (${daysUntilExpiry} days)`);
        }

        // Send notification on expiry day
        if (daysUntilExpiry === 0) {
          await sendSystemNotification(user_id, {
            title: '🚨 Subscription Expired',
            body: 'Your subscription has expired. Renew now to restore access to all features.',
            icon: '/icons/Logo/192.png',
            badge: '/icons/Logo/96.png',
            tag: 'subscription-expired',
            data: {
              type: 'subscription_expired',
              url: '/dashboard/billing',
            },
          });
          notifications.push(`Subscription expired alert sent to user ${user_id}`);
        }
      }
    }

    // Check low credit balance
    const { data: customers, error: custError } = await supabase
      .from('billing_customers')
      .select('user_id, credits')
      .lte('credits', 5);

    if (custError) {
      console.error('Error fetching customers:', custError);
    } else if (customers && customers.length > 0) {
      const alertPoints = [5, 0];

      for (const customer of customers) {
        const { user_id, credits } = customer;
        
        // Only send if credits are at specific thresholds (5 or 0)
        if (credits !== null && credits !== undefined && alertPoints.includes(credits)) {
          await sendSystemNotification(user_id, {
            title: credits === 0 ? '❌ No Credits Remaining' : '⚠️ Low Credit Balance',
            body: credits === 0 
              ? 'You have no credits left. Purchase more to continue creating content.'
              : `You have ${credits} credits remaining. Consider purchasing more to avoid interruptions.`,
            icon: '/icons/Logo/192.png',
            badge: '/icons/Logo/96.png',
            tag: 'low-credits',
            data: {
              type: 'low_credits',
              credits_remaining: credits,
              url: '/dashboard/billing',
            },
          });
          notifications.push(`Low credit alert sent to user ${user_id} (${credits} credits)`);
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
    console.error('Error in system alerts cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface SystemNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

async function sendSystemNotification(userId: string, payload: SystemNotificationPayload) {
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
        const error = err as { statusCode?: number }
        // If subscription is invalid/expired, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
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
    console.error('Error in sendSystemNotification:', error);
  }
}
