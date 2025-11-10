import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get all teamwork clients (all users can see all shared clients)
    const { data: clients, error } = await supabase
      .from('teamwork_clients')
      .select('*')
      .order('teamwork_date', { ascending: false });

    if (error) {
      console.error('Error fetching teamwork clients:', error);
      return NextResponse.json({ error: 'Failed to fetch teamwork clients' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error('Error in teamwork clients getter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
