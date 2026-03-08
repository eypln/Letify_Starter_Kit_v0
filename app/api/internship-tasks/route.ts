import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Tüm görev tanımlarını getir
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: tasks, error } = await supabase
      .from('internship_task_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching task definitions:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST: Yeni görev tanımı oluştur (teamleader+)
export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, guide_content, category, daily_target, daily_target_label, sub_targets, message_templates } = body

    // Generate slug from title
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const { data: task, error } = await supabase
      .from('internship_task_definitions')
      .insert({
        title,
        slug,
        description,
        guide_content: guide_content || '',
        category: category || 'daily',
        daily_target: daily_target || 0,
        daily_target_label: daily_target_label || null,
        sub_targets: sub_targets || [],
        message_templates: message_templates || [],
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Error creating task definition:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
