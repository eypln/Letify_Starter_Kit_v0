'use client'

import { Suspense } from 'react'
import AuthCallbackContent from '@/app/auth/callback/AuthCallbackContent'

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
