import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { sendToN8n } from '@/lib/n8n';

export async function POST(req: Request) {
  const { jobId, description } = await req.json();

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, listing_id, result')
    .eq('id', jobId)
    .single();
  if (error || !job) return NextResponse.json({ ok: false, message: 'Job not found' }, { status: 404 });

  // DB'de anında güncelle
  await supabase
    .from('jobs')
    .update({
      result: {
        ...(job.result ?? {}),
        generatedDescription: description,
        newPostDescription: description,
        content: { ...(job.result?.content ?? {}), description },
      },
    })
    .eq('id', jobId);

  if (job.listing_id) {
    await supabase
      .from('listings')
      .update({ description })
      .eq('id', job.listing_id);
  }

  // n8n ikinci kolu
  // Get sourceUrl and FB integration
  const sourceUrl = job?.result?.sourceUrl ?? null;
  let fb = { pageId: null, accessToken: null };
  try {
    const { data: integ } = await supabase
      .from('users_integrations')
      .select('fb_page_id, fb_access_token')
      .eq('user_id', user.id)
      .maybeSingle();
    if (integ?.fb_page_id && integ?.fb_access_token) {
      fb = { pageId: integ.fb_page_id, accessToken: integ.fb_access_token };
    }
  } catch {}

  await sendToN8n('save', {
    action: 'save',
    user: { id: user.id, email: user.email ?? '' },
    job: { id: jobId },
    listing: { sourceUrl },
    fb,
    content: { description },
  });

  return NextResponse.json({ ok: true });
}
