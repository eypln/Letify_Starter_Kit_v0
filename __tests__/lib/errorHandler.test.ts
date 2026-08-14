import { handleApiError } from '@/lib/errorHandler'

describe('API error handling', () => {
  it.each([
    ['Unauthorized', 'UNAUTHORIZED', 401],
    ['Forbidden', 'FORBIDDEN', 403],
    ['Not Found', 'NOT_FOUND', 404],
    ['Validation failed', 'VALIDATION_ERROR', 400],
  ])('maps %s errors to a safe response', (message, code, status) => {
    const result = handleApiError(new Error(message))

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(code)
      expect(result.error.status).toBe(status)
    }
  })

  it('maps unknown errors to a generic response', () => {
    const result = handleApiError({ reason: 'failure' })

    expect(result).toEqual({
      success: false,
      error: {
        message: 'An unknown error occurred',
        code: 'UNKNOWN_ERROR',
        status: 500,
      },
    })
  })

})
