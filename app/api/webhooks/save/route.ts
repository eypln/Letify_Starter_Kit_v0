// app/api/webhooks/save/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { sendToN8n } from '@/lib/n8n';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { jobId, description } = body ?? {};

  if (!jobId || !description?.trim()) {
    return NextResponse.json(
      { ok: false, message: 'jobId and description are required' },
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, message: 'auth_required' }, { status: 401 });
  }

  // Get job and payload (need listing source if required from payload.sourceUrl)
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, user_id, payload, result')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (jobErr || !job) {
    return NextResponse.json({ ok: false, message: 'job_not_found' }, { status: 404 });
  }

  const sourceUrl =
    job?.payload?.sourceUrl ??
    job?.result?.sourceUrl ??
    job?.payload?.listing?.sourceUrl ?? null;

  try {
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

    // Call second workflow (switch: action === 'save')
    const payload = {
      action: 'save',
      user: { id: user.id, email: user.email ?? '' }, // always send both
      job: { id: jobId, kind: 'content' },
      listing: { sourceUrl },
      fb,
      content: { description },
      options: { language: 'tr' },
      webhookUrl: process.env.NEXT_PUBLIC_WEBAPP_URL + '/api/n8n/status-callback',
      executionMode: 'production',
    };

    const r = await sendToN8n('save', payload);
    if (!r.ok) {
      let detail = '';
      if (r.data) {
        detail = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      } else if (typeof r.status === 'number') {
        detail = `n8n status: ${r.status}`;
      } else {
        detail = 'Unknown n8n error';
      }
      return NextResponse.json(
        { ok: false, message: 'n8n error', detail },
        { status: 502 }
      );
    }

    // Optional: Update job status to 'saving'
    await supabase
      .from('jobs')
      .update({ status: 'saving' })
      .eq('id', jobId)
      .eq('user_id', user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Save webhook error:', error);
    return NextResponse.json(
      { ok: false, message: 'network error' },
      { status: 502 }
    );
  }
}