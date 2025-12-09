import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

const PAGE_SIZE = 10;

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per user
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MEDIUM);
  if (rateLimitResult) return rateLimitResult;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  
  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error('Supabase client creation error:', err);
    return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
  }
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {
    const { data, error, count } = await supabase
      .from('listings')
      .select(`
        id,
        created_at,
        property_url,
        city, location,
        price,
        bedrooms, bathrooms,
        property_type,
        description,
        fb_post_url,
        fb_reels_url,
        facebook_post_url,
        facebook_reel_url,
        title,
        availability::text,
        images
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Supabase listings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const listingIds = (Array.isArray(data) ? data : []).map((d: Record<string, unknown>) => d?.id as string).filter(Boolean);
    
    const { data: sharedListings } = await supabase
      .from('teamwork_listings')
      .select('listing_id')
      .in('listing_id', listingIds);

    const sharedListingIds = new Set((sharedListings || []).map((item: { listing_id: string }) => item.listing_id));

    const { data: jobsData } = await supabase
      .from('jobs')
      .select('id, listing_id')
      .in('listing_id', listingIds);

    const jobIds = (jobsData || []).map((j: { id: string }) => j.id);
    const listingToJobsMap = new Map<string, string[]>();
    (jobsData || []).forEach((j: { id: string; listing_id: string | null }) => {
      if (j.listing_id) {
        if (!listingToJobsMap.has(j.listing_id)) {
          listingToJobsMap.set(j.listing_id, []);
        }
        listingToJobsMap.get(j.listing_id)!.push(j.id);
      }
    });

    const { data: uploadedAssets } = await supabase
      .from('uploaded_assets')
      .select('job_id, public_url')
      .in('job_id', jobIds);

    const jobToPhotosMap = new Map<string, string[]>();
    (uploadedAssets || []).forEach((asset: { job_id: string; public_url: string }) => {
      if (!jobToPhotosMap.has(asset.job_id)) {
        jobToPhotosMap.set(asset.job_id, []);
      }
      jobToPhotosMap.get(asset.job_id)!.push(asset.public_url);
    });

    const rows = (Array.isArray(data) ? data : []).map((d: Record<string, unknown>) => {
      const listingId = d?.id as string;
      const jobIdsForListing = listingToJobsMap.get(listingId) || [];
      
      const photosFromAssets: { url: string }[] = [];
      jobIdsForListing.forEach(jobId => {
        const urls = jobToPhotosMap.get(jobId) || [];
        urls.forEach(url => photosFromAssets.push({ url }));
      });

      const imagesFromListing = Array.isArray(d?.images) ? d.images : [];
      const photosFromImages = imagesFromListing.map((img: string | { url: string }) => 
        typeof img === 'string' ? { url: img } : img
      );

      const allPhotos = [...photosFromAssets, ...photosFromImages];

      return {
        id: listingId,
        addingDate: d?.created_at ?? '',
        sourceUrl: d?.property_url ?? '',
        city: d?.city ?? d?.location ?? null,
        price: d?.price ?? null,
        bedroom: d?.bedrooms ?? null,
        bathroom: d?.bathrooms ?? null,
        propertyType: d?.property_type ?? null,
        description: d?.description ?? '',
        fbPostUrl: d?.facebook_post_url ?? d?.fb_post_url ?? null,
        fbReelsUrl: d?.facebook_reel_url ?? d?.fb_reels_url ?? null,
        title: d?.title ?? '',
        availability: d?.availability ?? 'Available',
        isSharedInTeamwork: sharedListingIds.has(listingId),
        photos: allPhotos,
      };
    });

    return NextResponse.json({
      rows,
      total: count ?? 0,
      pageCount: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
      pageSize: PAGE_SIZE
    });
  } catch (err) {
    const error = err as Error;
    console.error('getListings error:', err);
    return NextResponse.json({ error: error?.message || 'getListings error' }, { status: 500 });
  }
}
