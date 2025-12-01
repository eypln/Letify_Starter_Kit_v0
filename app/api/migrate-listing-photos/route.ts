import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { listingId } = await request.json();
    
    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Check if images field already has photos
    const { data: listing } = await supabase
      .from('listings')
      .select('images')
      .eq('id', listingId)
      .single();
    
    if (listing?.images && Array.isArray(listing.images) && listing.images.length > 0) {
      // Already has photos, return them
      return NextResponse.json({ images: listing.images, migrated: false });
    }
    
    // Fetch photos from uploaded_assets via jobs
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('id')
      .eq('listing_id', listingId);
    
    if (!jobsData || jobsData.length === 0) {
      return NextResponse.json({ images: [], migrated: false });
    }
    
    const jobIds = jobsData.map(j => j.id);
    const { data: assetsData } = await supabase
      .from('uploaded_assets')
      .select('public_url')
      .in('job_id', jobIds);
    
    if (!assetsData || assetsData.length === 0) {
      return NextResponse.json({ images: [], migrated: false });
    }
    
    const photoUrls = assetsData.map(asset => asset.public_url);
    
    // Update listings.images field
    const { error: updateError } = await supabase
      .from('listings')
      .update({ images: photoUrls })
      .eq('id', listingId);
    
    if (updateError) {
      console.error('Error migrating photos:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ images: photoUrls, migrated: true });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
