// app/api/content/generate/route.ts
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
  const sourceUrl = body?.listing?.sourceUrl;
  
  if (!sourceUrl) {
    return NextResponse.json({ ok: false, message: 'sourceUrl gerekli' }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'auth required' }, { status: 401 });

  const jobId = crypto.randomUUID();

  const payload = {
    action: 'generate',
    user: { id: user.id, email: user.email },
    job: { id: jobId, kind: 'content', status: 'queued' },
    listing: { sourceUrl },
    options: {
      language: process.env.N8N_DEFAULT_LANGUAGE || 'tr',
      executionMode: 'prod',
    },
    fb: { pageId: null, accessToken: null }, // profil ekli ise doldur
  };

  const r = await sendToN8n('generate', payload);
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    return NextResponse.json({ ok: false, message: 'n8n error', detail }, { status: 502 });
  }
  return NextResponse.json({ ok: true, jobId });
}