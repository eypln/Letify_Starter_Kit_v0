

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { sendToN8n } from '@/lib/n8n';

type StartPayload =
  | { mode: 'url'; sourceUrl: string; language?: string }
  | { mode: 'manual'; listingId?: string; sourceUrl?: string; language?: string };

interface N8nResponse {
  generatedDescription?: string;
  output?: { newPostDescription?: string };
  result?: { generatedDescription?: string };
  content?: { description?: string };
  city?: string;
  City?: string;
  price?: number | string;
  Price?: number | string;
  deposit?: number | string;
  Deposit?: number | string;
  bedrooms?: number | string;
  Bedroom?: number | string;
  bathrooms?: number | string;
  Bathroom?: number | string;
  propertyType?: string;
  PropertyType?: string;
  sourceUrl?: string;
  status?: string;
  progress_int?: number | string;
  [key: string]: unknown;
}

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
  const title = (body as { title?: string }).title ?? null;

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
      const insertFields: Record<string, unknown> = { user_id: user.id, availability: 'Available' };
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
    // Type assertion for n8n response
    const n8nData = n8n as N8nResponse;
    
    // 1) Description'ı normalize et
    const generatedDescription =
      n8nData.generatedDescription ||
      n8nData.output?.newPostDescription ||
      n8nData.result?.generatedDescription ||
      n8nData.content?.description ||
      '';

    // 2) Jobs.result — UI'nin beklediği tüm şekiller dolu olsun
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jobResult: any = {
      generatedDescription,
      newPostDescription: generatedDescription,
      content: { description: generatedDescription },
      fields: {
        city: n8nData.city ?? n8nData.City,
        price: n8nData.price ?? n8nData.Price,
        deposit: n8nData.deposit ?? n8nData.Deposit,
        bedrooms: n8nData.bedrooms ?? n8nData.Bedroom,
        bathrooms: n8nData.bathrooms ?? n8nData.Bathroom,
        property_type: n8nData.propertyType ?? n8nData.PropertyType,
        sourceUrl: n8nData.sourceUrl ?? sourceUrl ?? null,
      },
    };

    // 3) Listings — mevcut kolon adlarıyla güncelle
    const listingUpdate: Record<string, unknown> = {};
    if (generatedDescription) listingUpdate.description = generatedDescription;
    if (n8nData.city)          listingUpdate.city = n8nData.city;
    if (n8nData.price)         listingUpdate.price = Number(n8nData.price);
    if (n8nData.deposit)       listingUpdate.deposit = Number(n8nData.deposit);
    if (n8nData.bedrooms)      listingUpdate.bedrooms = Number(n8nData.bedrooms);
    if (n8nData.bathrooms)     listingUpdate.bathrooms = Number(n8nData.bathrooms);
    if (n8nData.propertyType)  listingUpdate.property_type = n8nData.propertyType;

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
        status: n8nData.status ?? 'done',
        progress_int: Number(n8nData.progress_int ?? 100),
        result: jobResult,
      })
      .eq('id', jobRow.id);
  }

  return NextResponse.json({ ok: true, jobId: jobRow.id, listingId });
}
