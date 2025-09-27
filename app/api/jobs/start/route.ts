

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { sendToN8n } from '@/lib/n8n';

type StartPayload =
  | { mode: 'url'; sourceUrl: string; language?: string }
  | { mode: 'manual'; listingId?: string; sourceUrl?: string; language?: string };

export async function POST(req: Request) {
  const body = (await req.json()) as StartPayload;

  // Auth
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  // Inputs
  const sourceUrl = 'sourceUrl' in body ? (body.sourceUrl ?? null) : null;
  if (body.mode === 'url' && !sourceUrl)
    return NextResponse.json({ ok: false, message: 'sourceUrl is required' }, { status: 400 });

  // 1) Listing: varsa bul, yoksa oluştur (property_url yoksa title ile kontrol)
  let listingId = body.mode === 'manual' ? body.listingId ?? null : null;
  // AddDialog ve stepper için: title alanı AddDialog'dan, property_url stepper'dan gelir. n8n ve stepper mantığı bozulmaz.
  const title = (body as any).title ?? null;

  if (!listingId) {
    let existing;
    if (sourceUrl) {
      // Önce property_url ile kontrol
      const { data } = await supabase
        .from('listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('property_url', sourceUrl)
        .maybeSingle();
      existing = data;
    } else if (title) {
      // property_url yoksa title ile kontrol
      const { data } = await supabase
        .from('listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', title)
        .maybeSingle();
      existing = data;
    }
    if (existing?.id) {
      listingId = existing.id;
    } else {
      // Yeni kayıt oluştur
      const insertFields: Record<string, any> = { user_id: user.id };
      if (sourceUrl) insertFields.property_url = sourceUrl;
      if (title) insertFields.title = title;
      const { data: newListing, error: listingErr } = await supabase
        .from('listings')
        .insert(insertFields)
        .select('id')
        .single();
      if (listingErr || !newListing) {
        console.error('[jobs.start] listings.insert', listingErr);
        return NextResponse.json({ ok: false, message: 'Failed to create listing' }, { status: 500 });
      }
      listingId = newListing.id;
    }
  }

  // 2) FB kimlikleri: users_integrations (fb_page_id, fb_access_token)
  let fb: { pageId?: string; accessToken?: string } | undefined;
  {
    const { data: integ } = await supabase
      .from('users_integrations')
      .select('fb_page_id, fb_access_token')
      .eq('user_id', user.id)
      .maybeSingle();
    if (integ?.fb_page_id && integ?.fb_access_token) {
      fb = { pageId: integ.fb_page_id, accessToken: integ.fb_access_token };
    }
  }

  // 3) Job insert (listing_id dolu)
  const payload = {
    mode: body.mode,
    sourceUrl,
    listingId,
    fb,
    options: {
      language: body.language ?? 'en',
      executionMode: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
    },
  };

  const { data: jobRow, error: insErr } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      kind: 'content',
      status: 'queued',
      progress_int: 0,
      listing_id: listingId,
      payload,
    })
    .select('id')
    .single();

  if (insErr || !jobRow) {
    console.error('[jobs.start] jobs.insert', insErr);
    return NextResponse.json({ ok: false, message: insErr?.message ?? 'Insert failed' }, { status: 500 });
  }

  // 4) n8n - tek webhook, action=generate; cevabı bekle ve job'ı finalize et
  const { ok: n8nOk, data: n8n } = await sendToN8n('generate', {
    action: 'generate',
    user: user.id,
    job: { id: jobRow.id, kind: 'content', status: 'queued' },
    listing: { sourceUrl },
    listingId,
    options: payload.options,
    fb,
  });

  if (n8nOk && n8n) {
    // 1) Description'ı normalize et
    const generatedDescription =
      n8n.generatedDescription ||
      n8n.output?.newPostDescription ||
      n8n.result?.generatedDescription ||
      n8n.content?.description ||
      '';

    // 2) Jobs.result — UI'nin beklediği tüm şekiller dolu olsun
    const jobResult: any = {
      generatedDescription,
      newPostDescription: generatedDescription,
      content: { description: generatedDescription },
      fields: {
        city: n8n.city ?? n8n.City,
        price: n8n.price ?? n8n.Price,
        deposit: n8n.deposit ?? n8n.Deposit,
        bedrooms: n8n.bedrooms ?? n8n.Bedroom,
        bathrooms: n8n.bathrooms ?? n8n.Bathroom,
        property_type: n8n.propertyType ?? n8n.PropertyType,
        sourceUrl: n8n.sourceUrl ?? sourceUrl ?? null,
      },
    };

    // 3) Listings — mevcut kolon adlarıyla güncelle
    const listingUpdate: Record<string, any> = {};
    if (generatedDescription) listingUpdate.description = generatedDescription;
    if (n8n.city)          listingUpdate.city = n8n.city;
    if (n8n.price)         listingUpdate.price = Number(n8n.price);
    if (n8n.deposit)       listingUpdate.deposit = Number(n8n.deposit);
    if (n8n.bedrooms)      listingUpdate.bedrooms = Number(n8n.bedrooms);
    if (n8n.bathrooms)     listingUpdate.bathrooms = Number(n8n.bathrooms);
    if (n8n.propertyType)  listingUpdate.property_type = n8n.propertyType;

    // 3a) Listings güncelle (varsa)
    if (Object.keys(listingUpdate).length > 0) {
      await supabase.from('listings')
        .update(listingUpdate)
        .eq('id', listingId!);
    }

    // 4) Job'ı finalize et
    await supabase
      .from('jobs')
      .update({
        status: n8n.status ?? 'done',
        progress_int: Number(n8n.progress_int ?? 100),
        result: jobResult,
      })
      .eq('id', jobRow.id);
  }

  return NextResponse.json({ ok: true, jobId: jobRow.id, listingId });
}
