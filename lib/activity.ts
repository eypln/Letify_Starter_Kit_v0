import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function logActivity({ user_id, type, data }: { user_id: string, type: string, data?: any }) {
  try {
    await supabase.from('activity').insert({ user_id, type, data });
  } catch (e) {
    // Sessizce yut, loglama hatası UI'ı bozmasın
    if (process.env.NODE_ENV === 'development') console.error('Activity log error:', e);
  }
}
