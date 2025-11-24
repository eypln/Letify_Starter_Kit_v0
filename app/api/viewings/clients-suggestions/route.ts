import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch client name and phone suggestions from clients
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch clients with only necessary fields
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  // Transform data for autocomplete
  const suggestions = data?.map(client => ({
    value: client.id,
    label: client.name || 'No name',
    phone: client.phone
  })) || [];

  return NextResponse.json({ success: true, data: suggestions });
}
