// lib/n8n.ts
export type N8nAction =
  | 'generate'
  | 'save'
  | 'post'
  | 'prepareReels'
  | 'postReelsFb';

export function n8nUrl() {
  const override =
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_TEST_OVERRIDE?.trim() ||
    process.env.N8N_WEBHOOK_TEST_OVERRIDE?.trim();
  if (override) return override; // normalde boş

  const url =
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL?.trim() ||
    process.env.N8N_WEBHOOK_URL?.trim();
  if (!url) throw new Error('N8N_WEBHOOK_URL missing');
  return url;
}

export async function sendToN8n(action: N8nAction, payload: any) {
  const url = n8nUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res;
}