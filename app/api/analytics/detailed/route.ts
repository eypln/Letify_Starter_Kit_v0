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
  const startDate = searchParams.get('start') // YYYY-MM-DD
  const endDate = searchParams.get('end') // YYYY-MM-DD
  const metricType = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '100')

  try {
    // Fetch detailed metrics
    let query = supabase
      .from('user_detailed_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('metric_date', { ascending: false })
      .limit(limit)

    if (startDate) {
      query = query.gte('metric_date', startDate)
    }

    if (endDate) {
      query = query.lte('metric_date', endDate)
    }

    if (metricType) {
      query = query.eq('metric_type', metricType)
    }

    const { data: metrics, error } = await query

    if (error) throw error

    // Calculate trends
    const trends: Record<string, { current: number; previous: number; change: number }> = {}

    if (metrics && metrics.length > 0) {
      // Group by metric type
      const groupedByType: Record<string, any[]> = {}
      metrics.forEach((m: any) => {
        if (!groupedByType[m.metric_type]) {
          groupedByType[m.metric_type] = []
        }
        groupedByType[m.metric_type].push(m)
      })

      // Calculate trends
      Object.entries(groupedByType).forEach(([type, values]) => {
        if (values.length >= 2) {
          const current = values[0].metric_value
          const previous = values[1].metric_value
          const change = ((current - previous) / (previous || 1)) * 100
          trends[type] = { current, previous, change }
        }
      })
    }

    return NextResponse.json({
      metrics,
      trends,
      count: metrics?.length || 0,
    })
  } catch (error) {
    console.error('Detailed metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detailed metrics' },
      { status: 500 }
    )
  }
}
