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

    const { listingId } = await req.json();

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID required' }, { status: 400 });
    }

    // Get the listing details
    const supabase = await createClient();
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      console.error('Listing fetch error:', listingError);
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Get user profile for agent name
    console.log('Fetching profile for user_id:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }
    
    console.log('Profile data:', profile);
    const agentName = profile?.full_name || user.email || 'Unknown Agent';
    console.log('Agent name will be:', agentName);

    // Create teamwork listing (only UI visible columns)
    const { data: teamworkListing, error: createError } = await supabase
      .from('teamwork_listings')
      .insert({
        user_id: user.id,
        listing_id: listingId,
        agent_name: agentName,
        city: listing.city,
        price: listing.price,
        bedroom: listing.bedrooms,
        bathroom: listing.bathrooms,
        property_type: listing.property_type,
        description: listing.description,
        available_date: (listing as { available_date?: string }).available_date || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating teamwork listing:', createError);
      // Check if it's a duplicate listing error (unique constraint violation)
      if (createError.code === '23505') {
        return NextResponse.json({ error: 'Property already shared with team' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to share listing' }, { status: 500 });
    }

    // Log activity
    await supabase.from('activity').insert({
      user_id: user.id,
      type: 'teamwork_listing_shared',
      data: {
        listing_title: listing.title,
        reference_no: listing.title,
        agent_name: profile?.full_name || user.email,
      },
    });

    // Send push notification to all other users
    await sendTeamworkNotification(user.id, {
      title: '🏠 New Property Listing Shared',
      body: `${agentName} shared a property in ${listing.city} - ${listing.property_type}, ${listing.bedrooms} bed, ${listing.price}`,
      icon: '/icons/Logo/192.png',
      badge: '/icons/Logo/96.png',
      tag: 'teamwork-listing',
      data: {
        type: 'teamwork_listing',
        listing_id: listingId,
        agent_name: agentName,
        url: '/dashboard/teamwork',
      },
    });

    return NextResponse.json({
      success: true,
      data: teamworkListing,
      reference_no: listing.title,
    });
  } catch (error) {
    console.error('Error in teamwork listing endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
