'use client'

import { ToastProvider } from '@/components/ui/use-toast'
import Toaster from '@/components/ui/toaster'

export default function ToastRoot({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <Toaster />
    </ToastProvider>
  )
}