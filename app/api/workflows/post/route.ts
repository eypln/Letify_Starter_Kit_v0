import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const payload = await req.json(); // { action:'post', user, job, listing, images? }
  const url = process.env.N8N_WEBHOOK_URL; // örn: https://n8n.letify.cloud/webhook/your-endpoint
  
  if (!url) {
    return NextResponse.json({ error: 'N8N_WEBHOOK_URL missing' }, { status: 500 });
  }

  console.log('🚀 Sending to n8n:', { action: payload.action, url });

  try {
    // Tek endpoint, action'ı body'de gönderiyoruz
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      console.error('❌ n8n error:', { status: res.status, data });
      return NextResponse.json({ error: data?.error || 'n8n error' }, { status: 500 });
    }

    console.log('✅ n8n response:', data);
    return NextResponse.json(data); // n8n Respond to Webhook: { result: { post_url: ... }, jobId: ... }
  } catch (error) {
    console.error('💥 n8n request failed:', error);
    return NextResponse.json({ error: 'Network error' }, { status: 500 });
  }
}