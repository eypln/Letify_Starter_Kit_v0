// lib/n8n.ts

export type N8nAction = 'generate'|'save'|'post'|'prepareReels'|'postReelsFb';

function n8nUrlFor(action: N8nAction) {
  const single = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL?.trim() || process.env.N8N_WEBHOOK_URL?.trim();
  if (single) return single;
  const base = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE?.trim() || process.env.N8N_WEBHOOK_BASE?.trim();
  if (!base) throw new Error('N8N webhook URL/base is not configured');
  const map: Record<N8nAction,string> = {
    generate: '/generate', save: '/save', post: '/fb-post', prepareReels: '/video-create', postReelsFb: '/fb-reels',
  };
  return base + map[action];
}

export async function sendToN8n(action: N8nAction, payload: Record<string, unknown>): Promise<{ok:boolean; status:number; data:unknown}> {
  const url = n8nUrlFor(action);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  let data: unknown = null;
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}