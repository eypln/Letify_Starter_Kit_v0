
'use server';

import { createClient } from '@/lib/supabase/server';

const PAGE_SIZE = 10;

interface ListingRow {
  id: string;
  addingDate: string;
  sourceUrl: string;
  city: string | null;
  price: number | null;
  bedroom: number | null;
  bathroom: number | null;
  propertyType: string | null;
  description: string;
  fbPostUrl: string | null;
  fbReelsUrl: string | null;
  title: string;
  availability: string;
  available_date: string | null;
  isSharedInTeamwork: boolean;
  photos: { url: string }[];
}

export async function getListings({ page }: { page: number }): Promise<{
  rows: ListingRow[];
  total: number;
  pageCount: number;
  pageSize: number;
}> {
  const supabase = await createClient();
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
        available_date,
        images
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Supabase listings fetch error:', error);
      throw new Error(error.message || 'Supabase listings fetch error');
    }

    const listingIds = (Array.isArray(data) ? data : []).map((d: unknown) => (d as Record<string, unknown>)?.id as string).filter(Boolean);
    
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

    const rows: ListingRow[] = (Array.isArray(data) ? data : []).map((d: unknown): ListingRow => {
      const listing = d as Record<string, unknown>;
      const listingId = listing?.id as string;
      const jobIdsForListing = listingToJobsMap.get(listingId) || [];
      
      const photosFromAssets: { url: string }[] = [];
      jobIdsForListing.forEach(jobId => {
        const urls = jobToPhotosMap.get(jobId) || [];
        urls.forEach(url => photosFromAssets.push({ url }));
      });

      const imagesFromListing = Array.isArray(listing?.images) ? listing.images : [];
      const photosFromImages: { url: string }[] = (imagesFromListing as Array<string | { url: string }>).map((img: string | { url: string }) => 
        typeof img === 'string' ? { url: img } : img
      );

      const allPhotos: { url: string }[] = [...photosFromAssets, ...photosFromImages];

      const row: ListingRow = {
        id: listingId,
        addingDate: (listing?.created_at as string) ?? '',
        sourceUrl: (listing?.property_url as string) ?? '',
        city: (listing?.city as string) ?? (listing?.location as string) ?? null,
        price: (listing?.price as number) ?? null,
        bedroom: (listing?.bedrooms as number) ?? null,
        bathroom: (listing?.bathrooms as number) ?? null,
        propertyType: (listing?.property_type as string) ?? null,
        description: (listing?.description as string) ?? '',
        fbPostUrl: (listing?.facebook_post_url as string) ?? (listing?.fb_post_url as string) ?? null,
        fbReelsUrl: (listing?.facebook_reel_url as string) ?? (listing?.fb_reels_url as string) ?? null,
        title: (listing?.title as string) ?? '',
        availability: (listing?.availability as string) ?? 'Available',
        available_date: (listing?.available_date as string) ?? null,
        isSharedInTeamwork: sharedListingIds.has(listingId),
        photos: JSON.parse(JSON.stringify(allPhotos)),
      };
      
      return row;
    });

    return {
      rows,
      total: count ?? 0,
      pageCount: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
      pageSize: PAGE_SIZE
    };
  } catch (err) {
    const error = err as Error;
    console.error('getListings error:', err);
    throw new Error(error?.message || 'getListings error');
  }
}


export async function createListing(input: {
  userId: string;
  referenceUrl: string;
  city?: string | null;
  price?: number | null;
  bedroom?: number | null;
  bathroom?: number | null;
  propertyType?: string | null;
  description?: string | null;
}) {
  const supabase = await createClient();
  const payload = {
    listing: {
      sourceUrl: input.referenceUrl,
      city: input.city ?? null,
      price: input.price ?? null,
      bedroom: input.bedroom ?? null,
      bathroom: input.bathroom ?? null,
      propertyType: input.propertyType ?? null,
      description: input.description ?? null,
    },
  };
  const { data, error } = await supabase
    .from('jobs')
    .insert([
      {
        user_id: input.userId,
        kind: 'content',
        status: 'queued',
        payload,
      }
    ])
    .select('id');
  if (error) throw new Error(JSON.stringify(error));
  const jobId = Array.isArray(data) ? (data[0] as { id: string })?.id : (data as { id: string })?.id;
  try {
    await fetch(`${process.env.NEXT_PUBLIC_WEBAPP_URL ?? ''}/api/webhooks/content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ listing: { sourceUrl: input.referenceUrl } }),
      cache: 'no-store',
    });
  } catch {}
  return { id: jobId };
}


export async function updateListingAvailability(listingId: string, availability: 'Available' | 'Rented' | 'Soon') {
  const supabase = await createClient();
  
  // Get old availability status
  const { data: oldListing } = await supabase
    .from('listings')
    .select('availability::text')
    .eq('id', listingId)
    .single();

  const oldAvailability = oldListing?.availability;

  // Update listing availability
  const { error } = await supabase
    .from('listings')
    .update({ availability })
    .eq('id', listingId);

  if (error) throw new Error(error.message);

  // If changed from Available to Rented, remove from teamwork_listings
  if (oldAvailability === 'Available' && availability === 'Rented') {
    await supabase
      .from('teamwork_listings')
      .delete()
      .eq('listing_id', listingId);
  }

  return { success: true };
}


export async function getAllAvailableAndSoonListings() {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        id,
        city,
        title,
        availability::text
      `)
      .in('availability', ['Available', 'Soon'])
      .not('city', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase map listings fetch error:', error);
      throw new Error(error.message || 'Failed to fetch map listings');
    }

    return (Array.isArray(data) ? data : []).map((d: unknown) => {
      const listing = d as Record<string, unknown>;
      return {
        id: listing?.id ?? '',
        city: listing?.city ?? '',
        title: listing?.title ?? '',
        availability: listing?.availability ?? 'Available',
      };
    });
  } catch (err) {
    console.error('getAllAvailableAndSoonListings error:', err);
    return [];
  }
}
