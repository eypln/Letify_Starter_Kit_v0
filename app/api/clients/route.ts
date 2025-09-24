import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/activity';

export async function POST(req: Request) {
  const supabase = createClient();
  const body = await req.json();

  // Beklenen alanlar
  const {
    user_id,
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

  const { error } = await supabase.from('clients').insert([
    {
      user_id,
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
    },
  ]);

  if (!error) {
    // Yeni client eklenince activity tablosuna kayıt ekle
    await logActivity({
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
