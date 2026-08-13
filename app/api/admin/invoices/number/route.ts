import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, RateLimitPresets.LOOSE)
  if (rateLimitResult) return rateLimitResult

  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    if (!body.revenueId) return NextResponse.json({ error: 'revenueId is required' }, { status: 400 })

    const { data: invoiceNumber, error } = await (adminClient as any).rpc('next_revenue_invoice_number')
    if (error || !invoiceNumber) {
      console.error('[Admin Invoice Number] Error:', error)
      return NextResponse.json({ error: 'Could not generate invoice number. Apply the invoice migration first.' }, { status: 500 })
    }

    return NextResponse.json({ invoiceNumber: String(invoiceNumber) })
  } catch (error) {
    console.error('[Admin Invoice Number] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
