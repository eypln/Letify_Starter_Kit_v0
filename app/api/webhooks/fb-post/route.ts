// app/api/webhooks/fb-post/route.ts
import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabaseServerService';

export async function POST(req: Request) {
  const body = await req.json();
  const listingId = body.listingId ?? body.listing_id;
  const fbPostUrl = body.result?.fbPostUrl ?? body.fbPostUrl;

  if (!listingId || !fbPostUrl)
    return NextResponse.json({ ok:false, error:'missing listingId/fbPostUrl' }, { status:400 });

  const sb = createServiceSupabase();
  const { error } = await sb.from('listings').update({ fb_post_url: fbPostUrl }).eq('listing_id', listingId);
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 });

  return NextResponse.json({ ok:true });
}
