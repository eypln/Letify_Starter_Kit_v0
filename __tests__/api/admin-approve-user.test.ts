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
  const supabase = {
    auth: { getUser: jest.fn() },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      }),
    })),
  }
  const adminSupabase = {
    from: jest.fn(),
    auth: { admin: { getUserById: jest.fn() } },
  }
  return {
    createClient: jest.fn().mockResolvedValue(supabase),
    createAdminClient: jest.fn().mockReturnValue(adminSupabase),
    __mockSupabase: supabase,
    __mockAdminSupabase: adminSupabase,
  }
})

jest.mock('@/lib/activity', () => ({ logActivity: jest.fn() }))
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
  generateUserApprovalEmail: jest.fn(),
}))

import { PUT } from '@/app/api/admin/approve-user/route'

const mockSupabase = jest.requireMock('@/lib/supabase/server').__mockSupabase
const mockAdminSupabase = jest.requireMock('@/lib/supabase/server').__mockAdminSupabase
const mockSendEmail = jest.requireMock('@/lib/email').sendEmail
const mockGenerateApprovalEmail = jest.requireMock('@/lib/email').generateUserApprovalEmail

function request(body: unknown) {
  return { json: async () => body } as Request
}

describe('PUT /api/admin/approve-user', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
    })
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      }),
    }))
    mockSendEmail.mockResolvedValue({ success: true })
    mockGenerateApprovalEmail.mockReturnValue('<p>approved</p>')
  })

  it('rejects unauthenticated administrators', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })

    const response = await PUT(request({ userId: 'user-1', action: 'approve' }))

    expect(response.status).toBe(401)
    expect(mockAdminSupabase.from).not.toHaveBeenCalled()
  })

  it('rejects authenticated users without the admin role', async () => {
    mockSupabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { role: 'agent' },
        error: null,
      }),
    }))

    const response = await PUT(request({ userId: 'user-1', action: 'approve' }))

    expect(response.status).toBe(403)
    expect(mockAdminSupabase.from).not.toHaveBeenCalled()
  })

  it('rejects requests with missing or invalid action data', async () => {
    const missing = await PUT(request({ userId: 'user-1' }))
    expect(missing.status).toBe(400)

    const invalid = await PUT(request({ userId: 'user-1', action: 'delete' }))
    expect(invalid.status).toBe(400)
    expect(mockAdminSupabase.from).not.toHaveBeenCalled()
  })

  it('returns not found when the target user profile does not exist', async () => {
    mockAdminSupabase.from.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }))

    const response = await PUT(request({ userId: 'missing-user', action: 'approve' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'User profile not found' })
  })

  it('approves a user through the service-role client', async () => {
    const profileQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { full_name: 'Test User', user_id: 'user-1' },
        error: null,
      }),
    }
    const profileUpdate = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { user_id: 'user-1', status: 'approved' },
        error: null,
      }),
    }
    const queueUpdate = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    mockAdminSupabase.from
      .mockImplementationOnce(() => profileQuery)
      .mockImplementationOnce(() => profileUpdate)
      .mockImplementationOnce(() => queueUpdate)
    mockAdminSupabase.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email: 'user@example.com' } },
      error: null,
    })

    const response = await PUT(request({ userId: 'user-1', action: 'approve' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'User approved successfully',
    })
    expect(mockAdminSupabase.from).toHaveBeenCalledTimes(3)
  })
})
