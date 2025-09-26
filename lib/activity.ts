// Sunucu ortamında Supabase client parametre olarak alınır
export async function logActivity(supabase: any, { user_id, type, data }: { user_id: string, type: string, data?: any }) {
  try {
    await supabase.from('activity').insert({ user_id, type, data });
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.error('Activity log error:', e);
  }
}
