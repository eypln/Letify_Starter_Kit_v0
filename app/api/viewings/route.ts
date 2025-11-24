import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';
import { sendEmail, generateViewingNotificationEmail } from '@/lib/email';
import webpush from 'web-push';

// Configure VAPID keys
if (
  process.env.VAPID_SUBJECT &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// GET - Fetch all viewings for authenticated user
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('viewings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}

// POST - Create new viewing
export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();

  const {
    ref_no,
    city,
    viewing_date,
    viewing_time,
    client_name,
    client_mobile_no,
    result,
    comments,
    inform_teamleader
  } = body;

  // Authenticated user id
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user_id = user.id;

  const insertData = {
    user_id,
    ref_no: ref_no ?? null,
    city: city ?? null,
    viewing_date: viewing_date ?? null,
    viewing_time: viewing_time ?? null,
    client_name: client_name ?? null,
    client_mobile_no: client_mobile_no ?? null,
    result: result ?? null,
    comments: comments ?? null,
    inform_teamleader: inform_teamleader ?? false,
  };

  const { data, error } = await supabase
    .from('viewings')
    .insert([insertData])
    .select()
    .single();

  if (!error) {
    // Log activity
    await logActivity(supabase, {
      user_id,
      type: 'new_viewing_added',
      data: { ref_no, client_name, viewing_date }
    });

    // If result is DEAL, create revenue record automatically
    if (result === 'DEAL' && ref_no && client_name) {
      await supabase
        .from('revenue')
        .insert([{
          user_id,
          ref_no,
          client_name,
          rent_amount: 0,
          landlord_fee: 0,
          landlord_discount: false,
          client_fee: 0,
          client_discount: false,
          listing_fee: 0,
          agent_income: 0,
          vatable: true,
          date_rented: viewing_date || null,
          inform_boss_after_both_sides_paid: false,
          boss_notified: false,
        }]);
    }

    // Send email to team leader if inform_teamleader is true
    if (inform_teamleader) {
      try {
        // Get user profile for agent name and email
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user_id)
          .single();

        // Get team leader(s) email
        const { data: teamLeaders } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('role', 'teamleader');

        if (teamLeaders && teamLeaders.length > 0) {
          const agentName = userProfile?.full_name || 'Agent';
          const agentEmail = userProfile?.email || '';

          // Send email and push notification to each team leader
          for (const leader of teamLeaders) {
            // Send email
            if (leader.email) {
              const emailHtml = generateViewingNotificationEmail({
                ref_no: ref_no || '',
                city: city || '',
                viewing_date: viewing_date || '',
                viewing_time: viewing_time || '',
                client_name: client_name || '',
                client_mobile_no: client_mobile_no || '',
                result: result || '',
                comments: comments || '',
                agentName,
                agentEmail,
              });

              await sendEmail({
                to: leader.email,
                subject: `New Viewing: ${ref_no} - ${client_name}`,
                html: emailHtml,
              });
            }

            // Send push notification
            const { data: leaderProfile } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('email', leader.email || '')
              .single();

            if (leaderProfile?.user_id) {
              await sendTeamLeaderNotification(leaderProfile.user_id, {
                title: '📅 New Viewing Scheduled',
                body: `${agentName} scheduled a viewing for ${ref_no || 'property'} in ${city || 'unknown city'} on ${viewing_date}`,
                icon: '/icons/Logo/192.png',
                badge: '/icons/Logo/96.png',
                tag: 'team-leader-viewing',
                data: {
                  type: 'team_leader_viewing',
                  viewing_ref: ref_no,
                  agent_name: agentName,
                  url: '/dashboard/viewings',
                },
              });
            }
          }
        }
      } catch (emailError) {
        console.error('Error sending team leader notification:', emailError);
        // Don't fail the request if email fails
      }
    }
  }

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}

