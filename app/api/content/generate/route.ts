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
  // sourceUrl'yi normalize et: body, body.listing, body.sourceUrl, body.url, body.listingUrl
  const sourceUrl =
    body?.listing?.sourceUrl ??
    body?.sourceUrl ??
    body?.url ??
    body?.listingUrl ??
    null;

  if (!sourceUrl) {
    return NextResponse.json({ ok: false, message: 'sourceUrl gerekli' }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'auth required' }, { status: 401 });

  const jobId = crypto.randomUUID();

  // Get FB integration
  let fb = { pageId: null, accessToken: null };
  try {
    const { data: integ } = await supabase
      .from('users_integrations')
      .select('fb_page_id, fb_access_token')
      .eq('user_id', user.id)
      .maybeSingle();
    if (integ?.fb_page_id && integ?.fb_access_token) {
      fb = { pageId: integ.fb_page_id, accessToken: integ.fb_access_token };
    }
  } catch {}

  const description = body?.description ?? body?.listing?.description ?? null;

  const payload = {
    action: 'generate',
    user: { id: user.id, email: user.email },
    job: { id: jobId, kind: 'content', status: 'queued' },
    listing: { sourceUrl },
    options: {
      language: process.env.N8N_DEFAULT_LANGUAGE || 'tr',
      executionMode: 'prod',
    },
    fb,
    content: description ? { description } : undefined,
  };

  const r = await sendToN8n('generate', payload);
  if (!r.ok) {
    let detail = '';
    if (typeof r.data === 'string') {
      detail = r.data;
    } else if (r.data) {
      detail = JSON.stringify(r.data);
    } else {
      detail = 'Unknown n8n error';
    }
    return NextResponse.json({ ok: false, message: 'n8n error', detail }, { status: 502 });
  }
  return NextResponse.json({ ok: true, jobId });
}