export const runtime = 'nodejs';
// app/api/webhooks/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceSupabase } from '@/lib/supabaseServerService';
import { sendToN8n } from '@/lib/n8n';
import crypto from 'crypto';
import { rateLimitByIP, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limiting: 10 requests per minute per IP (prevent spam)
  const rateLimitResult = await rateLimitByIP(req, RateLimitPresets.STRICT);
  if (rateLimitResult) return rateLimitResult;
  const body = await req.json().catch(() => ({}));
  // n8n trigger: job insert + n8n gönder + listings upsert
  if (body?.trigger === 'n8n') {
    const sourceUrl: string | undefined = body?.listing?.sourceUrl;
    if (!sourceUrl) {
      return NextResponse.json({ ok: false, message: 'sourceUrl is required' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }
    // Profile validation (opsiyonel)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profile) {
  if (!profile.full_name) return NextResponse.json({ ok: false, message: 'Full name required' }, { status: 403 });
  if (!profile.phone) return NextResponse.json({ ok: false, message: 'Phone required' }, { status: 403 });
  if (profile.status !== 'approved') return NextResponse.json({ ok: false, message: 'Waiting for admin approval' }, { status: 403 });
    }
    // FB integration (opsiyonel)
    const { data: fb } = await supabase
      .from('users_integrations')
      .select('fb_page_id, fb_access_token')
      .eq('user_id', user.id)
      .maybeSingle();
    // Generate listing ID
    const listingId = crypto.createHash('md5').update(sourceUrl + Date.now()).digest('hex').substring(0, 12);
    // Prepare payload for n8n
    const payload = {
      action: 'generate',
      user: { id: user.id, email: user.email ?? '' },
      job: { kind: 'content', status: 'queued' },
      listing: { sourceUrl },
      options: { language: process.env.N8N_DEFAULT_LANGUAGE || 'tr', executionMode: 'prod' },
      fb: fb ? { pageId: fb.fb_page_id, accessToken: fb.fb_access_token } : null
    };
    // Insert job into jobs
    const { data: inserted, error: insErr } = await supabase
      .from('jobs')
      .insert({ user_id: user.id, listing_id: listingId, kind: 'content', status: 'queued', progress_int: 0, payload })
      .select('id')
      .single();
    if (insErr || !inserted) {
      return NextResponse.json({ ok: false, message: insErr?.message ?? 'Insert failed' }, { status: 500 });
    }
    // Send to n8n
    const finalPayload = { ...payload, job: { ...payload.job, id: inserted.id } };
    try {
      await sendToN8n('generate', {
        ...finalPayload,
        user: { id: user.id, email: user.email ?? '' }, // always send both
      });
    } catch {
      await supabase.from('jobs').update({ status: 'error', error_msg: 'network error' }).eq('id', inserted.id);
      return NextResponse.json({ ok: false, message: 'network error' }, { status: 502 });
    }
    // listings tablosuna upsert
    const sb = createServiceSupabase();
    const user_id: string | null = user.id;
    const upsert = {
      user_id,
      listing_id: listingId,
      property_url: sourceUrl ?? null,
      city: body.listing?.city ?? null,
      price: body.listing?.price ?? null,
      bedrooms: body.listing?.bedroom ?? null,
      bathrooms: body.listing?.bathroom ?? null,
      property_type: body.listing?.propertyType ?? null,
      description: body.description ?? body.listing?.description ?? null,
      title: body.listing?.title ?? null,
      location: body.listing?.location ?? null
    };
    const { error } = await sb.from('listings').upsert(upsert, { onConflict: 'listing_id' });
    if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 });
    return NextResponse.json({ ok: true, jobId: inserted.id, listingId });
  }
  // n8n webhook dönüşü: sadece listings upsert
  const listing = body.listing ?? body.payload?.listing ?? {};
  const listingId = body.listingId ?? body.listing_id ?? body.id;
  const sourceUrl = listing.sourceUrl ?? body.sourceUrl ?? body.url;
  if (!listingId) return NextResponse.json({ ok:false, error:'Missing listingId' }, { status:400 });
  const sb = createServiceSupabase();
  let user_id: string | null = null;
  const { data: j } = await sb.from('jobs').select('user_id').eq('listing_id', listingId).maybeSingle();
  user_id = j?.user_id ?? null;
  const upsert = {
    user_id,
    listing_id: listingId,
    property_url: sourceUrl ?? null,
    city: listing.city ?? null,
    price: listing.price ?? null,
    bedrooms: listing.bedroom ?? null,
    bathrooms: listing.bathroom ?? null,
    property_type: listing.propertyType ?? null,
    description: body.description ?? listing.description ?? null,
    title: listing.title ?? null,
    location: listing.location ?? null,
    // Yeni eklenen alanlar (linkler ve video)
    facebook_post_url: body.facebook_post_url ?? body.fb_post_url ?? body.post_url ?? null,
    fb_post_url: body.fb_post_url ?? body.facebook_post_url ?? body.post_url ?? null,
    fb_reels_url: body.fb_reels_url ?? body.reelPublishId ?? body.reels_url ?? null,
    video_url: body.video_url ?? body.reelsPreviewUrl ?? null
  };
  const { error } = await sb.from('listings').upsert(upsert, { onConflict: 'listing_id' });
  if (error) return NextResponse.json({ ok:false, error: error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}
