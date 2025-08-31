// app/api/webhooks/content/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendToN8n } from '@/lib/n8n';
import crypto from 'crypto';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sourceUrl: string | undefined = body?.listing?.sourceUrl;

  if (!sourceUrl) {
    return NextResponse.json(
      { ok: false, message: 'sourceUrl gerekli' },
      { status: 400 }
    );
  }

  // 1) Get user session with @supabase/ssr
  const supabase = createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  
  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, message: 'auth_required' },
      { status: 401 }
    );
  }

  // 2) Profile validation/approval check (optional but recommended)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile) {
    if (!profile.full_name) {
      return NextResponse.json(
        { ok: false, message: 'full_name_required' },
        { status: 403 }
      );
    }
    if (!profile.phone) {
      return NextResponse.json(
        { ok: false, message: 'phone_required' },
        { status: 403 }
      );
    }
    if (profile.status !== 'approved') {
      return NextResponse.json(
        { ok: false, message: 'waiting_approval' },
        { status: 403 }
      );
    }
  }

  // 3) Get FB integration (optional)
  const { data: fb } = await supabase
    .from('users_integrations')
    .select('fb_page_id, fb_access_token')
    .eq('user_id', user.id)
    .maybeSingle();

  // 4) Generate listing ID - for now using a simple hash + timestamp
  const listingId = crypto
    .createHash('md5')
    .update(sourceUrl + Date.now())
    .digest('hex')
    .substring(0, 12);

  // 5) Prepare payload for n8n (single source of truth)
  const payload = {
    action: 'generate',
    user: { id: user.id, email: user.email },
    job: { kind: 'content', status: 'queued' },
    listing: { sourceUrl },
    options: {
      language: process.env.N8N_DEFAULT_LANGUAGE || 'tr',
      executionMode: 'prod'
    },
    fb: fb ? { pageId: fb.fb_page_id, accessToken: fb.fb_access_token } : null
  };

  // 6) Insert job into database first
  const { data: inserted, error: insErr } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      listing_id: listingId,
      kind: 'content',
      status: 'queued',
      progress_int: 0,
      payload: payload // Store the same payload that goes to n8n
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { ok: false, message: insErr?.message ?? 'insert_failed' },
      { status: 500 }
    );
  }

  // 7) Add jobId to payload and send to n8n
  const finalPayload = {
    ...payload,
    job: { ...payload.job, id: inserted.id }
  };

  try {
    const r = await sendToN8n('generate', finalPayload);
    if (!r.ok) {
      // If n8n fails, update job status to error
      await supabase
        .from('jobs')
        .update({ status: 'error', error_msg: 'n8n webhook failed' })
        .eq('id', inserted.id);
      
      const detail = await r.text().catch(() => '');
      return NextResponse.json(
        { ok: false, message: 'n8n error', detail },
        { status: 502 }
      );
    }
  } catch (error) {
    // If network error, update job status
    await supabase
      .from('jobs')
      .update({ status: 'error', error_msg: 'network error' })
      .eq('id', inserted.id);
    
    return NextResponse.json(
      { ok: false, message: 'network error' },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { ok: true, jobId: inserted.id, listingId },
    { status: 200 }
  );
}
