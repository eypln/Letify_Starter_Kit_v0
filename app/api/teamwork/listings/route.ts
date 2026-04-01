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

    // Get all teamwork listings (all users can see all shared listings)
    const { data: listings, error } = await supabase
      .from('teamwork_listings')
      .select('*')
      .order('teamwork_date', { ascending: false });

    if (error) {
      console.error('Error fetching teamwork listings:', error);
      return NextResponse.json({ error: 'Failed to fetch teamwork listings' }, { status: 500 });
    }

    // Enrich with user roles from profiles
    const userIds = [...new Set((listings || []).map((l: any) => l.user_id))];
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
    const enrichedListings = (listings || []).map((l: any) => ({
      ...l,
      agent_role: roleMap.get(l.user_id) || 'agent',
    }));

    return NextResponse.json({
      success: true,
      data: enrichedListings,
    });
  } catch (error) {
    console.error('Error in teamwork listings getter:', error);
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
      return NextResponse.json({ error: 'Listing ID required' }, { status: 400 });
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
    const { data: listing } = await supabase
      .from('teamwork_listings')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.user_id !== user.id && !isElevatedUser) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { error } = await supabase
      .from('teamwork_listings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing teamwork listing:', error);
      return NextResponse.json({ error: 'Failed to remove listing' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in teamwork listing delete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
