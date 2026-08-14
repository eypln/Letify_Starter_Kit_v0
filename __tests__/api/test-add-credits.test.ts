jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) => ({
      status: init.status ?? 200,
      headers: new Map(Object.entries(init.headers ?? {})),
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/supabase/server', () => {
  const authClient = { auth: { getUser: jest.fn() }, from: jest.fn() }
  return {
    createClient: jest.fn().mockResolvedValue(authClient),
    __mockAuthClient: authClient,
  }
})

jest.mock('@supabase/supabase-js', () => {
  const serviceClient = { from: jest.fn(), rpc: jest.fn() }
  return {
    createClient: jest.fn().mockReturnValue(serviceClient),
    __mockServiceClient: serviceClient,
  }
})

import { GET, POST } from '@/app/api/test-add-credits/route'

const mockAuthClient = jest.requireMock('@/lib/supabase/server').__mockAuthClient
const mockServiceClient = jest.requireMock('@supabase/supabase-js').__mockServiceClient

function request(url: string) {
  return { url } as Request
}

function profile(role = 'admin', status = 'approved') {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role, status }, error: null }),
  }
}

describe('test-add-credits endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockAuthClient.from.mockReturnValue(profile())
  })

  it('rejects GET state mutations', async () => {
    const response = await GET()
    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST')
  })

  it('rejects unauthenticated and non-admin POST requests', async () => {
    mockAuthClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect((await POST(request('http://localhost/api/test-add-credits?userId=user-1&credits=10'))).status).toBe(401)

    mockAuthClient.from.mockReturnValueOnce(profile('agent'))
    expect((await POST(request('http://localhost/api/test-add-credits?userId=user-1&credits=10'))).status).toBe(403)
    expect(mockServiceClient.from).not.toHaveBeenCalled()
  })

  it('rejects missing, non-numeric, and partial credit values', async () => {
    expect((await POST(request('http://localhost/api/test-add-credits'))).status).toBe(400)
    expect((await POST(request('http://localhost/api/test-add-credits?userId=user-1&credits=10abc'))).status).toBe(400)
    expect((await POST(request('http://localhost/api/test-add-credits?userId=user-1&credits=-1'))).status).toBe(400)
  })

  it('performs a valid test credit mutation', async () => {
    const payment = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [{ id: 'payment-1' }], error: null }),
    }
    const ledger = {
      insert: jest.fn().mockResolvedValue({ data: [{ id: 'ledger-1' }], error: null }),
    }
    mockServiceClient.from
      .mockImplementationOnce(() => payment)
      .mockImplementationOnce(() => ledger)
    mockServiceClient.rpc.mockResolvedValue({ data: null, error: null })

    const response = await POST(request('http://localhost/api/test-add-credits?userId=user-1&credits=10'))

    expect(response.status).toBe(200)
    expect(mockServiceClient.rpc).toHaveBeenCalledWith('increment_credits', {
      p_user_id: 'user-1',
      p_delta: 10,
    })
  })

  it('returns a safe error when the billing mutation fails', async () => {
    mockServiceClient.from.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: null, error: new Error('database details') }),
    })

    const response = await POST(request('http://localhost/api/test-add-credits?userId=user-1&credits=10'))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Failed to add credits' })
  })
})
