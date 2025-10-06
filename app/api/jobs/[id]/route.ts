// app/api/jobs/[id]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // params'ı await et
  const { id } = await params;
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
      cookies: { 
        get(name: string) {
          const cookie = cookieStore.get(name);
          return cookie ? cookie.value : undefined;
        }
      } 
    }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, message: 'auth_required' }, { status: 401 });
  }

  // RLS: user can only see their own jobs
  const { data, error } = await supabase
    .from('jobs')
    .select('id, status, progress_int, result, payload')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json({ ok: false, message: 'not_found' }, { status: 404 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, message: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, job: data });
}