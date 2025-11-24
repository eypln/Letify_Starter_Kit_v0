import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url)
  const daysBack = parseInt(searchParams.get('days') || '30')
  const eventCategory = searchParams.get('category')

  try {
    let query = supabase
      .from('user_analytics_events')
      .select('event_type, event_category, created_at, event_data')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

    if (eventCategory) {
      query = query.eq('event_category', eventCategory)
    }

    const { data: events, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Calculate summary statistics
    const categoryDistribution: Record<string, number> = {}
    const typeDistribution: Record<string, number> = {}
    const dailyBreakdown: Record<string, number> = {}

    interface EventData {
      event_category: string;
      event_type: string;
      created_at: string;
    }

    events.forEach((event: EventData) => {
      // Category distribution
      categoryDistribution[event.event_category] = (categoryDistribution[event.event_category] || 0) + 1

      // Type distribution
      typeDistribution[event.event_type] = (typeDistribution[event.event_type] || 0) + 1

      // Daily breakdown
      const date = new Date(event.created_at).toLocaleDateString('tr-TR')
      dailyBreakdown[date] = (dailyBreakdown[date] || 0) + 1
    })

    return NextResponse.json({
      summary: {
        totalEvents: events.length,
        uniqueEventTypes: Object.keys(typeDistribution).length,
        uniqueCategories: Object.keys(categoryDistribution).length,
        daysBack,
      },
      categoryDistribution,
      typeDistribution,
      dailyBreakdown,
      recentEvents: events.slice(0, 10),
    })
  } catch (error) {
    console.error('Analytics summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics summary' },
      { status: 500 }
    )
  }
}
