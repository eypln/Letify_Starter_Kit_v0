
'use server';

import { createClient } from '@/lib/supabase/server';

const PAGE_SIZE = 10;

const CANDIDATES = {
  addingDate: ['created_at', 'inserted_at', 'createdAt', 'created', 'updated_at'],
  referenceUrl: ['reference_url', 'ref_url', 'url', 'link', 'source', 'source_link'],
  city: ['city', 'location_city'],
  price: ['price', 'amount', 'cost'],
  bedroom: ['bedrooms', 'bedroom', 'beds'],
  bathroom: ['bathrooms', 'bathroom', 'baths'],
  propertyType: ['property_type', 'type', 'propertytype'],
  description: ['description', 'desc', 'details', 'summary'],
  fbPostUrl: ['fb_post_url', 'facebook_post_url', 'fb_post_link', 'post_url'],
  fbReelsUrl: ['fb_reels_url', 'facebook_reels_url', 'reels_url'],
} as const;

function pick(obj: any, keys: readonly string[]) {
  for (const k of keys) if (k in obj && obj[k] != null) return obj[k];
  return null;
}


export async function getListings({ page }: { page: number }) {
  const supabase = createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .order('id', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const rows = (data ?? []).map((d: any) => ({
    id: d.id,
    addingDate: pick(d, CANDIDATES.addingDate) ?? new Date().toISOString(),
    referenceUrl: pick(d, CANDIDATES.referenceUrl),
    city: pick(d, CANDIDATES.city),
    price: pick(d, CANDIDATES.price),
    bedroom: pick(d, CANDIDATES.bedroom),
    bathroom: pick(d, CANDIDATES.bathroom),
    propertyType: pick(d, CANDIDATES.propertyType),
    description: pick(d, CANDIDATES.description),
    fbPostUrl: pick(d, CANDIDATES.fbPostUrl),
    fbReelsUrl: pick(d, CANDIDATES.fbReelsUrl),
  }));

  return {
    rows,
    total: count ?? 0,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  };
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
  const supabase = createClient();
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