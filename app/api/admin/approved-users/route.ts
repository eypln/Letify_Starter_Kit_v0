import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[Approved Users API] Request received')

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Verify admin user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log('[Approved Users API] No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      console.log('[Approved Users API] User is not admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('[Approved Users API] Admin verified, fetching approved users')

    // Fetch all approved users with profile data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone, role, status')
      .eq('status', 'approved')
      .order('full_name', { ascending: true })

    if (profilesError) {
      console.error('[Approved Users API] Error fetching profiles:', profilesError)
      throw profilesError
    }

    console.log(`[Approved Users API] Found ${profiles?.length || 0} approved users`)

    // Fetch auth data for emails using admin client
    const usersWithEmails = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: authData } = await adminClient.auth.admin.getUserById(
          profile.user_id
        )
        
        return {
          ...profile,
          email: authData.user?.email || 'N/A',
        }
      })
    )

    console.log('[Approved Users API] Returning users with email data')

    return NextResponse.json({
      users: usersWithEmails,
      count: usersWithEmails.length,
    })
  } catch (error) {
    console.error('[Approved Users API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
