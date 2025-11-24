import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 dk - render süresi

const FALLBACK_N8N = 'https://n8n.letify.cloud/webhook/ac9fe8fc-4aa2-4864-82fb-8bfa9ce33208';

export async function POST(req: Request) {
  const payload = await req.json();
  const url = process.env.N8N_WEBHOOK_URL || FALLBACK_N8N;

  // Eksikse Supabase'den tamamla
  const patchedPayload = { ...payload };
  try {
    // Supabase client
    const supabase = await createClient();
    // User (id ve email zorunlu)
    if (!patchedPayload.user || !patchedPayload.user.id || !patchedPayload.user.email) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id && user?.email) patchedPayload.user = { id: user.id, email: user.email };
    }
    // User full_name
    if (patchedPayload.user && patchedPayload.user.id && !patchedPayload.user.full_name) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', patchedPayload.user.id)
        .maybeSingle();
      if (profile?.full_name) {
        patchedPayload.user.full_name = profile.full_name;
      }
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

  const n8nRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(patchedPayload),
  });

  const ct = n8nRes.headers.get('content-type') || '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = {};

  try {
    if (ct.includes('application/json')) {
      data = await n8nRes.json();
    } else {
      const raw = await n8nRes.text(); // bazen boş da olabilir
      data = raw ? (() => { try { return JSON.parse(raw); } catch { return { raw }; } })() : {};
    }
  } catch {
    data = {};
  }

  if (!n8nRes.ok) {
    return NextResponse.json(
      { error: data?.error || 'n8n error' },
      { status: 500 }
    );
  }

  const videoUrl =
    data?.result?.reelPreviewUrl ??
    data?.reelPreviewUrl ??
    data?.result?.video_url ??
    data?.video_url ??
    data?.googleDriveUrl ??
    data?.driveUrl ??
    data?.url ??
    null;

  // FB Reels URL'yi listings tablosuna yaz
  try {
    const reelsUrl = videoUrl;
    let listingId = patchedPayload?.listing?.id || patchedPayload?.listingId;
    const supabase = await createClient();
    // Eğer listingId yoksa, jobId üzerinden eşle
    if (!listingId && patchedPayload?.job?.id) {
      const { data: listingRow } = await supabase
        .from('listings')
        .select('id')
        .eq('job_id', patchedPayload.job.id)
        .maybeSingle();
      if (listingRow?.id) listingId = listingRow.id;
    }
    if (reelsUrl && listingId) {
      // Hem fb_reels_url hem video_url ve status alanlarını güncelle
      await supabase
        .from('listings')
        .update({ fb_reels_url: reelsUrl, video_url: reelsUrl, status: 'shared' })
        .eq('id', listingId);
    }
  } catch (e) {
    console.error('[API] Failed to update FB reels url in listings:', e);
  }

  return NextResponse.json({
    ok: true,
    result: { reelPreviewUrl: videoUrl, jobId: patchedPayload?.job?.id ?? null },
  });
}