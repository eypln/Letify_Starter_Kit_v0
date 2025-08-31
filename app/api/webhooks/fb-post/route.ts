// app/api/webhooks/fb-post/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { sendToN8n } from '@/lib/n8n';

export async function POST(req: Request) {
  // 1) Supabase server client (çerez adaptörü şart)
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const body = await req.json().catch(() => ({}));
  const { listing, fb } = body;
  
  if (!listing?.sourceUrl) {
    return NextResponse.json({ ok: false, message: 'sourceUrl gerekli' }, { status: 400 });
  }
  if (!fb?.pageId || !fb?.accessToken) {
    return NextResponse.json({ ok: false, message: 'Facebook entegrasyonu gerekli' }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'auth required' }, { status: 401 });

  const jobId = crypto.randomUUID();

  const payload = {
    action: 'post',
    user: { id: user.id, email: user.email },
    job: { id: jobId, kind: 'post', status: 'queued' },
    listing: { sourceUrl: listing.sourceUrl },
    options: {
      language: process.env.N8N_DEFAULT_LANGUAGE || 'tr',
      executionMode: 'prod',
    },
    fb: { pageId: fb.pageId, accessToken: fb.accessToken },
  };

  const r = await sendToN8n('post', payload);
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    return NextResponse.json({ ok: false, message: 'n8n error', detail }, { status: 502 });
  }
  return NextResponse.json({ ok: true, jobId });
}
