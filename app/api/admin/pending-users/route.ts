import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/pending-users
 * Fetch all pending users awaiting admin approval
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verify user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch pending users
    const { data: pendingUsers, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone, created_at')
      .eq('status', 'pending_admin')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch email addresses for each user
    const usersWithEmail = await Promise.all(
      (pendingUsers || []).map(async (user) => {
        const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id)
        return {
          ...user,
          email: authUser?.user?.email || 'N/A',
        }
      })
    )

    return NextResponse.json({ users: usersWithEmail }, { status: 200 })
  } catch (error) {
    console.error('Error in pending-users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
