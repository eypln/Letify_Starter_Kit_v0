import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { sendTeamworkNotification } from '@/lib/pushNotificationHelper';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Test endpoint for push notifications
 * Send a test notification to all users
 */
export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Test Notification] Starting for user:', user.id);

    // Check how many subscriptions exist (use admin client to bypass RLS)
    const supabase = createAdminClient();
    const { data: allSubs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, created_at');

    console.log('[Test Notification] Total subscriptions in DB:', allSubs?.length || 0);
    console.log('[Test Notification] Subscriptions:', allSubs);

    if (subsError) {
      console.error('[Test Notification] Error fetching subscriptions:', subsError);
    }

    // Send test notification to all users (excluding sender)
    const result = await sendTeamworkNotification(user.id, {
      title: '🔔 Test Notification',
      body: 'Push notifications are working correctly! This is a test from Letify.',
      icon: '/icons/Logo/192.png',
      badge: '/icons/Logo/96.png',
      tag: 'test-notification',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
        url: '/dashboard',
      },
    });

    console.log('[Test Notification] Result:', result);

    return NextResponse.json({
      success: true,
      message: 'Test notification sent',
      sent: result.sent,
      failed: result.failed,
      totalSubscriptions: allSubs?.length || 0,
      currentUser: user.id,
    });
  } catch (error) {
    console.error('[Test Notification] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
