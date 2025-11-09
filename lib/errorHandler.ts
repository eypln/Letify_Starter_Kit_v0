/**
 * Error handling middleware for API routes
 * Provides consistent error response format and logging
 */

export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
    status: number;
    details?: Record<string, any>;
  };
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): ApiError {
  console.error('API Error:', error);

  if (error instanceof Error) {
    // Specific error types
    if (error.message.includes('Unauthorized')) {
      return {
        success: false,
        error: {
          message: 'Authorization required',
          code: 'UNAUTHORIZED',
          status: 401,
        },
      };
    }

    if (error.message.includes('Forbidden')) {
      return {
        success: false,
        error: {
          message: 'You do not have permission to perform this action',
          code: 'FORBIDDEN',
          status: 403,
        },
      };
    }

    if (error.message.includes('Not Found')) {
      return {
        success: false,
        error: {
          message: 'The requested resource was not found',
          code: 'NOT_FOUND',
          status: 404,
        },
      };
    }

    if (error.message.includes('Validation')) {
      return {
        success: false,
        error: {
          message: 'Input validation failed',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: { originalError: error.message },
        },
      };
    }

    // Generic error
    return {
      success: false,
      error: {
        message: error.message || 'An error occurred during processing',
        code: 'INTERNAL_ERROR',
        status: 500,
      },
    };
  }

  // Unknown error type
  return {
    success: false,
    error: {
      message: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
      status: 500,
    },
  };
}

/**
 * Wrap API handlers with error handling
 */
export function withErrorHandler(
  handler: (req: Request, context?: any) => Promise<Response>
) {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      const apiError = handleApiError(error);
      return Response.json(apiError, { status: apiError.error.status });
    }
  };
}

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T>(
  req: Request,
  schema: (data: any) => T
): Promise<T> {
  try {
    const body = await req.json();
    return schema(body);
  } catch (error) {
    throw new Error(`Validation: ${error instanceof Error ? error.message : 'Invalid request body'}`);
  }
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

/**
 * Create error response
 */
export function createErrorResponse(
  message: string,
  status = 500,
  code?: string
): Response {
  const response: ApiError = {
    success: false,
    error: {
      message,
      code,
      status,
    },
  };
  return Response.json(response, { status });
}
