import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch ref_no suggestions from listings
export async function GET(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch listings with only necessary fields
  const { data, error } = await supabase
    .from('listings')
    .select('listing_id, title, city')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  // Transform data for autocomplete
  const suggestions = data?.map(listing => ({
    value: listing.title || listing.listing_id,
    label: listing.title || listing.listing_id,
    city: listing.city
  })) || [];

  return NextResponse.json({ success: true, data: suggestions });
}
