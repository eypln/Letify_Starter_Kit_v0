import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const user = await getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await req.json()
    const { eventType, eventCategory, eventData = {} } = body

    if (!eventType || !eventCategory) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Insert event
    const { data, error } = await supabase
      .from('user_analytics_events')
      .insert({
        user_id: user.id,
        event_type: eventType,
        event_category: eventCategory,
        event_data: eventData,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Event tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}
