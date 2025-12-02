import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { listing_id, updates } = body;

    if (!listing_id || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: listing_id and updates' },
        { status: 400 }
      );
    }

    // Update all teamwork_listings records for this listing_id
    // Using service role to bypass RLS
    const { data, error } = await supabase
      .from('teamwork_listings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('listing_id', listing_id)
      .select('id');

    if (error) {
      console.error('Error updating teamwork listings:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated_count: data?.length || 0,
      message: `Updated ${data?.length || 0} teamwork listing(s)`
    });

  } catch (error) {
    console.error('Error in sync endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
