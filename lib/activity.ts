import type { SupabaseClient } from '@supabase/supabase-js'

// Sunucu ortamında Supabase client parametre olarak alınır
export async function logActivity(
  supabase: SupabaseClient,
  { user_id, type, data }: { user_id: string; type: string; data?: Record<string, unknown> }
) {
  try {
    await supabase.from('activity').insert({ user_id, type, data });
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.error('Activity log error:', e);
  }
}
