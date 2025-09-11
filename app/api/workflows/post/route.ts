
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const payload = await req.json(); // { action:'post', user, job, listing, images? }
  const url = process.env.N8N_WEBHOOK_URL;

  // Sadece işlem adımı ve hata kodu logla, veri sızıntısı olmasın
  console.log('[API] /api/workflows/post tetiklendi');

  // Eksikse Supabase'den tamamla
  let patchedPayload = { ...payload };
  try {
    // Supabase client
    const { createClient } = require('@/lib/supabase/server');
    const supabase = createClient();
    // User (id ve email zorunlu)
    if (!patchedPayload.user || !patchedPayload.user.id || !patchedPayload.user.email) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id && user?.email) patchedPayload.user = { id: user.id, email: user.email };
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

  if (!url) {
    console.error('[API] N8N_WEBHOOK_URL missing');
    return NextResponse.json({ error: 'N8N_WEBHOOK_URL missing' }, { status: 500 });
  }

  try {
    // Tek endpoint, action'ı body'de gönderiyoruz
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(patchedPayload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[API] n8n error:', res.status);
      return NextResponse.json({ error: data?.error || 'n8n error' }, { status: 500 });
    }

    return NextResponse.json(data); // n8n Respond to Webhook: { result: { post_url: ... }, jobId: ... }
  } catch (error) {
    console.error('[API] n8n request failed:', error);
    return NextResponse.json({ error: 'Network error' }, { status: 500 });
  }
}