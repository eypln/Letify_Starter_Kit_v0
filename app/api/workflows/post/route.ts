import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const payload = await req.json(); // { action:'post', user, job, listing, images? }
  const url = process.env.N8N_WEBHOOK_URL; // örn: https://n8n.letify.cloud/webhook/your-endpoint

  // Debug: log full incoming payload
  console.log('🟢 [API] /api/workflows/post - Incoming payload:', JSON.stringify(payload, null, 2));

  if (!url) {
    console.error('🔴 [API] N8N_WEBHOOK_URL missing');
    return NextResponse.json({ error: 'N8N_WEBHOOK_URL missing' }, { status: 500 });
  }

  try {
    // Tek endpoint, action'ı body'de gönderiyoruz
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    // Debug: log n8n response
    console.log('🟢 [API] /api/workflows/post - n8n response:', JSON.stringify(data, null, 2));

    if (!res.ok) {
      console.error('❌ n8n error:', { status: res.status, data });
      return NextResponse.json({ error: data?.error || 'n8n error' }, { status: 500 });
    }

    return NextResponse.json(data); // n8n Respond to Webhook: { result: { post_url: ... }, jobId: ... }
  } catch (error) {
    console.error('💥 n8n request failed:', error);
    return NextResponse.json({ error: 'Network error' }, { status: 500 });
  }
}