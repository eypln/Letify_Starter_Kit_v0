// app/api/n8n/status-callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // 1) Ham gövdeyi al (HMAC bu metin üstunden hesaplanır)
  const raw = await req.text();

  // 2) İmzayı header YOKSA query'den kabul et (smee header'ı düşürebiliyor)
  const url = new URL(req.url);
  const headerSig = req.headers.get("x-letify-signature") ?? "";
  const querySig  = url.searchParams.get("sig") ?? "";
  const providedSig = headerSig || querySig;

  // Güvenli geçici bayrak - env'de 1 ise imza kontrolünü atla
  const SKIP = process.env.SKIP_SIGNATURE_CHECK === '1';
  const secret = process.env.N8N_STATUS_CALLBACK_SECRET || "";

  console.log('🔐 Signature check:', { 
    skip: SKIP, 
    hasHeader: !!headerSig, 
    hasQuery: !!querySig, 
    hasSecret: !!secret 
  });

  if (!SKIP) {
    // 1) header veya query'den imzayı al
    if (!providedSig || !secret) {
      console.warn('[status-callback] signature missing', { providedSig: !!providedSig, secret: !!secret });
      return NextResponse.json({ ok: false, error: "signature missing" }, { status: 401 });
    }
    
    // 2) ham body stringiyle HMAC doğrula
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(providedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      console.warn('[status-callback] bad signature', { expected: expected.slice(0, 10), provided: providedSig.slice(0, 10) });
      return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
    }
    
    console.log('✅ Signature verified successfully');
  } else {
    console.log('⚠️ HMAC verification SKIPPED (development mode)');
  }

  // 3) JSON'a parse et
  let body: any;
  try { 
    body = JSON.parse(raw); 
  } catch { 
    console.error('[status-callback] invalid json', { sample: raw.slice(0, 200) });
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }); 
  }

  console.log('📥 Status callback received:', body);

  const jobId = body?.jobId;
  if (!jobId || typeof jobId !== "string") {
    console.error('❌ jobId required', { jobId, type: typeof jobId });
    return NextResponse.json({ ok: false, error: "jobId required" }, { status: 400 });
  }

  console.log('🎯 Processing job:', jobId);

  // 4) Supabase güncelle
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! // service role key
  );

  const update = {
    status: body.status ?? "done",
    progress_int: body.progress_int ?? 100,
    result: body.result ?? body, // n8n sonuçlarını result sütununa yaz
    updated_at: new Date().toISOString()
  };

  console.log('🔄 Updating job with:', update);

  // NOT: jobs tablosunda PK sütunun adı çoğunlukla "id" (uuid). Eğer sende "uuid" ise onu kullan.
  const { error } = await supabase.from("jobs").update(update).eq("id", jobId);

  if (error) {
    console.error('[status-callback] supabase error', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  console.log('✅ Job updated successfully');
  return NextResponse.json({ ok: true });
}