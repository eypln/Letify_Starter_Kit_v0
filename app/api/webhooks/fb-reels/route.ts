// app/api/webhooks/fb-reels/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { sendToN8n } from '@/lib/n8n';

export async function POST(req: Request) {
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
  const { videoUrl, fb } = body;
  
  if (!videoUrl) {
    return NextResponse.json({ ok: false, message: 'videoUrl gerekli' }, { status: 400 });
  }
  if (!fb?.pageId || !fb?.accessToken) {
    return NextResponse.json({ ok: false, message: 'Facebook entegrasyonu gerekli' }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'auth required' }, { status: 401 });

  const jobId = crypto.randomUUID();

  const payload = {
    action: 'postReelsFb',
    user: { id: user.id, email: user.email },
    job: { id: jobId, kind: 'reels_post', status: 'queued' },
    listing: { sourceUrl: null }, // reels share için listing gerekli değil
    options: {
      language: process.env.N8N_DEFAULT_LANGUAGE || 'tr',
      executionMode: 'prod',
      videoUrl: videoUrl,
    },
    fb: { pageId: fb.pageId, accessToken: fb.accessToken },
  };

  const r = await sendToN8n('postReelsFb', payload);
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    return NextResponse.json({ ok: false, message: 'n8n error', detail }, { status: 502 });
  }
  return NextResponse.json({ ok: true, jobId });
}
