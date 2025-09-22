export const runtime = 'nodejs';
// app/api/webhooks/fb-reels/route.ts
import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabaseServerService';

export async function POST(req: Request) {
  const body = await req.json();
  console.log('FB REELS PAYLOAD:', body);
  const listingId = body.listingId ?? body.listing_id;
  const fbReelsUrl = body.result?.fbReelsUrl ?? body.fbReelsUrl ?? body.fb_reels_url ?? body.result?.fb_reels_url;

  if (!listingId || !fbReelsUrl)
    return NextResponse.json({ ok:false, error:'missing listingId/fbReelsUrl' }, { status:400 });

  const sb = createServiceSupabase();
  const { error } = await sb.from('listings').update({ fb_reels_url: fbReelsUrl }).eq('id', listingId);
  console.log('FB REELS UPDATE RESULT:', { error });
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 });

  return NextResponse.json({ ok:true });
}
