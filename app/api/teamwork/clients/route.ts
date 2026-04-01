import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get all teamwork clients (all users can see all shared clients)
    const { data: clients, error } = await supabase
      .from('teamwork_clients')
      .select('*')
      .order('teamwork_date', { ascending: false });

    if (error) {
      console.error('Error fetching teamwork clients:', error);
      return NextResponse.json({ error: 'Failed to fetch teamwork clients' }, { status: 500 });
    }

    // Enrich with user roles from profiles
    const userIds = [...new Set((clients || []).map((c: any) => c.user_id))];
    let roleMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, role')
        .in('user_id', userIds);
      if (profiles) {
        roleMap = new Map(profiles.map((p: any) => [p.user_id, p.role]));
      }
    }
    const enrichedClients = (clients || []).map((c: any) => ({
      ...c,
      agent_role: roleMap.get(c.user_id) || 'agent',
    }));

    return NextResponse.json({
      success: true,
      data: enrichedClients,
    });
  } catch (error) {
    console.error('Error in teamwork clients getter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isElevatedUser = ['teamleader', 'manager', 'boss', 'admin'].includes(profile?.role || '');

    // Check ownership or elevated role
    const { data: client } = await supabase
      .from('teamwork_clients')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (client.user_id !== user.id && !isElevatedUser) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { error } = await supabase
      .from('teamwork_clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing teamwork client:', error);
      return NextResponse.json({ error: 'Failed to remove client' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in teamwork client delete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
