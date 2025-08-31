// app/api/jobs/[id]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, message: 'auth_required' }, { status: 401 });
  }

  // RLS: user can only see their own jobs
  const { data, error } = await supabase
    .from('jobs')
    .select('id, status, progress_int, result, payload')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ ok: false, message: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, job: data });
}