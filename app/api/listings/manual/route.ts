export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createServiceSupabase } from '@/lib/supabaseServerService';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server'; // mevcut user'ı okumak için

export async function POST(req: Request) {
  // multipart/form-data
  const form = await req.formData();

  const description  = String(form.get('description') ?? '');
  const city         = (form.get('city') as string) || null;
  const price        = form.get('price') ? Number(form.get('price')) : null;
  const bedroom      = form.get('bedroom') ? Number(form.get('bedroom')) : null;
  const bathroom     = form.get('bathroom') ? Number(form.get('bathroom')) : null;
  const propertyType = (form.get('propertyType') as string) || null;
  const file         = form.get('image') as File | null; // tek resim

  // oturumdan user_id
  const sbAuth = createClient();
  const { data: { user } } = await sbAuth.auth.getUser();
  if (!user) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });

  const service = createServiceSupabase();

  const listingId = crypto.randomUUID();

  // 1) görüntüyü storage'a yükle (varsa)
  let imageUrl: string | null = null;
  if (file) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `listings/${user.id}/${listingId}.${ext}`;

    const { error: upErr } = await service.storage.from('user_uploads').upload(path, bytes, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    });
    if (upErr) return NextResponse.json({ ok:false, error: upErr.message }, { status:500 });

    const { data: pub } = service.storage.from('user_uploads').getPublicUrl(path);
    imageUrl = pub.publicUrl;
  }

  // 2) listings'e yaz
  const upsert = {
    listing_id: listingId,
    user_id: user.id,
    image_url: imageUrl,
    property_url: null,      // manuel girişte yok
    city,
    price,
    bedrooms: bedroom,
    bathrooms: bathroom,
    property_type: propertyType,
    description,
  };

  const { error: lErr, data: lData } = await service.from('listings')
    .upsert(upsert, { onConflict: 'listing_id' })
    .select('*').single();

  if (lErr) return NextResponse.json({ ok:false, error: lErr.message }, { status:500 });

  // 3) jobs tablosuna kayıt (kind=post)
  const job = {
    user_id: user.id,
    listing_id: listingId,
    kind: 'post',
    status: 'queued',
    progress_int: 0,
    payload: {
      listing: {
        city, price, bedroom, bathroom, propertyType,
        description, imageUrl, sourceUrl: null
      }
    }
  };

  // jobs tablonun şemasına göre alan isimleri değişebilir; flexible insert:
  const { error: jErr } = await service.from('jobs').insert(job as any);
  if (jErr) {
    // jobs yazılamasa bile listing oluşturuldu; yine de 200 dönebiliriz
    console.warn('jobs insert error', jErr.message);
  }

  // 4) n8n “post” kolunu tetikle
  const hook = process.env.N8N_POST_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId,
          userId: user.id,
          listing: { city, price, bedroom, bathroom, propertyType, description, imageUrl }
        }),
      });
    } catch (e) {
      console.warn('n8n webhook call failed', (e as Error).message);
    }
  }

  return NextResponse.json({ ok:true, listingId, listing: lData });
}