// PUT - Update existing viewing
export async function PUT(req: Request) {
  const supabase = await createClient();
  const body = await req.json();

  const {
    id,
    ref_no,
    city,
    viewing_date,
    viewing_time,
    client_name,
    client_mobile_no,
    result,
    comments,
    inform_teamleader
  } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
  }

  // Authenticated user id
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Get existing viewing to check if result changed
  const { data: existingViewing } = await supabase
    .from('viewings')
    .select('result')
    .eq('id', id)
    .single();

  const resultChanged = existingViewing && existingViewing.result !== result;

  const updateData = {
    ref_no: ref_no ?? null,
    city: city ?? null,
    viewing_date: viewing_date ?? null,
    viewing_time: viewing_time ?? null,
    client_name: client_name ?? null,
    client_mobile_no: client_mobile_no ?? null,
    result: result ?? null,
    comments: comments ?? null,
    inform_teamleader: inform_teamleader ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('viewings')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (!error) {
    // Log activity
    await logActivity(supabase, {
      user_id: user.id,
      type: 'viewing_updated',
      data: { id, ref_no, client_name }
    });

    // If result is DEAL, check if revenue record exists, if not create one
    if (result === 'DEAL' && ref_no && client_name) {
      // Check if revenue already exists for this ref_no and client
      const { data: existingRevenue } = await supabase
        .from('revenue')
        .select('id')
        .eq('user_id', user.id)
        .eq('ref_no', ref_no)
        .eq('client_name', client_name)
        .maybeSingle();

      // Only create if doesn't exist
      if (!existingRevenue) {
        await supabase
          .from('revenue')
          .insert([{
            user_id: user.id,
            ref_no,
            client_name,
            rent_amount: 0,
            landlord_fee: 0,
            landlord_discount: false,
            client_fee: 0,
            client_discount: false,
            listing_fee: 0,
            agent_income: 0,
            vatable: true,
            date_rented: viewing_date || null,
            inform_boss_after_both_sides_paid: false,
            boss_notified: false,
          }]);
      }
    }

    // Send email and notification to team leader if:
    // 1. inform_teamleader is true AND
    // 2. result has changed (viewing outcome updated)
    if (inform_teamleader && resultChanged) {
      try {
        // Get user profile for agent name and email
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        // Get team leader(s) email
        const { data: teamLeaders } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('role', 'teamleader');

        if (teamLeaders && teamLeaders.length > 0) {
          const agentName = userProfile?.full_name || 'Agent';
          const agentEmail = userProfile?.email || '';

          // Send email and push notification to each team leader
          for (const leader of teamLeaders) {
            // Send email
            if (leader.email) {
              const emailHtml = generateViewingNotificationEmail({
                ref_no: ref_no || '',
                city: city || '',
                viewing_date: viewing_date || '',
                viewing_time: viewing_time || '',
                client_name: client_name || '',
                client_mobile_no: client_mobile_no || '',
                result: result || '',
                comments: comments || '',
                agentName,
                agentEmail,
              });

              await sendEmail({
                to: leader.email,
                subject: `Viewing Result Updated: ${ref_no} - ${result}`,
                html: emailHtml,
              });

              // Send push notification
              const { data: leaderProfile } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('email', leader.email)
                .single();

              if (leaderProfile?.user_id) {
                await sendTeamLeaderNotification(leaderProfile.user_id, {
                  title: '✅ Viewing Result Updated',
                  body: `${agentName} updated viewing result for ${ref_no || 'property'} in ${city || 'unknown city'} - Result: ${result || 'N/A'}`,
                  icon: '/icons/Logo/192.png',
                  badge: '/icons/Logo/96.png',
                  tag: 'team-leader-viewing-result',
                  data: {
                    type: 'team_leader_viewing_result',
                    viewing_ref: ref_no,
                    agent_name: agentName,
                    result: result,
                    url: '/dashboard/viewings',
                  },
                });
              }
            }
          }
        }
      } catch (emailError) {
        console.error('Error sending team leader notification:', emailError);
        // Don't fail the request if email fails
      }
    }
  }

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}

// DELETE - Delete viewing
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('viewings')
    .delete()
    .eq('id', parseInt(id))
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

// Helper function to send push notification to team leader
async function sendTeamLeaderNotification(userId: string, payload: {
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
    console.error('Error in sendTeamLeaderNotification:', error);
  }
}
