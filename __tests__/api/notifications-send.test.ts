jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number } = {}) => ({
      status: init.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('web-push', () => {
  const webpush = {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  }
  return { ...webpush, __mockWebpush: webpush }
})

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
  RateLimitPresets: { STRICT: 'strict' },
}))

jest.mock('@/lib/supabase/server', () => {
  const supabase = { auth: { getUser: jest.fn() }, from: jest.fn() }
  return {
    createClient: jest.fn().mockResolvedValue(supabase),
    __mockSupabase: supabase,
  }
})

import { POST } from '@/app/api/notifications/send/route'

const mockSupabase = jest.requireMock('@/lib/supabase/server').__mockSupabase
const mockWebpush = jest.requireMock('web-push').__mockWebpush

function request(body: unknown) {
  return { json: async () => body } as Request
}

function profile(role = 'agent', status = 'approved') {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role, status }, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: { role, status }, error: null }),
  }
}

describe('POST /api/notifications/send', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.from.mockReset()
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-key'
    process.env.VAPID_PRIVATE_KEY = 'private-key'
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockSupabase.from.mockReturnValue(profile())
    mockWebpush.sendNotification.mockResolvedValue(undefined)
  })

  it('rejects unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })

    const response = await POST(request({ title: 'Hello', body: 'World', userId: 'user-1' }))

    expect(response.status).toBe(401)
  })

  it('prevents non-admin broadcast and cross-user targeting', async () => {
    const broadcast = await POST(request({ title: 'Hello', body: 'World' }))
    expect(broadcast.status).toBe(400)

    const otherUser = await POST(request({ title: 'Hello', body: 'World', userId: 'user-2' }))
    expect(otherUser.status).toBe(403)
  })

  it('allows a normal user to target a team leader', async () => {
    mockSupabase.from
      .mockImplementationOnce(() => profile('agent'))
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'agent', status: 'approved' }, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { role: 'teamleader', status: 'approved' },
          error: null,
        }),
      }))

    const response = await POST(request({
      title: '',
      body: 'Collaboration deal submitted',
      userId: 'teamleader-1',
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Title and body are required' })
  })

  it.each(['admin', 'manager', 'teamleader', 'boss'])(
    'allows %s to pass broadcast authorization',
    async (role) => {
      mockSupabase.from.mockImplementationOnce(() => profile(role))

      const response = await POST(request({ title: '', body: 'Scheduled update' }))

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: 'Title and body are required' })
    }
  )

  it('allows a normal user to target a manager', async () => {
    mockSupabase.from
      .mockImplementationOnce(() => profile('agent'))
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'agent', status: 'approved' }, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { role: 'manager', status: 'approved' },
          error: null,
        }),
      }))

    const response = await POST(request({
      title: '',
      body: 'Payment completed',
      userId: 'manager-1',
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Title and body are required' })
  })

  it('sends to active subscriptions and counts successful deliveries', async () => {
    mockSupabase.from
      .mockImplementationOnce(() => profile('agent'))
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'agent', status: 'approved' }, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { role: 'teamleader', status: 'approved' },
          error: null,
        }),
      }))
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ endpoint: 'https://push.example/1', keys: { p256dh: 'p256', auth: 'auth' } }],
          error: null,
        }),
      }))

    const response = await POST(request({
      title: 'Deal update',
      body: 'Payment completed',
      userId: 'teamleader-1',
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      message: 'Notifications sent',
      total: 1,
      sent: 1,
      failed: 0,
    })
    expect(mockWebpush.sendNotification).toHaveBeenCalledTimes(1)
  })

  it('removes expired subscriptions and reports failed delivery', async () => {
    mockWebpush.sendNotification.mockRejectedValueOnce({ statusCode: 410, message: 'expired' })
    mockSupabase.from
      .mockImplementationOnce(() => profile('agent'))
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'agent', status: 'approved' }, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'boss', status: 'approved' }, error: null }),
      }))
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'sub-1', endpoint: 'https://push.example/expired', keys: { p256dh: 'p256', auth: 'auth' } }],
          error: null,
        }),
        delete: jest.fn().mockReturnThis(),
      }))
      .mockImplementationOnce(() => ({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      }))

    const response = await POST(request({ title: 'Deal update', body: 'Expired test', userId: 'boss-1' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      message: 'Notifications sent',
      total: 1,
      sent: 0,
      failed: 1,
    })
  })
})
