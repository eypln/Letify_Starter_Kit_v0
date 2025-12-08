import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';
import webpush from 'web-push';

// Configure web push
if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.warn('VAPID keys not configured for web push notifications');
} else {
  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

async function sendAgentNotificationPush(userId: string, payload: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    
    // Get agent's push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return;
    }

    // Send to all subscriptions
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify(payload)
        );
      } catch (error: any) {
        console.error(`Failed to send push to subscription:`, error);
        
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }
      }
    });

    await Promise.allSettled(pushPromises);
  } catch (error) {
    console.error('Error in sendAgentNotificationPush:', error);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { userId, revenueId, refNo } = body;

    if (!userId || !revenueId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get boss name for notification
    const {
      data: { user: bossUser },
    } = await supabase.auth.getUser();

    if (!bossUser) {
      return NextResponse.json(
        { success: false, error: 'Boss user not found' },
        { status: 401 }
      );
    }

    const { data: bossProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', bossUser.id)
      .single();

    const bossName = bossProfile?.full_name || 'Boss';

    // Log activity
    await logActivity(supabase, {
      user_id: userId,
      type: 'agent_payment_sent',
      data: { 
        ref_no: refNo,
        revenue_id: revenueId,
        sent_by: bossName
      }
    });

    // Send push notification to agent
    await sendAgentNotificationPush(userId, {
      title: '💰 Agency Fee Sent',
      body: `Agency fee sent for ${refNo}`,
      icon: '/icons/Logo/192.png',
      badge: '/icons/Logo/96.png',
      tag: 'agent-payment-notification',
      data: {
        type: 'agent_payment_sent',
        ref_no: refNo,
        revenue_id: revenueId,
        url: '/dashboard/revenue',
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Notification sent to agent' 
    });

  } catch (error) {
    console.error('Error in notify-agent-payment API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
