import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';
import type { Database } from '@/types/supabase';
import { sendEmail, generateViewingNotificationEmail } from '@/lib/email';

// GET - Fetch all viewings for authenticated user
export async function GET(req: Request) {
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

          // Send email to each team leader
          for (const leader of teamLeaders) {
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

    // Send email to team leader if inform_teamleader is true
    if (inform_teamleader) {
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

          // Send email to each team leader
          for (const leader of teamLeaders) {
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
                subject: `Updated Viewing: ${ref_no} - ${client_name}`,
                html: emailHtml,
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
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
