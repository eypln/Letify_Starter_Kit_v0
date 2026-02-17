import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'

/**
 * GET /api/admin/pending-users
 * Fetch all pending users awaiting admin approval
 * 
 * Uses createAdminClient (service_role) for data fetching to bypass RLS
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 120 requests per minute per admin (loose - trusted users)
  const rateLimitResult = await rateLimit(request, RateLimitPresets.LOOSE);
  if (rateLimitResult) return rateLimitResult;
  try {
    const supabase = await createClient()

    console.log('[Pending Users API] Starting request...')

    // Verify user is admin (using regular client with session cookies)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log('[Pending Users API] No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      console.log('[Pending Users API] User is not admin:', user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('[Pending Users API] Admin verified, fetching pending users...')

    // Use admin client for data fetching to bypass RLS
    const adminSupabase = createAdminClient()

    // Fetch pending users from approval_queue + join with profiles
    // This ensures we show users who are in the approval queue, not just profiles table
    const { data: approvalQueue, error: queueError } = await adminSupabase
      .from('approval_queue')
      .select('user_id, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (queueError) {
      console.error('[Pending Users API] Error fetching approval queue:', queueError)
      return NextResponse.json({ error: queueError.message }, { status: 500 })
    }

    console.log('[Pending Users API] Found', approvalQueue?.length || 0, 'pending in approval_queue')

    // Also check profiles table for pending_admin users
    // This catches TWO cases:
    // 1. Users whose approval_queue entry was somehow missed entirely
    // 2. Users whose approval_queue was updated to 'approved' but profiles update failed (RLS bug)
    //    In this case approval_queue says 'approved' but profiles still says 'pending_admin'
    const { data: pendingProfiles } = await adminSupabase
      .from('profiles')
      .select('user_id, full_name, phone, role, created_at')
      .eq('status', 'pending_admin')

    console.log('[Pending Users API] Found', pendingProfiles?.length || 0, 'pending_admin in profiles table')

    // Find profiles with pending_admin that are NOT already in the pending approval_queue results
    const queueUserIds = new Set((approvalQueue || []).map(q => q.user_id))
    const missingFromQueue = (pendingProfiles || []).filter(p => !queueUserIds.has(p.user_id))

    if (missingFromQueue.length > 0) {
      console.log('[Pending Users API] Found', missingFromQueue.length, 'pending_admin profiles missing/inconsistent in approval_queue - fixing...')
      // Auto-fix: upsert entries into approval_queue (reset status to 'pending' for consistency)
      // This handles BOTH cases:
      // - approval_queue entry doesn't exist at all → INSERT
      // - approval_queue entry exists but with wrong status (e.g. 'approved' from failed RLS update) → UPDATE to 'pending'
      for (const missing of missingFromQueue) {
        const { error: upsertError } = await adminSupabase
          .from('approval_queue')
          .upsert(
            { user_id: missing.user_id, status: 'pending', reviewed_at: null }, 
            { onConflict: 'user_id' }
          )
        if (upsertError) {
          console.error('[Pending Users API] Error upserting approval_queue for:', missing.user_id, upsertError)
        }
      }
      console.log('[Pending Users API] Fixed', missingFromQueue.length, 'approval_queue entries')
    }

    // Combine all pending users
    const allPendingUserIds = [
      ...(approvalQueue || []).map(q => ({ user_id: q.user_id, created_at: q.created_at })),
      ...missingFromQueue.map(p => ({ user_id: p.user_id, created_at: p.created_at }))
    ]

    // Get profile details for each pending user
    const pendingUsers = await Promise.all(
      allPendingUserIds.map(async (queueItem) => {
        // Skip if user_id is null
        if (!queueItem.user_id) {
          return null
        }

        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('full_name, phone, role')
          .eq('user_id', queueItem.user_id)
          .single()

        return {
          user_id: queueItem.user_id,
          full_name: profile?.full_name || 'N/A',
          phone: profile?.phone || 'N/A',
          role: profile?.role || 'agent',
          created_at: queueItem.created_at,
        }
      })
    ).then(results => results.filter(Boolean)) // Remove null entries

    console.log('[Pending Users API] Fetched profile details for', pendingUsers.length, 'users')

    // Fetch email from auth.users using admin client
    const usersWithEmail = await Promise.all(
      pendingUsers.map(async (pendingUser) => {
        const u = pendingUser as { user_id: string; full_name: string; phone: string; role: string; created_at: string }
        
        try {
          // Use admin auth to get user email directly
          const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(u.user_id)
          
          if (authError) {
            console.error('[Pending Users API] Auth error for user:', u.user_id, authError)
          }
          
          const email = authUser?.user?.email || 'N/A'
          
          return {
            ...u,
            email,
          }
        } catch (err) {
          console.error('[Pending Users API] Error fetching email for user:', u.user_id, err)
          return {
            ...u,
            email: 'N/A',
          }
        }
      })
    )

    console.log('[Pending Users API] Returning', usersWithEmail.length, 'users with email')

    return NextResponse.json({ users: usersWithEmail }, { status: 200 })
  } catch (error) {
    console.error('[Pending Users API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
