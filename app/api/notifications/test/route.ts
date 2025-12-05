import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { sendTeamworkNotification } from '@/lib/pushNotificationHelper';

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

    return NextResponse.json({
      success: true,
      message: 'Test notification sent',
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
