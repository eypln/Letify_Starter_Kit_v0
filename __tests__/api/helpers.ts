/**
 * API Route Test Utilities
 * 
 * Helper functions for testing Next.js API routes
 */

/**
 * Create a mock NextRequest for testing
 * 
 * Note: For Next.js 15, we create a simplified mock instead of using actual NextRequest
 * which requires edge runtime environment
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  } = {}
) {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options

  // Build URL with search params
  const urlObj = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  // Return a mock request object that matches NextRequest interface
  return {
    url: urlObj.toString(),
    method,
    headers: new Map(Object.entries(headers)),
    body: body ? JSON.stringify(body) : undefined,
    json: async () => body,
    text: async () => (body ? JSON.stringify(body) : ''),
    searchParams: urlObj.searchParams,
  }
}

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          },
        },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: '1', name: 'Test' },
        error: null,
      }),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: '1', name: 'Test' },
        error: null,
      }),
      then: jest.fn((callback) =>
        callback({ data: [{ id: '1', name: 'Test' }], error: null })
      ),
    })),
  }
}

/**
 * Mock authenticated user session
 */
export const mockAuthenticatedSession = {
  data: {
    session: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00.000Z',
        app_metadata: {},
        user_metadata: {},
      },
    },
  },
  error: null,
}

/**
 * Mock unauthenticated session
 */
export const mockUnauthenticatedSession = {
  data: { session: null },
  error: null,
}

/**
 * Extract JSON from Response
 */
export async function getResponseJSON(response: Response) {
  const text = await response.text()
  return text ? JSON.parse(text) : null
}
