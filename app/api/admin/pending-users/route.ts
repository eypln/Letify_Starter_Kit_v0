import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/pending-users
 * Fetch all pending users awaiting admin approval
 */
export async function GET() {
  try {
    const supabase = await createClient()

    console.log('[Pending Users API] Starting request...')

    // Verify user is admin
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

    // Fetch pending users from approval_queue + join with profiles
    // This ensures we show users who are in the approval queue, not just profiles table
    const { data: approvalQueue, error: queueError } = await supabase
      .from('approval_queue')
      .select('user_id, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (queueError) {
      console.error('[Pending Users API] Error fetching approval queue:', queueError)
      return NextResponse.json({ error: queueError.message }, { status: 500 })
    }

    console.log('[Pending Users API] Found', approvalQueue?.length || 0, 'pending in approval_queue')

    // Get profile details for each pending user
    const pendingUsers = await Promise.all(
      (approvalQueue || []).map(async (queueItem) => {
        // Skip if user_id is null
        if (!queueItem.user_id) {
          return null
        }

        const { data: profile } = await supabase
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

    // Fetch email from auth.users using custom RPC function
    const usersWithEmail = await Promise.all(
      pendingUsers.map(async (pendingUser) => {
        // Type guard: pendingUser is guaranteed to be non-null here due to filter(Boolean)
        const user = pendingUser as { user_id: string; full_name: string; phone: string; role: string; created_at: string }
        
        try {
          // Get email from auth metadata via RPC function
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: emailData, error: emailError } = await (supabase as any)
            .rpc('get_user_email', {
              user_uuid: user.user_id
            })
          
          if (emailError) {
            console.error('[Pending Users API] RPC error for user:', user.user_id, emailError)
          }
          
          // emailData is an array of objects with 'email' property
          const email = emailData && Array.isArray(emailData) && emailData.length > 0 
            ? emailData[0].email 
            : 'N/A'
          
          return {
            ...user,
            email,
          }
        } catch (err) {
          console.error('[Pending Users API] Error fetching email for user:', user.user_id, err)
          return {
            ...user,
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
