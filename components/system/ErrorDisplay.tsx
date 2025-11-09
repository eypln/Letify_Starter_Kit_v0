'use client';

import React, { useState, ReactNode } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorDisplayProps {
  error: Error | null;
  onDismiss?: () => void;
  variant?: 'inline' | 'toast' | 'modal';
}

/**
 * Client-side error display component
 * Shows errors in different formats based on variant
 */
export function ErrorDisplay({ error, onDismiss, variant = 'inline' }: ErrorDisplayProps) {
  if (!error) return null;

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Error</h3>
              <p className="text-sm text-gray-600 mb-4">{error.message}</p>
              <button
                onClick={onDismiss}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div className="fixed bottom-4 right-4 bg-red-600 text-white rounded-lg shadow-lg p-4 max-w-sm flex items-start gap-3 z-50 animate-in slide-in-from-bottom-5">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">{error.message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-white hover:text-red-200 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Default: inline
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-red-900">{error.message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-900 hover:text-red-600 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Hook for managing error state in components
 */
export function useError() {
  const [error, setError] = useState<Error | null>(null);

  const showError = (message: string) => {
    setError(new Error(message));
  };

  const dismissError = () => {
    setError(null);
  };

  return { error, showError, dismissError };
}

/**
 * Wrapper component for handling async operations with error display
 */
interface AsyncOperationProps {
  children: (state: {
    isLoading: boolean;
    error: Error | null;
    execute: (fn: () => Promise<void>) => Promise<void>;
    dismiss: () => void;
  }) => ReactNode;
}

export function AsyncOperation({ children }: AsyncOperationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { error, showError, dismissError } = useError();

  const execute = async (fn: () => Promise<void>) => {
    setIsLoading(true);
    dismissError();
    try {
      await fn();
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : 'An error occurred during the operation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return <>{children({ isLoading, error, execute, dismiss: dismissError })}</>;
}
