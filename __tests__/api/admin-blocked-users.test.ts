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

import { GET } from '@/app/api/admin/blocked-users/route'

const mockSupabase = jest.requireMock('@/lib/supabase/server').__mockSupabase
const mockAdminClient = jest.requireMock('@/lib/supabase/server').__mockAdminClient

function request() {
  return {} as Request
}

function profileQuery(role: string) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role }, error: null }),
  }
}

describe('GET /api/admin/blocked-users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockSupabase.from.mockReturnValue(profileQuery('admin'))
  })

  it('rejects unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })
    const response = await GET(request())
    expect(response.status).toBe(401)
    expect(mockAdminClient.from).not.toHaveBeenCalled()
  })

  it('rejects non-admin users', async () => {
    mockSupabase.from.mockReturnValueOnce(profileQuery('agent'))
    const response = await GET(request())
    expect(response.status).toBe(403)
    expect(mockAdminClient.from).not.toHaveBeenCalled()
  })

  it('returns blocked users with auth emails', async () => {
    mockAdminClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [{ user_id: 'user-1', full_name: 'Blocked User', role: 'agent', status: 'blocked' }],
        error: null,
      }),
    })
    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email: 'blocked@example.com' } },
    })

    const response = await GET(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      users: [{
        user_id: 'user-1',
        full_name: 'Blocked User',
        role: 'agent',
        status: 'blocked',
        email: 'blocked@example.com',
      }],
      count: 1,
    })
  })

  it('returns 500 when the blocked-user query fails', async () => {
    mockAdminClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('database failure') }),
    })

    const response = await GET(request())
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' })
  })
})
