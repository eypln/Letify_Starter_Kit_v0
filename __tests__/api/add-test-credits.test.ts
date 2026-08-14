jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number } = {}) => ({
      status: init.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/supabase/server', () => {
  const supabase = { auth: { getUser: jest.fn() }, from: jest.fn() }
  return {
    createClient: jest.fn().mockResolvedValue(supabase),
    __mockSupabase: supabase,
  }
})

jest.mock('@/lib/billing', () => ({
  addCredits: jest.fn(),
}))

import { POST } from '@/app/api/add-test-credits/route'

const mockSupabase = jest.requireMock('@/lib/supabase/server').__mockSupabase
const mockAddCredits = jest.requireMock('@/lib/billing').addCredits

function request(body: unknown) {
  return { json: async () => body } as Request
}

function profile(role = 'admin', status = 'approved') {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role, status }, error: null }),
  }
}

describe('POST /api/add-test-credits', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockSupabase.from.mockReturnValue(profile())
    mockAddCredits.mockResolvedValue({ success: true, data: { id: 'credit-1' } })
  })

  it('rejects unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })
    const response = await POST(request({ userId: 'user-1', credits: 10 }))
    expect(response.status).toBe(401)
    expect(mockAddCredits).not.toHaveBeenCalled()
  })

  it('rejects non-admin users and invalid amounts', async () => {
    mockSupabase.from.mockReturnValueOnce(profile('agent'))
    expect((await POST(request({ userId: 'user-1', credits: 10 }))).status).toBe(403)

    expect((await POST(request({ userId: 'user-1', credits: -1 }))).status).toBe(400)
    expect((await POST(request({ userId: 'user-1', credits: 'invalid' }))).status).toBe(400)
    expect(mockAddCredits).not.toHaveBeenCalled()
  })

  it('dispatches a valid test credit mutation', async () => {
    const response = await POST(request({ userId: 'user-1', credits: '15' }))

    expect(response.status).toBe(200)
    expect(mockAddCredits).toHaveBeenCalledWith('user-1', 15, expect.objectContaining({
      reason: 'test_add',
      invoice_id: undefined,
    }))
  })

  it('returns a safe error when billing fails', async () => {
    mockAddCredits.mockResolvedValueOnce({ success: false, error: new Error('database details') })

    const response = await POST(request({ userId: 'user-1', credits: 10 }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to add credits' })
  })
})
