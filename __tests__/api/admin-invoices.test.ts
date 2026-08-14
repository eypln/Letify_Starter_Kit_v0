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
  const adminClient = { from: jest.fn(), storage: { from: jest.fn() } }
  return {
    createClient: jest.fn().mockResolvedValue(supabase),
    createAdminClient: jest.fn().mockReturnValue(adminClient),
    __mockSupabase: supabase,
    __mockAdminClient: adminClient,
  }
})

import { GET } from '@/app/api/admin/invoices/route'

const mockSupabase = jest.requireMock('@/lib/supabase/server').__mockSupabase
const mockAdminClient = jest.requireMock('@/lib/supabase/server').__mockAdminClient

function request() {
  return {} as Request
}

function roleQuery(role: string) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role }, error: null }),
  }
}

describe('GET /api/admin/invoices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockSupabase.from.mockReturnValue(roleQuery('admin'))
    mockAdminClient.storage.from.mockReturnValue({
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: jest.fn((path: string) => ({ data: { publicUrl: `https://files.example/${path}` } })),
    })
  })

  it('rejects unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })
    const response = await GET(request())
    expect(response.status).toBe(401)
    expect(mockAdminClient.from).not.toHaveBeenCalled()
  })

  it('rejects non-admin users', async () => {
    mockSupabase.from.mockReturnValueOnce(roleQuery('agent'))
    const response = await GET(request())
    expect(response.status).toBe(403)
    expect(mockAdminClient.from).not.toHaveBeenCalled()
  })

  it('returns enriched invoices', async () => {
    const invoice = {
      id: 'invoice-1',
      user_id: 'user-1',
      ref_no: 'REF/1',
      invoice_pdf_path: 'REF-1/invoice.pdf',
    }
    mockAdminClient.from
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [invoice], error: null }),
      }))
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [{ user_id: 'user-1', full_name: 'Invoice User' }], error: null }),
      }))
    mockAdminClient.storage.from.mockReturnValue({
      list: jest.fn().mockResolvedValue({ data: [{ name: 'lease.pdf' }], error: null }),
      getPublicUrl: jest.fn((path: string) => ({ data: { publicUrl: `https://files.example/${path}` } })),
    })

    const response = await GET(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      invoices: [{
        ...invoice,
        requester_name: 'Invoice User',
        lease_agreement_url: 'https://files.example/REF_1/lease_agreement/lease.pdf',
        invoice_pdf_url: 'https://files.example/REF-1/invoice.pdf',
      }],
    })
  })

  it('returns a safe error when invoice retrieval fails', async () => {
    mockAdminClient.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('database failure') }),
    }))

    const response = await GET(request())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to fetch invoices' })
  })
})
