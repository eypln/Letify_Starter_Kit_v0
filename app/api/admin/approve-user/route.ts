import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

/**
 * PUT /api/admin/approve-user
 * Approve or deny a user registration
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is admin
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser()

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', adminUser.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, action } = await request.json()

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, action' },
        { status: 400 }
      )
    }

    if (!['approve', 'deny'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "deny"' },
        { status: 400 }
      )
    }

    const newStatus = action === 'approve' ? 'approved' : 'denied'

    // Update user profile status
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating user status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    try {
      await logActivity(supabase, {
        user_id: adminUser.id,
        type: `user_${action === 'approve' ? 'approved' : 'denied'}`,
        data: {
          resource_type: 'user_approval',
          resource_id: userId,
          action: action === 'approve' ? 'approved' : 'denied'
        }
      })
    } catch (logError) {
      console.error('Failed to log activity:', logError)
    }

    return NextResponse.json(
      { success: true, message: `User ${action === 'approve' ? 'approved' : 'denied'} successfully` },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in approve-user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
