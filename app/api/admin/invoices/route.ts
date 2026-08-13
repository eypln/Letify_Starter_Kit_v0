import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, RateLimitPresets.LOOSE)
  if (rateLimitResult) return rateLimitResult

  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: invoices, error } = await adminClient
      .from('revenue')
      .select('*')
      .eq('inform_admin_for_invoice', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Admin Invoices API] Error fetching invoices:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const userIds = [...new Set((invoices || []).map((invoice) => invoice.user_id).filter(Boolean))]
    const { data: profiles } = userIds.length
      ? await adminClient.from('profiles').select('user_id, full_name').in('user_id', userIds)
      : { data: [] }
    const profileNames = new Map((profiles || []).map((item) => [item.user_id, item.full_name]))

    const enrichedInvoices = await Promise.all((invoices || []).map(async (invoice) => {
      const invoiceRecord = invoice as typeof invoice & { invoice_pdf_path?: string | null }
      const safeRefNo = (invoiceRecord.ref_no || `deal-${invoiceRecord.id}`).trim().replace(/[^a-zA-Z0-9_.-]/g, '_')
      const { data: leaseFiles } = await adminClient.storage.from('Lease_agreements').list(`${safeRefNo}/lease_agreement`, {
        limit: 1,
        sortBy: { column: 'created_at', order: 'desc' },
      })
      const leasePath = leaseFiles?.[0] ? `${safeRefNo}/lease_agreement/${leaseFiles[0].name}` : null
      const invoicePath = invoiceRecord.invoice_pdf_path || null
      return {
        ...invoice,
        requester_name: profileNames.get(invoice.user_id) || 'Unknown user',
        lease_agreement_url: leasePath ? adminClient.storage.from('Lease_agreements').getPublicUrl(leasePath).data.publicUrl : null,
        invoice_pdf_url: invoicePath ? adminClient.storage.from('Lease_agreements').getPublicUrl(invoicePath).data.publicUrl : null,
      }
    }))

    return NextResponse.json({ invoices: enrichedInvoices })
  } catch (error) {
    console.error('[Admin Invoices API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
