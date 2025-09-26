import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';
import type { Database } from '@/types/supabase';

export async function POST(req: Request) {
  const supabase = createClient();
  const body = await req.json();

  // Beklenen alanlar (user_id hariç)
  const {
    adding_date,
    name,
    people,
    bedroom,
    cities,
    family_sharing,
    nationalities,
    jobs,
    pet,
    budget,
    move_in,
    phone,
  } = body;

  // Authenticated user id
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const user_id = user.id;

  const insertData: Database['public']['Tables']['clients']['Insert'] = {
    user_id,
    adding_date: adding_date ?? null,
    name: name ?? null,
    people: people != null ? String(people) : null,
    bedroom: bedroom != null ? String(bedroom) : null,
    cities: Array.isArray(cities) ? JSON.stringify(cities) : cities ?? null,
    family_sharing: typeof family_sharing === 'boolean' ? String(family_sharing) : family_sharing ?? null,
    nationalities: Array.isArray(nationalities) ? JSON.stringify(nationalities) : nationalities ?? null,
    jobs: Array.isArray(jobs) ? JSON.stringify(jobs) : jobs ?? null,
    pet: typeof pet === 'boolean' ? String(pet) : pet ?? null,
    budget: budget != null ? String(budget) : null,
    move_in: move_in ?? null,
    phone: phone ?? null,
  };

  const { error } = await supabase
    .from('clients')
    .insert([insertData]);

  if (!error) {
    // Yeni client eklenince activity tablosuna kayıt ekle
    await logActivity(supabase, {
      user_id,
      type: 'new_client_added',
      data: { name, phone }
    });
  }

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
