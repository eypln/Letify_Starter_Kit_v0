import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request) {
  const { jobId, listingId, hardDeleteListing = false } = await req.json();

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  // 1) Job'ı iptal et (varsa)
  if (jobId) {
    await supabase
      .from('jobs')
      .update({ status: 'cancelled', progress_int: 0 })
      .eq('id', jobId)
      .eq('user_id', user.id);
  }

  // 2) Uploaded assets gibi geçici şeyleri temizle (varsa)
  if (listingId) {
    try {
      await supabase
        .from('uploaded_assets')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId);
    } catch { /* tablo yoksa sessiz geç */ }
  }

  // 3) Listing'i silmek istersen opsiyonel (sadece boş taslaksa önerilir)
  if (hardDeleteListing && listingId) {
    try {
      await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)
        .eq('user_id', user.id);
    } catch { /* izin yoksa ya da RLS engellerse sessiz geç */ }
  }

  return NextResponse.json({ ok: true });
}
