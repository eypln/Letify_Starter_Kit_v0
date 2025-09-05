// app/api/webhooks/fb-reels/route.ts
import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabaseServerService';

export async function POST(req: Request) {
  const body = await req.json();
  const listingId = body.listingId ?? body.listing_id;
  const fbReelsUrl = body.result?.fbReelsUrl ?? body.fbReelsUrl;

  if (!listingId || !fbReelsUrl)
    return NextResponse.json({ ok:false, error:'missing listingId/fbReelsUrl' }, { status:400 });

  const sb = createServiceSupabase();
  const { error } = await sb.from('listings').update({ fb_reels_url: fbReelsUrl }).eq('listing_id', listingId);
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 });

  return NextResponse.json({ ok:true });
}
