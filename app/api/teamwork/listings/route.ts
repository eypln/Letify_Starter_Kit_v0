import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
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

    return NextResponse.json({
      success: true,
      data: listings,
    });
  } catch (error) {
    console.error('Error in teamwork listings getter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
