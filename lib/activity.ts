import type { SupabaseClient } from '@supabase/supabase-js'

/** Tanımlı activity type'ları - sadece bu listede olan type'lar kaydedilir */
const VALID_ACTIVITY_TYPES = [
  'listing', 'listing_created', 'listing_updated',
  'post_shared', 'profile_update',
  'subscription', 'credit',
  'client_created', 'new_client_added',
  'new_viewing_added', 'viewing_updated',
  'teamwork_listing_shared', 'teamwork_client_shared',
  'new_revenue_added', 'revenue_updated',
  'deal_finalized', 'agent_payment_sent',
  'user_approved', 'user_denied',
] as const;

// Sunucu ortamında Supabase client parametre olarak alınır
export async function logActivity(
  supabase: SupabaseClient,
  { user_id, type, data }: { user_id: string; type: string; data?: Record<string, unknown> }
) {
  // Validation: type ve user_id boş olmamalı
  if (!user_id || !type || !type.trim()) {
    if (process.env.NODE_ENV === 'development') console.warn('Activity log skipped: missing user_id or type');
    return;
  }
  // Bilinmeyen type'lar için uyarı ver ama kaydet (ileride UI'da handle edilebilir)
  if (!VALID_ACTIVITY_TYPES.includes(type as typeof VALID_ACTIVITY_TYPES[number])) {
    console.warn(`Activity log warning: unknown type '${type}' - consider adding to VALID_ACTIVITY_TYPES`);
  }
  try {
    await supabase.from('activity').insert({ user_id, type, data });
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.error('Activity log error:', e);
  }
}
