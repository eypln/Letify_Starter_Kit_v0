import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// First call status options
const FIRST_CALL_STATUS_OPTIONS = [
  'No Reply',
  'Not interested anymore',
  'Missing Contact',
  'Requires Follow-up',
  'Scheduled Interview',
  'Found a job',
  'Refused Applicant',
] as const

// VAT Type options
const VAT_TYPE_OPTIONS = [
  'Vatable (%40)',
  'Full Time (%32)',
  'Part Time (%36)',
] as const

export async function GET() {
  try {
    const supabase = await createClient()

    // Check user authentication and role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['teamleader', 'manager', 'boss', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch all applications
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (supabase as any)
      .from('applications')
      .select('*', { count: 'exact' })
      .order('application_date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data,
      count,
      statusOptions: FIRST_CALL_STATUS_OPTIONS,
      vatTypeOptions: VAT_TYPE_OPTIONS,
    })
  } catch (error) {
    console.error('Applications GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check user authentication and role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['teamleader', 'manager', 'boss', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()

    const payload = {
      user_id: user.id,
      application_date: body.application_date,
      applicant_name: body.applicant_name,
      nationality: body.nationality || null,
      phone: body.phone || null,
      email: body.email || null,
      industry_experience: body.industry_experience || null,
      re_experience: body.re_experience || false,
      first_call_status: body.first_call_status || null,
      second_call_notes: body.second_call_notes || null,
      appointment_date: body.appointment_date || null,
      interview_point: body.interview_point || null,
      vat_type: body.vat_type || null,
      start_date: body.start_date || null,
      hired: body.hired || false,
      cv_webviewlink: body.cv_webviewlink || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('applications')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Applications POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check user authentication and role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['teamleader', 'manager', 'boss', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 })
    }

    const payload = {
      application_date: body.application_date,
      applicant_name: body.applicant_name,
      nationality: body.nationality || null,
      phone: body.phone || null,
      email: body.email || null,
      industry_experience: body.industry_experience || null,
      re_experience: body.re_experience || false,
      first_call_status: body.first_call_status || null,
      second_call_notes: body.second_call_notes || null,
      appointment_date: body.appointment_date || null,
      interview_point: body.interview_point || null,
      vat_type: body.vat_type || null,
      start_date: body.start_date || null,
      hired: body.hired || false,
      cv_webviewlink: body.cv_webviewlink || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('applications')
      .update(payload)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Applications PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check user authentication and role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['teamleader', 'manager', 'boss', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const ids = searchParams.get('ids') // comma-separated for bulk delete

    if (!id && !ids) {
      return NextResponse.json({ error: 'Application ID(s) required' }, { status: 400 })
    }

    if (ids) {
      // Bulk delete
      const idArray = ids.split(',').map(Number).filter(n => !isNaN(n))
      if (idArray.length === 0) {
        return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('applications')
        .delete()
        .in('id', idArray)

      if (error) {
        console.error('Bulk delete error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, deleted: idArray.length })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('applications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Applications DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Bulk update status or inline status change
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || !['teamleader', 'manager', 'boss', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { ids, first_call_status } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 })
    }

    if (first_call_status !== undefined && first_call_status !== null) {
      const validStatuses = [...FIRST_CALL_STATUS_OPTIONS, '']
      if (!validStatuses.includes(first_call_status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('applications')
      .update({ first_call_status: first_call_status || null })
      .in('id', ids)
      .select()

    if (error) {
      console.error('Bulk update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data, updated: data?.length || 0 })
  } catch (error) {
    console.error('Applications PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
