/**
 * API Client Utility
 * 
 * Centralized API client with rate limit error handling and retry logic.
 * Use this for all API calls to ensure consistent error handling.
 * 
 * @version 2.5.0
 */

import { toast } from 'sonner';

export interface APIError extends Error {
  status?: number;
  retryAfter?: number;
}

/**
 * Enhanced fetch with rate limit handling
 */
export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);

    // Rate limit error (429)
    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      
      toast.error(
        data.error || 'İstek limiti aşıldı. Lütfen biraz bekleyin.',
        {
          description: `${retryAfter} saniye sonra tekrar deneyin.`,
          duration: 5000,
        }
      );

      const error = new Error(data.error || 'Rate limit exceeded') as APIError;
      error.status = 429;
      error.retryAfter = retryAfter;
      throw error;
    }

    // Other HTTP errors
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(data.error || `HTTP ${response.status}`) as APIError;
      error.status = response.status;
      throw error;
    }

    // Success - parse JSON
    return await response.json();
  } catch (error) {
    // Network errors or other issues
    if (error instanceof Error && !(error as APIError).status) {
      toast.error('Bağlantı hatası', {
        description: 'Lütfen internet bağlantınızı kontrol edin.',
      });
    }
    throw error;
  }
}

/**
 * API client with rate limit retry logic
 * 
 * Automatically retries rate-limited requests after the specified delay.
 */
export async function apiFetchWithRetry<T = any>(
  url: string,
  options?: RequestInit,
  maxRetries: number = 1
): Promise<T> {
  let lastError: APIError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiFetch<T>(url, options);
    } catch (error) {
      lastError = error as APIError;

      // Only retry on rate limit errors
      if (lastError.status === 429 && attempt < maxRetries) {
        const retryAfter = (lastError.retryAfter || 60) * 1000;
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        continue;
      }

      // Don't retry other errors
      throw error;
    }
  }

  throw lastError;
}

/**
 * Helper function to check if error is a rate limit error
 */
export function isRateLimitError(error: any): error is APIError {
  return error instanceof Error && (error as APIError).status === 429;
}

/**
 * Helper function to get retry delay from error
 */
export function getRetryDelay(error: any): number {
  if (isRateLimitError(error)) {
    return (error.retryAfter || 60) * 1000;
  }
  return 0;
}
