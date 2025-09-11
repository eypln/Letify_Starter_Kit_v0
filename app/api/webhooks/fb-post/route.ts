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
    // Eksikse Supabase'den tamamla
    let patchedPayload = {
      action: 'postReelsFb',
      listing: { id: listingId, fbPostUrl },
      content: description ? { description } : undefined,
      ...body?.payload,
    };
    try {
      const { createClient } = require('@/lib/supabase/server');
      const supabase = createClient();
      // User
      if (!patchedPayload.user || !patchedPayload.user.id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) patchedPayload.user = { id: user.id, email: user.email };
      }
      // Job
      if (!patchedPayload.job || !patchedPayload.job.id) {
        // jobId varsa jobs tablosundan çekebilirsin
        // ...
      }
      // Facebook
      if (!patchedPayload.fb || !patchedPayload.fb.pageId || !patchedPayload.fb.accessToken) {
        const { data: integ } = await supabase
          .from('users_integrations')
          .select('fb_page_id, fb_access_token')
          .eq('user_id', patchedPayload.user?.id)
          .maybeSingle();
        if (integ?.fb_page_id && integ?.fb_access_token) {
          patchedPayload.fb = { pageId: integ.fb_page_id, accessToken: integ.fb_access_token };
        }
      }
    } catch {}
    await sendToN8n('postReelsFb', patchedPayload);
  } catch (err) {
    // log error but don't block response
    console.error('n8n postReelsFb error', err);
  }

  return NextResponse.json({ ok:true });
}
