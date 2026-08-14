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
  const adminClient = {
    from: jest.fn(),
    auth: { admin: { getUserById: jest.fn() } },
  }
  return {
    createClient: jest.fn().mockResolvedValue(supabase),
    createAdminClient: jest.fn().mockReturnValue(adminClient),
    __mockSupabase: supabase,
    __mockAdminClient: adminClient,
  }
})

import { GET } from '@/app/api/admin/pending-users/route'

const mockSupabase = jest.requireMock('@/lib/supabase/server').__mockSupabase
const mockAdminClient = jest.requireMock('@/lib/supabase/server').__mockAdminClient

function query(data: unknown, error: unknown = null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
    single: jest.fn().mockResolvedValue({ data, error }),
    upsert: jest.fn().mockResolvedValue({ error }),
  }
}

function request() {
  return {} as Request
}

describe('GET /api/admin/pending-users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockSupabase.from.mockReturnValue(query({ role: 'admin' }))
  })

  it('rejects unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })
    const response = await GET(request())
    expect(response.status).toBe(401)
    expect(mockAdminClient.from).not.toHaveBeenCalled()
  })

  it('rejects non-admin users', async () => {
    mockSupabase.from.mockReturnValueOnce(query({ role: 'agent' }))
    const response = await GET(request())
    expect(response.status).toBe(403)
    expect(mockAdminClient.from).not.toHaveBeenCalled()
  })

  it('returns pending users with profile and auth details', async () => {
    mockAdminClient.from
      .mockImplementationOnce(() => query([{ user_id: 'user-1', status: 'pending', created_at: '2026-01-01' }]))
      .mockImplementationOnce(() => query([]))
      .mockImplementationOnce(() => query({ full_name: 'Pending User', phone: '123', role: 'agent' }))
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email: 'pending@example.com' } },
      error: null,
    })

    const response = await GET(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      users: [{
        user_id: 'user-1',
        full_name: 'Pending User',
        phone: '123',
        role: 'agent',
        created_at: '2026-01-01',
        email: 'pending@example.com',
      }],
    })
  })

  it('returns 500 when the approval queue query fails', async () => {
    mockAdminClient.from.mockImplementationOnce(() => query(null, new Error('database failure')))

    const response = await GET(request())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'database failure' })
  })
})
