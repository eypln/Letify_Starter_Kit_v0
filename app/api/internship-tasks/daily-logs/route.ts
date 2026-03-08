import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Belirli kullanıcının belirli tarih aralığındaki loglarını getir
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const userId = searchParams.get('user_id')
    const date = searchParams.get('date') // YYYY-MM-DD
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('internship_daily_logs')
      .select('*, internship_task_definitions(title, slug, sub_targets, daily_target)')

    // Intern sadece kendi loglarını görebilir, teamleader+ hepsini
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role === 'intern') {
      query = query.eq('user_id', user.id)
    } else if (userId) {
      query = query.eq('user_id', userId)
    }
    // else: teamleader+ gets ALL intern logs (no filter)

    if (date) {
      query = query.eq('log_date', date)
    } else if (startDate && endDate) {
      query = query.gte('log_date', startDate).lte('log_date', endDate)
    } else {
      // Default: bugünün logları
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('log_date', today)
    }

    const { data: logs, error } = await query.order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching daily logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

// POST: Yeni günlük log ekle veya mevcut count'u artır
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { task_definition_id, sub_target_key, notes, detail, detail_only } = body
    const today = new Date().toISOString().split('T')[0]

    // Mevcut log kontrol et
    const { data: existing } = await supabase
      .from('internship_daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('task_definition_id', task_definition_id)
      .eq('log_date', today)
      .eq('sub_target_key', sub_target_key)
      .single()

    if (existing) {
      // Mevcut count'u artır ve detail ekle
      const existingDetails = Array.isArray(existing.details) ? existing.details : []
      const newDetails = [...existingDetails, ...(detail ? [{ ...detail, timestamp: new Date().toISOString() }] : [])]
      
      const { data: updated, error } = await supabase
        .from('internship_daily_logs')
        .update({
          count: detail_only ? existing.count : existing.count + 1,
          notes: notes || existing.notes,
          details: newDetails,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ log: updated })
    } else {
      // Yeni log oluştur
      const { data: newLog, error } = await supabase
        .from('internship_daily_logs')
        .insert({
          user_id: user.id,
          task_definition_id,
          log_date: today,
          sub_target_key,
          count: detail_only ? 0 : 1,
          notes: notes || null,
          details: detail ? [{ ...detail, timestamp: new Date().toISOString() }] : [],
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ log: newLog }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating/updating daily log:', error)
    return NextResponse.json({ error: 'Failed to log progress' }, { status: 500 })
  }
}
