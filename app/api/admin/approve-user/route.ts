import { NextResponse, NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { sendEmail, generateUserApprovalEmail } from '@/lib/email'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'

/**
 * PUT /api/admin/approve-user
 * Approve or deny a user registration
 * 
 * IMPORTANT: Uses createAdminClient (service_role) for profile/queue updates
 * to bypass RLS policies. The regular client is only used for auth verification.
 */
export async function PUT(request: NextRequest) {
  // Rate limiting: 120 requests per minute per admin (loose - trusted users)
  const rateLimitResult = await rateLimit(request, RateLimitPresets.LOOSE);
  if (rateLimitResult) return rateLimitResult;
  try {
    const supabase = await createClient()

    // Verify user is admin (using regular client with cookies/session)
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

    // Use admin client (service_role) for database operations to bypass RLS
    // This is the critical fix: regular client with anon key was subject to RLS
    // and the update could silently fail (0 rows affected, no error)
    const adminSupabase = createAdminClient()

    // Get user info before updating (needed for email)
    const { data: userProfile } = await adminSupabase
      .from('profiles')
      .select('full_name, user_id')
      .eq('user_id', userId)
      .single()

    if (!userProfile) {
      console.error('[Approve User] User profile not found for userId:', userId)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Update user profile status using admin client (bypasses RLS)
    const { data: updatedProfile, error } = await adminSupabase
      .from('profiles')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('user_id, status')
      .single()

    if (error) {
      console.error('[Approve User] Error updating user status:', error)
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 })
    }

    if (!updatedProfile) {
      console.error('[Approve User] Profile update returned no data - update may have failed silently')
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 })
    }

    console.log(`[Approve User] User ${userId} status updated to: ${updatedProfile.status}`)

    // Update approval_queue table using admin client
    // Note: approval_queue only allows 'pending', 'approved', 'rejected' (CHECK constraint)
    // 'blocked' maps to 'rejected' in the queue
    const queueStatus = action === 'approve' ? 'approved' : 'rejected'
    const { error: queueError } = await adminSupabase
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
        // Get user email from auth.users using admin client
        const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(userId)
        
        const userEmail = authUser?.user?.email || null

        if (authError) {
          console.error('[Approve User] Error fetching user email:', authError)
        }

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
