jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number } = {}) => ({
      status: init.status ?? 200,
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

import { POST } from '@/app/api/add-user-credits/route'

const mockAuthClient = jest.requireMock('@/lib/supabase/server').__mockAuthClient
const mockServiceClient = jest.requireMock('@supabase/supabase-js').__mockServiceClient

function request(body: unknown) {
  return { json: async () => body } as Request
}

function adminProfile(role = 'admin', status = 'approved') {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role, status }, error: null }),
  }
}

describe('POST /api/add-user-credits', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockAuthClient.from.mockReturnValue(adminProfile())
  })

  it('rejects unauthenticated requests before using service role access', async () => {
    mockAuthClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } })

    const response = await POST(request({ userId: 'user-1', credits: 10 }))

    expect(response.status).toBe(401)
    expect(mockServiceClient.from).not.toHaveBeenCalled()
  })

  it('rejects non-admin users', async () => {
    mockAuthClient.from.mockReturnValueOnce(adminProfile('agent'))

    const response = await POST(request({ userId: 'user-1', credits: 10 }))

    expect(response.status).toBe(403)
    expect(mockServiceClient.from).not.toHaveBeenCalled()
  })

  it('rejects missing and invalid credit amounts', async () => {
    expect((await POST(request({ userId: 'user-1' }))).status).toBe(400)
    expect((await POST(request({ userId: 'user-1', credits: -5 }))).status).toBe(400)
    expect((await POST(request({ userId: 'user-1', credits: 'not-a-number' }))).status).toBe(400)
    expect(mockServiceClient.from).not.toHaveBeenCalled()
  })

  it('writes the ledger, increments credits, and returns the new balance', async () => {
    const ledger = {
      insert: jest.fn().mockResolvedValue({ data: [{ id: 'ledger-1' }], error: null }),
    }
    const balance = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { credits: 110 }, error: null }),
    }
    mockServiceClient.from
      .mockImplementationOnce(() => ledger)
      .mockImplementationOnce(() => balance)
    mockServiceClient.rpc.mockResolvedValue({ data: null, error: null })

    const response = await POST(request({ userId: 'user-1', credits: '10' }))

    expect(response.status).toBe(200)
    expect(mockServiceClient.rpc).toHaveBeenCalledWith('increment_credits', {
      p_user_id: 'user-1',
      p_delta: 10,
    })
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Credits added successfully',
      newBalance: 110,
    })
  })
})
