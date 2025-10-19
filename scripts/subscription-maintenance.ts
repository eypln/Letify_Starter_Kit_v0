// Scheduled script: subscription-maintenance.ts
// - Sends reminder emails 3 and 1 day before subscription end
// - Downgrades users to free plan if not renewed after period end

import { createClient } from '@supabase/supabase-js';
// Email fonksiyonu kaldırıldı, sadece downgrade işlemi yapılacak

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


async function main() {
  const now = new Date();
  // Sadece süresi dolan abonelikleri downgrade et
  const { data: activeSubs, error } = await supabase
    .from('billing_subscriptions')
    .select('id, user_id, current_period_end, plan_type, status')
    .eq('status', 'active');
  if (error) throw error;

  for (const sub of activeSubs || []) {
    const end = new Date(sub.current_period_end);
    if (now > end) {
      await supabase
        .from('billing_subscriptions')
        .update({ plan_type: 'free', status: 'canceled' })
        .eq('id', sub.id);
      console.log(`Subscription ${sub.id} downgraded to free.`);
    }
  }
}

main().catch(console.error);
