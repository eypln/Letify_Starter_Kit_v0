import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'

const BUCKET = 'Lease_agreements'

type InvoiceDocumentType = 'invoice_owner' | 'invoice_client'

function sanitizePathPart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_.-]/g, '_')
}

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

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const revenueId = String(formData.get('revenueId') || '')
    const documentType = String(formData.get('documentType') || '') as InvoiceDocumentType
    const requestedInvoiceNumber = String(formData.get('invoiceNumber') || '')
    const pdf = formData.get('pdf')

    if (!revenueId || !['invoice_owner', 'invoice_client'].includes(documentType) || !(pdf instanceof File)) {
      return NextResponse.json({ error: 'revenueId, documentType and PDF are required' }, { status: 400 })
    }

    if (pdf.type !== 'application/pdf' || pdf.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'The invoice must be a PDF smaller than 10MB' }, { status: 400 })
    }

    const { data: revenue, error: revenueError } = await adminClient
      .from('revenue')
      .select('id, ref_no')
      .eq('id', revenueId)
      .single()

    if (revenueError || !revenue) {
      return NextResponse.json({ error: 'Revenue record not found' }, { status: 404 })
    }

    let invoiceNumber = requestedInvoiceNumber
    if (!invoiceNumber) {
      const { data, error: numberError } = await (adminClient as any).rpc('next_revenue_invoice_number')
      if (numberError || !data) {
        console.error('[Admin Invoice Generate] Invoice number error:', numberError)
        return NextResponse.json({ error: 'Could not generate invoice number. Apply the invoice migration first.' }, { status: 500 })
      }
      invoiceNumber = String(data)
    }

    const safeRefNo = sanitizePathPart(revenue.ref_no || `deal-${revenue.id}`)
    const storagePath = `${safeRefNo}/${documentType}/${invoiceNumber}.pdf`
    const pdfBytes = new Uint8Array(await pdf.arrayBuffer())

    const { error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .upload(storagePath, pdfBytes, {
        upsert: true,
        contentType: 'application/pdf',
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('[Admin Invoice Generate] Storage error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    const rawValue = (key: string) => {
      const value = formData.get(key)
      return value === null || value === '' ? null : String(value)
    }
    const numericValue = (key: string) => {
      const value = rawValue(key)
      return value === null ? null : Number(value)
    }

    const { data: updatedRevenue, error: updateError } = await (adminClient as any)
      .from('revenue')
      .update({
        invoice_number: String(invoiceNumber),
        invoice_pdf_path: storagePath,
        invoice_document_type: documentType,
        invoice_date: rawValue('invoiceDate'),
        invoice_due_date: rawValue('dueDate'),
        invoice_vat_number: rawValue('vatNumber'),
        invoice_company_name: rawValue('companyName'),
        invoice_branch_address: rawValue('branchAddress'),
        invoice_beneficiary_name: rawValue('beneficiaryName'),
        invoice_iban: rawValue('iban'),
        invoice_bic: rawValue('bic'),
        invoice_description: rawValue('description'),
        invoice_quantity: numericValue('quantity'),
        invoice_unit_price: numericValue('unitPrice'),
        invoice_tax_rate: numericValue('taxRate'),
        invoice_total_amount: numericValue('totalAmount'),
        admin_invoice_notified: true,
      })
      .eq('id', revenueId)
      .select('*')
      .single()

    if (updateError) {
      await adminClient.storage.from(BUCKET).remove([storagePath])
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      invoiceNumber: String(invoiceNumber),
      storagePath,
      revenue: updatedRevenue,
    })
  } catch (error) {
    console.error('[Admin Invoice Generate] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
