import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Debug endpoint to check push subscriptions
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try with regular client (will be limited by RLS)
    const supabase = await createClient();

    // Check current user's subscriptions
    const { data: mySubscriptions, error: myError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id);

    console.log('[Debug] My subscriptions (regular client):', mySubscriptions);
    console.log('[Debug] My error:', myError);

    // Try to get all subscriptions with regular client (will likely fail with RLS)
    const { data: allSubscriptions, error: allError } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, created_at');

    console.log('[Debug] All subscriptions (regular client):', allSubscriptions);
    console.log('[Debug] All error:', allError);

    // Try with admin client (should bypass RLS)
    const adminSupabase = createAdminClient();
    const { data: adminSubscriptions, error: adminError } = await adminSupabase
      .from('push_subscriptions')
      .select('user_id, endpoint, created_at');

    console.log('[Debug] All subscriptions (admin client):', adminSubscriptions);
    console.log('[Debug] Admin error:', adminError);

    // Check auth.users for this user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email,
        authUser: userData?.user?.id,
      },
      mySubscriptions: {
        count: mySubscriptions?.length || 0,
        data: mySubscriptions,
        error: myError,
      },
      allSubscriptionsWithRegularClient: {
        count: allSubscriptions?.length || 0,
        accessible: !allError,
        error: allError?.message,
      },
      allSubscriptionsWithAdminClient: {
        count: adminSubscriptions?.length || 0,
        accessible: !adminError,
        data: adminSubscriptions,
        error: adminError?.message,
      },
    });
  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug info', details: String(error) },
      { status: 500 }
    );
  }
}
