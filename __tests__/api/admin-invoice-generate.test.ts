jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number } = {}) => ({
      status: init.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
  RateLimitPresets: { LOOSE: 'loose' },
}))

jest.mock('@/lib/supabase/server', () => {
  const supabase = { auth: { getUser: jest.fn() }, from: jest.fn() }
  const adminClient = { from: jest.fn(), rpc: jest.fn(), storage: { from: jest.fn() } }
  return {
    createClient: jest.fn().mockResolvedValue(supabase),
    createAdminClient: jest.fn().mockReturnValue(adminClient),
    __mockSupabase: supabase,
    __mockAdminClient: adminClient,
  }
})

import { POST } from '@/app/api/admin/invoices/generate/route'

const mockSupabase = jest.requireMock('@/lib/supabase/server').__mockSupabase
const mockAdminClient = jest.requireMock('@/lib/supabase/server').__mockAdminClient

function roleQuery(role: string) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role }, error: null }),
  }
}

function request(formData: FormData) {
  return { formData: async () => formData } as Request
}

function pdfFile() {
  const file = new File(['pdf'], 'invoice.pdf', { type: 'application/pdf' })
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => Uint8Array.from([112, 100, 102]).buffer,
  })
  return file
}

function validForm(overrides: Record<string, string | File> = {}) {
  return form({
    revenueId: 'revenue-1',
    documentType: 'invoice_owner',
    invoiceNumber: 'INV-1',
    pdf: pdfFile(),
    ...overrides,
  })
}

function form(values: Record<string, string | File> = {}) {
  const data = new FormData()
  Object.entries(values).forEach(([key, value]) => data.set(key, value))
  return data
}

describe('POST /api/admin/invoices/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockSupabase.from.mockReturnValue(roleQuery('admin'))
  })

  it('rejects unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })
    const response = await POST(request(form()))
    expect(response.status).toBe(401)
    expect(mockAdminClient.from).not.toHaveBeenCalled()
  })

  it('rejects non-admin users', async () => {
    mockSupabase.from.mockReturnValueOnce(roleQuery('agent'))
    const response = await POST(request(form()))
    expect(response.status).toBe(403)
    expect(mockAdminClient.from).not.toHaveBeenCalled()
  })

  it('rejects missing form fields and invalid document types', async () => {
    const missing = await POST(request(form()))
    expect(missing.status).toBe(400)

    const invalidType = await POST(request(form({
      revenueId: 'revenue-1',
      documentType: 'other',
      pdf: new File(['pdf'], 'invoice.pdf', { type: 'application/pdf' }),
    })))
    expect(invalidType.status).toBe(400)
  })

  it('rejects non-PDF and oversized documents', async () => {
    const textFile = await POST(request(form({
      revenueId: 'revenue-1',
      documentType: 'invoice_owner',
      pdf: new File(['text'], 'invoice.txt', { type: 'text/plain' }),
    })))
    expect(textFile.status).toBe(400)

    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', {
      type: 'application/pdf',
    })
    const largeFile = await POST(request(form({
      revenueId: 'revenue-1',
      documentType: 'invoice_owner',
      pdf: oversized,
    })))
    expect(largeFile.status).toBe(400)
  })

  it('returns not found when the revenue record is missing', async () => {
    mockAdminClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
    })

    const response = await POST(request(form({
      revenueId: 'missing-revenue',
      documentType: 'invoice_owner',
      pdf: new File(['pdf'], 'invoice.pdf', { type: 'application/pdf' }),
    })))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Revenue record not found' })
  })

  it('returns an invoice-number migration error when no number is supplied', async () => {
    mockAdminClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'revenue-1', ref_no: 'REF/1' }, error: null }),
    })
    mockAdminClient.rpc.mockResolvedValue({ data: null, error: new Error('missing function') })

    const response = await POST(request(form({
      revenueId: 'revenue-1',
      documentType: 'invoice_owner',
      pdf: new File(['pdf'], 'invoice.pdf', { type: 'application/pdf' }),
    })))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Could not generate invoice number. Apply the invoice migration first.',
    })
  })

  it('returns a storage error before updating revenue', async () => {
    mockAdminClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'revenue-1', ref_no: 'REF/1' }, error: null }),
    })
    mockAdminClient.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: new Error('storage failure') }),
    })

    const response = await POST(request(validForm()))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to upload invoice PDF' })
  })

  it('removes the uploaded PDF when revenue update fails', async () => {
    const updateQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('update failure') }),
    }
    mockAdminClient.from
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'revenue-1', ref_no: 'REF/1' }, error: null }),
      }))
      .mockImplementationOnce(() => updateQuery)
    const remove = jest.fn().mockResolvedValue({ error: null })
    mockAdminClient.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
      remove,
    })

    const response = await POST(request(validForm()))

    expect(response.status).toBe(500)
    expect(remove).toHaveBeenCalledWith(['REF_1/invoice_owner/INV-1.pdf'])
    await expect(response.json()).resolves.toEqual({ error: 'Failed to save invoice details' })
  })

  it('uploads the PDF and returns the updated revenue record', async () => {
    const updatedRevenue = {
      id: 'revenue-1',
      invoice_number: 'INV-1',
      invoice_pdf_path: 'REF_1/invoice_owner/INV-1.pdf',
    }
    const updateQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: updatedRevenue, error: null }),
    }
    mockAdminClient.from
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'revenue-1', ref_no: 'REF/1' }, error: null }),
      }))
      .mockImplementationOnce(() => updateQuery)
    const upload = jest.fn().mockResolvedValue({ error: null })
    mockAdminClient.storage.from.mockReturnValue({ upload })

    const response = await POST(request(validForm({
      invoiceDate: '2026-08-15',
      totalAmount: '1200',
    })))

    expect(response.status).toBe(200)
    expect(upload).toHaveBeenCalledWith(
      'REF_1/invoice_owner/INV-1.pdf',
      expect.any(Uint8Array),
      expect.objectContaining({ contentType: 'application/pdf', upsert: true })
    )
    await expect(response.json()).resolves.toEqual({
      invoiceNumber: 'INV-1',
      storagePath: 'REF_1/invoice_owner/INV-1.pdf',
      revenue: updatedRevenue,
    })
  })
})
