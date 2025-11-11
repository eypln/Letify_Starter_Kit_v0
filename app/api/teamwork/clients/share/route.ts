import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { sendTeamworkNotification } from '@/lib/pushNotificationHelper';

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await req.json();

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
    }

    // Get the client details
    const supabase = await createClient();
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client fetch error:', clientError);
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get user profile for agent name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    const agentName = profile?.full_name || 'Unknown Agent';

    // Create teamwork client (only UI visible columns)
    const { data: teamworkClient, error: createError } = await supabase
      .from('teamwork_clients')
      .insert({
        user_id: user.id,
        client_id: clientId,
        agent_name: agentName,
        people: client.people,
        bedroom: client.bedroom,
        cities: client.cities,
        family_sharing: client.family_sharing,
        nationalities: client.nationalities,
        jobs: client.jobs,
        pet: client.pet,
        budget: client.budget,
        move_in: client.move_in,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating teamwork client:', createError);
      return NextResponse.json({ error: 'Failed to share client' }, { status: 500 });
    }

    // Log activity
    await supabase.from('activity').insert({
      user_id: user.id,
      type: 'teamwork_client_shared',
      data: {
        client_name: client.name,
        agent_name: profile?.full_name || user.email,
      },
    });

    // Send push notification to all other users
    await sendTeamworkNotification(user.id, {
      title: '👥 New Client Shared',
      body: `${agentName} shared a client: ${client.people} people, ${client.bedroom} bed, Budget: ${client.budget}, Cities: ${client.cities}`,
      icon: '/icons/Logo/192.png',
      badge: '/icons/Logo/96.png',
      tag: 'teamwork-client',
      data: {
        type: 'teamwork_client',
        client_id: clientId,
        agent_name: agentName,
        url: '/dashboard/teamwork',
      },
    });

    return NextResponse.json({
      success: true,
      data: teamworkClient,
    });
  } catch (error) {
    console.error('Error in teamwork client endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
