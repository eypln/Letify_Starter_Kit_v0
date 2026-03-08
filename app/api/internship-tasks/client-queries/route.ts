import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Client query'lerini getir
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    let query = supabase
      .from('internship_client_queries')
      .select('*')
      .order('created_at', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    // Intern sadece kendine atanmış query'leri görebilir
    if (profile?.role === 'intern') {
      query = query.eq('assigned_to', user.id)
    }

    const { data: queries, error } = await query

    if (error) throw error

    return NextResponse.json({ queries })
  } catch (error) {
    console.error('Error fetching client queries:', error)
    return NextResponse.json({ error: 'Failed to fetch queries' }, { status: 500 })
  }
}

// POST: Yeni client query oluştur (teamleader+)
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
    const { client_name, client_description, budget, location_preference, bedrooms, additional_notes, assigned_to, min_suggestions } = body

    // Task definition ID for deep-property-research
    const { data: taskDef } = await supabase
      .from('internship_task_definitions')
      .select('id')
      .eq('slug', 'deep-property-research')
      .single()

    const { data: query, error } = await supabase
      .from('internship_client_queries')
      .insert({
        task_definition_id: taskDef?.id || null,
        client_name,
        client_description,
        budget,
        location_preference,
        bedrooms,
        additional_notes: additional_notes || null,
        assigned_to: assigned_to || null,
        assigned_by: user.id,
        min_suggestions: min_suggestions || 5,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ query }, { status: 201 })
  } catch (error) {
    console.error('Error creating client query:', error)
    return NextResponse.json({ error: 'Failed to create query' }, { status: 500 })
  }
}

// PATCH: Client query güncelle (property suggestion ekle, status değiştir)
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

    const body = await request.json()
    const { query_id, action, ...data } = body

    if (!query_id) {
      return NextResponse.json({ error: 'query_id is required' }, { status: 400 })
    }

    const { data: existingQuery, error: fetchError } = await supabase
      .from('internship_client_queries')
      .select('*')
      .eq('id', query_id)
      .single()

    if (fetchError || !existingQuery) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 })
    }

    if (action === 'add_suggestion') {
      // Intern property suggestion ekleyebilir
      const existing = Array.isArray(existingQuery.property_suggestions) ? existingQuery.property_suggestions : []
      const newSuggestions = [
        ...existing,
        {
          ref_no: data.ref_no,
          city: data.city,
          bedrooms: data.bedrooms,
          price: data.price,
          status: 'pending',
          added_by: user.id,
          added_at: new Date().toISOString(),
        }
      ]

      const { data: updated, error } = await supabase
        .from('internship_client_queries')
        .update({
          property_suggestions: newSuggestions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', query_id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ query: updated })
    }

    if (action === 'reassign' && ['teamleader', 'manager', 'boss', 'admin'].includes(profile?.role || '')) {
      // Teamleader+ query'yi başka bir intern'e atayabilir
      if (!data.assigned_to) {
        return NextResponse.json({ error: 'assigned_to is required' }, { status: 400 })
      }
      const { data: updated, error } = await supabase
        .from('internship_client_queries')
        .update({
          assigned_to: data.assigned_to,
          updated_at: new Date().toISOString(),
        })
        .eq('id', query_id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ query: updated })
    }

    if (action === 'complete' && ['teamleader', 'manager', 'boss', 'admin'].includes(profile?.role || '')) {
      // Sadece teamleader+ query'yi tamamlanmış işaretleyebilir
      const { data: updated, error } = await supabase
        .from('internship_client_queries')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', query_id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ query: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating client query:', error)
    return NextResponse.json({ error: 'Failed to update query' }, { status: 500 })
  }
}
