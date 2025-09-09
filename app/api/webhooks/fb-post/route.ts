export const runtime = 'nodejs';
// app/api/webhooks/fb-post/route.ts
import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabaseServerService';

export async function POST(req: Request) {
  const body = await req.json();
  const listingId = body.listingId ?? body.listing_id;
  const fbPostUrl = body.result?.fbPostUrl ?? body.fbPostUrl;
  const description = body.description ?? body.result?.description ?? null;

  if (!listingId || !fbPostUrl)
    return NextResponse.json({ ok:false, error:'missing listingId/fbPostUrl' }, { status:400 });

  const sb = createServiceSupabase();
  const { error } = await sb.from('listings').update({ fb_post_url: fbPostUrl }).eq('listing_id', listingId);
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 });

  // Send n8n postReelsFb payload
  try {
    const { sendToN8n } = await import('@/lib/n8n');
    const payload = {
      action: 'postReelsFb',
      listing: { id: listingId, fbPostUrl },
      content: description ? { description } : undefined,
    };
    await sendToN8n('postReelsFb', payload);
  } catch (err) {
    // log error but don't block response
    console.error('n8n postReelsFb error', err);
  }

  return NextResponse.json({ ok:true });
}
