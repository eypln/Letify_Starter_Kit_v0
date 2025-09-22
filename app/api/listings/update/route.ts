import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/activity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      jobId,
      listingId,
      images,
      facebook_post_url,
      fb_post_url,
      fb_reels_url,
      video_url,
      status
    } = body;

    // Önce listingId yoksa jobId ile bul
    let resolvedListingId = listingId;
    if (!resolvedListingId && jobId) {
      const { data: jobRow, error: jobErr } = await supabase
        .from('jobs')
        .select('listing_id')
        .eq('id', jobId)
        .maybeSingle();
      if (jobErr || !jobRow?.listing_id) {
        return NextResponse.json({ error: 'Listing not found for jobId' }, { status: 400 });
      }
      resolvedListingId = jobRow.listing_id;
    }
    if (!resolvedListingId) {
      return NextResponse.json({ error: 'listingId or jobId required' }, { status: 400 });
    }

    // Güncellenecek alanları hazırla
    const updateFields: Record<string, any> = {};
    if (images !== undefined) updateFields.images = images;
    if (facebook_post_url !== undefined) updateFields.facebook_post_url = facebook_post_url;
    if (fb_post_url !== undefined) updateFields.fb_post_url = fb_post_url;
    if (fb_reels_url !== undefined) updateFields.fb_reels_url = fb_reels_url;
    if (video_url !== undefined) updateFields.video_url = video_url;
    if (status !== undefined) updateFields.status = status;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from('listings')
      .update(updateFields)
      .eq('id', resolvedListingId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Activity log: listing paylaşımı
    // user_id'yi jobs tablosundan bul
    let user_id = null;
    if (jobId) {
      const { data: jobRow } = await supabase
        .from('jobs')
        .select('user_id')
        .eq('id', jobId)
        .maybeSingle();
      user_id = jobRow?.user_id;
    }
    if (user_id) {
      await logActivity({ user_id, type: 'listing', data: { listingId: resolvedListingId } });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
}
