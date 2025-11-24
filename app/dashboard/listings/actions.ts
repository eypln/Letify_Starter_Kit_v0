
'use server';

import { createClient } from '@/lib/supabase/server';

const PAGE_SIZE = 10;


export async function getListings({ page }: { page: number }) {
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
        availability::text
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      // Sadece gerçek Supabase hatası loglanır
      console.error('Supabase listings fetch error:', error);
      throw new Error(error.message || 'Supabase listings fetch error');
    }

    // Get all listing IDs that are shared in teamwork
    const listingIds = (Array.isArray(data) ? data : []).map((d: Record<string, unknown>) => d?.id as string).filter(Boolean);
    const { data: sharedListings } = await supabase
      .from('teamwork_listings')
      .select('listing_id')
      .in('listing_id', listingIds);

    const sharedListingIds = new Set((sharedListings || []).map((item: { listing_id: string }) => item.listing_id));

    const rows = (Array.isArray(data) ? data : []).map((d: Record<string, unknown>) => ({
      id: d?.id ?? '',
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
      isSharedInTeamwork: sharedListingIds.has(d?.id as string),
    }));

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

    return (Array.isArray(data) ? data : []).map((d: Record<string, unknown>) => ({
      id: d?.id ?? '',
      city: d?.city ?? '',
      title: d?.title ?? '',
      availability: d?.availability ?? 'Available',
    }));
  } catch (err) {
    console.error('getAllAvailableAndSoonListings error:', err);
    return [];
  }
}
