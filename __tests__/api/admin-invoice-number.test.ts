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
  const adminClient = { rpc: jest.fn() }
  return {
    createClient: jest.fn().mockResolvedValue(supabase),
    createAdminClient: jest.fn().mockReturnValue(adminClient),
    __mockSupabase: supabase,
    __mockAdminClient: adminClient,
  }
})

import { POST } from '@/app/api/admin/invoices/number/route'

const mockSupabase = jest.requireMock('@/lib/supabase/server').__mockSupabase
const mockAdminClient = jest.requireMock('@/lib/supabase/server').__mockAdminClient

function request(body: unknown) {
  return { json: async () => body } as Request
}

function roleQuery(role: string) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role }, error: null }),
  }
}

describe('POST /api/admin/invoices/number', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockSupabase.from.mockReturnValue(roleQuery('admin'))
  })

  it('rejects unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })
    const response = await POST(request({ revenueId: 'revenue-1' }))
    expect(response.status).toBe(401)
    expect(mockAdminClient.rpc).not.toHaveBeenCalled()
  })

  it('rejects non-admin users and missing revenue IDs', async () => {
    mockSupabase.from.mockReturnValueOnce(roleQuery('agent'))
    expect((await POST(request({ revenueId: 'revenue-1' }))).status).toBe(403)

    expect((await POST(request({}))).status).toBe(400)
    expect(mockAdminClient.rpc).not.toHaveBeenCalled()
  })

  it('returns the generated invoice number', async () => {
    mockAdminClient.rpc.mockResolvedValue({ data: 20260001, error: null })

    const response = await POST(request({ revenueId: 'revenue-1' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ invoiceNumber: '20260001' })
    expect(mockAdminClient.rpc).toHaveBeenCalledWith('next_revenue_invoice_number')
  })

  it('returns a migration error when invoice generation is unavailable', async () => {
    mockAdminClient.rpc.mockResolvedValue({ data: null, error: new Error('missing function') })

    const response = await POST(request({ revenueId: 'revenue-1' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Could not generate invoice number. Apply the invoice migration first.',
    })
  })
})
