// app/api/webhooks/video-create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { sendToN8n } from '@/lib/n8n';
import { rateLimitByIP, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limiting: 10 requests per minute per IP (prevent spam)
  const rateLimitResult = await rateLimitByIP(req, RateLimitPresets.STRICT);
  if (rateLimitResult) return rateLimitResult;
  const cookieStore = await cookies();
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
  const { listing, images } = body;
  
  if (!listing?.sourceUrl) {
    return NextResponse.json({ ok: false, message: 'sourceUrl gerekli' }, { status: 400 });
  }
  if (!images || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ ok: false, message: 'En az bir görsel gerekli' }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'auth required' }, { status: 401 });

    const jobId = crypto.randomUUID();

    // Fetch FB integration for user
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

    // Get description from listing or body
    const description = listing?.description ?? body?.description ?? null;

    const payload = {
      action: 'prepareReels',
      user: { id: user.id, email: user.email },
      job: { id: jobId, kind: 'video', status: 'queued' },
      listing: { sourceUrl: listing.sourceUrl },
      options: {
        language: process.env.N8N_DEFAULT_LANGUAGE || 'tr',
        executionMode: 'prod',
        images: images,
      },
      fb,
      content: description ? { description } : undefined,
    };

    const r = await sendToN8n('prepareReels', payload);
    if (!r.ok) {
      let detail = '';
      if (r.data) {
        detail = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      } else if (typeof r.status === 'number') {
        detail = `n8n status: ${r.status}`;
      } else {
        detail = 'Unknown n8n error';
      }
      return NextResponse.json({ ok: false, message: 'n8n error', detail }, { status: 502 });
    }
    return NextResponse.json({ ok: true, jobId });
}
