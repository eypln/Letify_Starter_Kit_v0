import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get('listingId');

  if (!listingId) {
    return NextResponse.json({ error: 'listingId required' }, { status: 400 });
  }

  const supabase = await createClient();

  const result: Record<string, unknown> = {};

  const { data: listing } = await supabase
    .from('listings')
    .select('id, images')
    .eq('id', listingId)
    .single();

  result.listing_images = listing?.images || null;

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, listing_id')
    .eq('listing_id', listingId);

  result.jobs = jobs;

  if (jobs && jobs.length > 0) {
    const jobIds = jobs.map(j => j.id);
    const { data: assets } = await supabase
      .from('uploaded_assets')
      .select('job_id, public_url, created_at')
      .in('job_id', jobIds);

    result.uploaded_assets = assets;
  }

  return NextResponse.json(result, { status: 200 });
}
