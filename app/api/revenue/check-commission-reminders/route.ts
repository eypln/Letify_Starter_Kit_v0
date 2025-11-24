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

    // Get all revenue records with upcoming dates
    const { data: revenues, error: revenueError } = await supabase
      .from('revenue')
      .select('*')
      .or('date_signed.gte.today(),date_move_in.gte.today()');

    if (revenueError) {
      console.error('Error fetching revenues:', revenueError);
      return NextResponse.json({ error: 'Failed to fetch revenues' }, { status: 500 });
    }

    for (const revenue of revenues || []) {
      const { user_id, client_name, ref_no, date_signed, date_move_in, landlord_fee, client_fee } = revenue;
      
      // Calculate total commission
      const totalCommission = (landlord_fee || 0) + (client_fee || 0);
      const commissionDisplay = totalCommission > 0 ? `€${totalCommission.toFixed(2)}` : 'TBD';

      // Check date_signed
      if (date_signed) {
        const signedDate = new Date(date_signed);
        const hoursUntilSigned = (signedDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // 24h before reminder
        if (hoursUntilSigned >= 23 && hoursUntilSigned <= 25) {
          await sendCommissionNotification(user_id, {
            title: '📝 Contract Signing Tomorrow',
            body: `Contract signing for ${client_name || 'client'} (Ref: ${ref_no || 'N/A'}) is tomorrow. Commission: ${commissionDisplay}`,
            icon: '/icons/Logo/192.png',
            badge: '/icons/Logo/96.png',
            tag: 'commission-signing-24h',
            data: {
              type: 'commission_signing_reminder',
              revenue_id: revenue.id,
              client_name,
              ref_no,
              url: '/dashboard/revenue',
            },
          });
          notifications.push(`24h signing reminder sent for ${client_name || revenue.id}`);
        }

        // 8 AM on the day reminder (check if within 1 hour of 8 AM)
        const currentHour = now.getHours();
        const isSameDay = signedDate.toDateString() === now.toDateString();
        if (isSameDay && currentHour === 8) {
          await sendCommissionNotification(user_id, {
            title: '📝 Contract Signing Today!',
            body: `Contract signing for ${client_name || 'client'} (Ref: ${ref_no || 'N/A'}) is today. Commission: ${commissionDisplay}`,
            icon: '/icons/Logo/192.png',
            badge: '/icons/Logo/96.png',
            tag: 'commission-signing-today',
            data: {
              type: 'commission_signing_today',
              revenue_id: revenue.id,
              client_name,
              ref_no,
              url: '/dashboard/revenue',
            },
          });
          notifications.push(`8 AM signing reminder sent for ${client_name || revenue.id}`);
        }
      }

      // Check date_move_in
      if (date_move_in) {
        const moveInDate = new Date(date_move_in);
        const hoursUntilMoveIn = (moveInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // 24h before reminder
        if (hoursUntilMoveIn >= 23 && hoursUntilMoveIn <= 25) {
          await sendCommissionNotification(user_id, {
            title: '🏠 Move-In Tomorrow',
            body: `Move-in for ${client_name || 'client'} (Ref: ${ref_no || 'N/A'}) is tomorrow. Commission: ${commissionDisplay}`,
            icon: '/icons/Logo/192.png',
            badge: '/icons/Logo/96.png',
            tag: 'commission-movein-24h',
            data: {
              type: 'commission_movein_reminder',
              revenue_id: revenue.id,
              client_name,
              ref_no,
              url: '/dashboard/revenue',
            },
          });
          notifications.push(`24h move-in reminder sent for ${client_name || revenue.id}`);
        }

        // 8 AM on the day reminder
        const currentHour = now.getHours();
        const isSameDay = moveInDate.toDateString() === now.toDateString();
        if (isSameDay && currentHour === 8) {
          await sendCommissionNotification(user_id, {
            title: '🏠 Move-In Today!',
            body: `Move-in for ${client_name || 'client'} (Ref: ${ref_no || 'N/A'}) is today. Commission: ${commissionDisplay}`,
            icon: '/icons/Logo/192.png',
            badge: '/icons/Logo/96.png',
            tag: 'commission-movein-today',
            data: {
              type: 'commission_movein_today',
              revenue_id: revenue.id,
              client_name,
              ref_no,
              url: '/dashboard/revenue',
            },
          });
          notifications.push(`8 AM move-in reminder sent for ${client_name || revenue.id}`);
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
    console.error('Error in commission reminders cron:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendCommissionNotification(userId: string, payload: {
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
    console.error('Error in sendCommissionNotification:', error);
  }
}
