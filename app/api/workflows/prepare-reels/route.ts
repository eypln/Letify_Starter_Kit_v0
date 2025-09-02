import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 dk - render süresi

const FALLBACK_N8N = 'https://n8n.letify.cloud/webhook/ac9fe8fc-4aa2-4864-82fb-8bfa9ce33208';

export async function POST(req: Request) {
  const payload = await req.json();
  const url = process.env.N8N_WEBHOOK_URL || FALLBACK_N8N;

  const n8nRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(payload),
  });

  const ct = n8nRes.headers.get('content-type') || '';
  let data: any;

  try {
    if (ct.includes('application/json')) {
      data = await n8nRes.json();
    } else {
      const raw = await n8nRes.text(); // bazen boş da olabilir
      data = raw ? (() => { try { return JSON.parse(raw); } catch { return { raw }; } })() : {};
    }
  } catch {
    data = {};
  }

  if (!n8nRes.ok) {
    return NextResponse.json(
      { error: data?.error || 'n8n error', data },
      { status: 500 }
    );
  }

  const videoUrl =
    data?.result?.reelPreviewUrl ??
    data?.reelPreviewUrl ??
    data?.result?.video_url ??
    data?.video_url ??
    data?.googleDriveUrl ??
    data?.driveUrl ??
    data?.url ??
    null;

  return NextResponse.json({
    ok: true,
    result: { reelPreviewUrl: videoUrl, jobId: payload?.job?.id ?? null },
    n8n: data,
  });
}