import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { sendToN8n } from '@/lib/n8n';

export async function POST(req: Request) {
  const { jobId, description } = await req.json();

  const cookieStore = cookies();
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
  await sendToN8n('save', {
    action: 'save',
    user: user.id,
    job: { id: jobId },
    listingId: job.listing_id,
    content: { description },
  });

  return NextResponse.json({ ok: true });
}
