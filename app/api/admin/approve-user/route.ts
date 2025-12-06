import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { sendEmail, generateUserApprovalEmail } from '@/lib/email'

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

    if (!['approve', 'deny', 'block'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve", "deny", or "block"' },
        { status: 400 }
      )
    }

    const newStatus = action === 'approve' ? 'approved' : action === 'block' ? 'blocked' : 'denied'

    // Get user info before updating (needed for email)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, user_id')
      .eq('user_id', userId)
      .single()

    // Update user profile status
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('user_id', userId)

    if (error) {
      console.error('[Approve User] Error updating user status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Approve User] User ${userId} ${action === 'approve' ? 'approved' : action === 'block' ? 'blocked' : 'denied'}`)

    // Update approval_queue table
    const queueStatus = action === 'approve' ? 'approved' : action === 'block' ? 'blocked' : 'rejected'
    const { error: queueError } = await supabase
      .from('approval_queue')
      .update({ 
        status: queueStatus,
        reviewed_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (queueError) {
      console.error('[Approve User] Error updating approval_queue:', queueError)
      // Don't fail the request, approval_queue is secondary
    }

    // Send approval email to user (only if approved)
    if (action === 'approve' && userProfile) {
      try {
        // Get user email from auth.users
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: emailData } = await (supabase as any)
          .rpc('get_user_email', {
            user_uuid: userId
          })
        
        const userEmail = emailData && Array.isArray(emailData) && emailData.length > 0 
          ? emailData[0].email 
          : null

        if (userEmail) {
          const emailHtml = generateUserApprovalEmail({
            fullName: userProfile.full_name || 'User',
            email: userEmail,
          })

          const emailResult = await sendEmail({
            to: userEmail,
            subject: '✅ Your Letify Account Has Been Approved!',
            html: emailHtml,
          })

          if (emailResult.success) {
            console.log(`[Approve User] Approval email sent to ${userEmail}`)
          } else {
            console.error('[Approve User] Failed to send approval email:', emailResult.error)
          }
        } else {
          console.warn('[Approve User] Could not fetch user email for approval notification')
        }
      } catch (emailError) {
        console.error('[Approve User] Error sending approval email:', emailError)
        // Don't fail the approval if email fails
      }
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
